/**
 * Database Operations with Backup & Rollback Support
 * Handles transactional operations on student data.
 *
 * NOTE: Students are stored in localStorage (Zustand persist), NOT in Supabase.
 * Supabase is only used for auth (madrasah_profiles). The scanning tables
 * (scanning_transactions, backup_snapshots, scanning_logs) may or may not exist;
 * all DB calls here are best-effort — they never throw, so the scanning flow
 * still works even when those tables are absent.
 */

import { getSupabase } from "@/lib/supabaseClient";
import type { ScanningTransaction, BackupSnapshot } from "@/types/scanning.types";
import type { Student, NilaiSiswa } from "@/types/student.types";

const SCANNING_TRANSACTIONS_TABLE = "scanning_transactions";
const BACKUP_SNAPSHOTS_TABLE = "backup_snapshots";
const SCANNING_LOGS_TABLE = "scanning_logs";

/** Generate a unique local ID */
function localId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create scanning transaction record.
 * Always returns a valid transaction object — Supabase insert is best-effort.
 */
export async function createScanningTransaction(
  transaction: Omit<ScanningTransaction, "id" | "timestamp">,
): Promise<ScanningTransaction> {
  const id = localId("scan");
  const record: ScanningTransaction = {
    id,
    ...transaction,
    timestamp: new Date().toISOString(),
  } as ScanningTransaction;

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from(SCANNING_TRANSACTIONS_TABLE).insert([record]);
    } catch {
      // Table may not exist — that's OK, scanning still works locally
    }
  }

  return record;
}

/**
 * Create backup snapshot of student data before applying changes.
 * Best-effort — does not throw.
 */
export async function createBackupSnapshot(
  studentId: string,
  studentData: Student,
  transactionId: string,
): Promise<BackupSnapshot> {
  const snapshot: BackupSnapshot = {
    id: localId("backup"),
    timestamp: new Date().toISOString(),
    studentId,
    data: JSON.parse(JSON.stringify(studentData)) as Student, // Deep copy
    transactionId,
  };

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from(BACKUP_SNAPSHOTS_TABLE).insert([snapshot]);
    } catch {
      // Table may not exist — continue
    }
  }

  return snapshot;
}

/**
 * Prepare and return OCR changes to apply to a student.
 *
 * Students live in localStorage (Zustand). This function does NOT update any
 * Supabase table — it just computes & returns `appliedChanges` so the caller
 * (scanning.tsx) can update the store.
 */
export async function applyOcrDataToStudent(
  studentId: string,
  extractedData: Record<string, unknown>,
  transactionId: string,
  currentStudent: Student,
): Promise<{ success: boolean; transactionId: string; appliedChanges: { identitas?: Partial<Student["identitas"]>; nilai?: Pick<NilaiSiswa, "ujianTertulis"> } }> {
  // Best-effort backup (does not throw)
  await createBackupSnapshot(studentId, currentStudent, transactionId);

  const appliedChanges: {
    identitas?: Partial<Student["identitas"]>;
    nilai?: Pick<NilaiSiswa, "ujianTertulis">;
  } = {};

  // Build identitas patch
  const identitasPatch: Partial<Student["identitas"]> = {};
  if (extractedData.nisn) identitasPatch.nisn = String(extractedData.nisn);
  if (extractedData.nama) identitasPatch.nama = String(extractedData.nama);
  if (extractedData.jenisKelamin === "L" || extractedData.jenisKelamin === "P")
    identitasPatch.jenisKelamin = extractedData.jenisKelamin;
  if (extractedData.tempatLahir) identitasPatch.tempatLahir = String(extractedData.tempatLahir);
  if (extractedData.tanggalLahir) identitasPatch.tanggalLahir = String(extractedData.tanggalLahir);
  if (extractedData.namaAyah) identitasPatch.namaAyah = String(extractedData.namaAyah);
  if (extractedData.namaIbu) identitasPatch.namaIbu = String(extractedData.namaIbu);
  if (Object.keys(identitasPatch).length > 0) appliedChanges.identitas = identitasPatch;

  // Build nilai patch from extracted values
  const values = extractedData.values as Record<string, number> | undefined;
  if (values && Object.keys(values).length > 0) {
    appliedChanges.nilai = {
      ujianTertulis: {
        ...currentStudent.nilai.ujianTertulis,
        ...values,
      } as NilaiSiswa["ujianTertulis"],
    };
  }

  // Best-effort log
  await logScanningTransaction({
    transactionId,
    studentId,
    status: "completed",
    appliedChanges,
  });

  return { success: true, transactionId, appliedChanges };
}

/**
 * Rollback transaction (best-effort — does not throw).
 */
export async function rollbackTransaction(transactionId: string, backupId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { data: backup } = await sb
      .from(BACKUP_SNAPSHOTS_TABLE)
      .select("*")
      .eq("id", backupId)
      .single();

    if (backup) {
      await sb
        .from(SCANNING_TRANSACTIONS_TABLE)
        .update({ status: "rolled-back" })
        .eq("id", transactionId);
    }
  } catch {
    // Ignore — tables may not exist
  }
}

/**
 * Log scanning transaction (best-effort — does not throw).
 */
export async function logScanningTransaction(data: Record<string, unknown>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const logEntry = {
    id: localId("log"),
    timestamp: new Date().toISOString(),
    ...data,
  };

  try {
    await sb.from(SCANNING_LOGS_TABLE).insert([logEntry]);
  } catch {
    // Table may not exist — ignore
  }
}

/**
 * Get scanning history for a student (returns [] on error).
 */
export async function getScanningHistory(
  studentId: string,
  limit = 20,
): Promise<ScanningTransaction[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data } = await sb
      .from(SCANNING_TRANSACTIONS_TABLE)
      .select("*")
      .eq("studentId", studentId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    return (data || []) as ScanningTransaction[];
  } catch {
    return [];
  }
}

/**
 * Get all scanning transactions with filters (returns [] on error).
 */
export async function getAllScanningTransactions(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<ScanningTransaction[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    let query = sb.from(SCANNING_TRANSACTIONS_TABLE).select("*");

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.dateFrom) query = query.gte("timestamp", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("timestamp", filters.dateTo);

    const { data } = await query
      .order("timestamp", { ascending: false })
      .limit(filters?.limit ?? 100);

    return (data || []) as ScanningTransaction[];
  } catch {
    return [];
  }
}
