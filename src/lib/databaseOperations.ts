/**
 * Database Operations with Backup & Rollback Support
 * Handles transactional operations on student data
 */

import { requireSupabase } from "@/lib/supabaseClient";
import type { ScanningTransaction, BackupSnapshot } from "@/types/scanning.types";
import type { Student, Identitas, NilaiSiswa } from "@/types/student.types";

const SCANNING_TRANSACTIONS_TABLE = "scanning_transactions";
const BACKUP_SNAPSHOTS_TABLE = "backup_snapshots";
const SCANNING_LOGS_TABLE = "scanning_logs";

/**
 * Create scanning transaction record
 */
export async function createScanningTransaction(
  transaction: Omit<ScanningTransaction, "id">,
): Promise<ScanningTransaction> {
  const sb = requireSupabase();
  const id = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const record = {
    id,
    ...transaction,
    timestamp: new Date().toISOString(),
  };

  const { error } = await sb.from(SCANNING_TRANSACTIONS_TABLE).insert([record]);

  if (error) {
    console.error("Error creating scanning transaction:", error);
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  return record as ScanningTransaction;
}

/**
 * Create backup snapshot of student data before applying changes
 */
export async function createBackupSnapshot(
  studentId: string,
  studentData: Student,
  transactionId: string,
): Promise<BackupSnapshot> {
  const sb = requireSupabase();

  const snapshot: BackupSnapshot = {
    id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    studentId,
    data: JSON.parse(JSON.stringify(studentData)), // Deep copy
    transactionId,
  };

  const { error } = await sb.from(BACKUP_SNAPSHOTS_TABLE).insert([snapshot]);

  if (error) {
    console.error("Error creating backup snapshot:", error);
    throw new Error(`Failed to create backup: ${error.message}`);
  }

  return snapshot;
}

/**
 * Apply OCR extracted data to student record with backup
 */
export async function applyOcrDataToStudent(
  studentId: string,
  extractedData: Record<string, any>,
  transactionId: string,
  currentStudent: Student,
): Promise<{ success: boolean; transactionId: string; appliedChanges: any }> {
  const sb = requireSupabase();

  try {
    // Create backup before applying changes
    const backup = await createBackupSnapshot(currentStudent, currentStudent, transactionId);

    // Prepare updates
    const updates: Partial<Student> = {};

    // Update identitas if present
    if (
      extractedData.nisn ||
      extractedData.nama ||
      extractedData.jenisKelamin ||
      extractedData.tempatLahir ||
      extractedData.tanggalLahir
    ) {
      updates.identitas = {
        ...currentStudent.identitas,
        ...(extractedData.nisn && { nisn: extractedData.nisn }),
        ...(extractedData.nama && { nama: extractedData.nama }),
        ...(extractedData.jenisKelamin && { jenisKelamin: extractedData.jenisKelamin }),
        ...(extractedData.tempatLahir && { tempatLahir: extractedData.tempatLahir }),
        ...(extractedData.tanggalLahir && { tanggalLahir: extractedData.tanggalLahir }),
        ...(extractedData.namaAyah && { namaAyah: extractedData.namaAyah }),
        ...(extractedData.namaIbu && { namaIbu: extractedData.namaIbu }),
      };
    }

    // Update nilai from extracted values
    if (extractedData.values && Object.keys(extractedData.values).length > 0) {
      updates.nilai = updateNilaiFromExtractedData(
        currentStudent.nilai,
        extractedData.values,
        extractedData.semester,
      );
    }

    updates.updatedAt = new Date().toISOString();

    // Apply to database
    const { error } = await sb.from("students").update(updates).eq("id", studentId);

    if (error) {
      // Rollback on error
      await rollbackTransaction(transactionId, backup.id);
      throw new Error(`Failed to apply OCR data: ${error.message}`);
    }

    // Log the transaction
    await logScanningTransaction({
      transactionId,
      studentId,
      status: "completed",
      appliedChanges: {
        before: currentStudent,
        after: { ...currentStudent, ...updates },
      },
      backupId: backup.id,
    });

    return {
      success: true,
      transactionId,
      appliedChanges: updates,
    };
  } catch (error) {
    console.error("Error applying OCR data:", error);
    throw error;
  }
}

/**
 * Update nilai structure with extracted data
 */
function updateNilaiFromExtractedData(
  currentNilai: NilaiSiswa,
  extractedValues: Record<string, number>,
  semester: number,
): NilaiSiswa {
  const updated = JSON.parse(JSON.stringify(currentNilai)) as NilaiSiswa;

  // Map extracted values to appropriate fields based on semester
  Object.entries(extractedValues).forEach(([subject, value]) => {
    // This depends on your specific mapping logic
    // Adjust based on your Nilai structure
    if (!updated.ujianTertulis) {
      updated.ujianTertulis = {};
    }

    if (typeof updated.ujianTertulis === "object") {
      (updated.ujianTertulis as any)[subject] = value;
    }
  });

  return updated;
}

/**
 * Rollback transaction to previous state
 */
export async function rollbackTransaction(transactionId: string, backupId: string): Promise<void> {
  const sb = requireSupabase();

  try {
    // Get backup data
    const { data: backup, error: fetchError } = await sb
      .from(BACKUP_SNAPSHOTS_TABLE)
      .select("*")
      .eq("id", backupId)
      .single();

    if (fetchError || !backup) {
      throw new Error(`Backup not found: ${fetchError?.message}`);
    }

    // Restore student data
    const { error: updateError } = await sb
      .from("students")
      .update(backup.data)
      .eq("id", backup.studentId);

    if (updateError) {
      throw new Error(`Failed to restore from backup: ${updateError.message}`);
    }

    // Update transaction status
    await sb.from(SCANNING_TRANSACTIONS_TABLE).update({ status: "rolled-back" }).eq("id", transactionId);

    // Log the rollback
    await logScanningTransaction({
      transactionId,
      studentId: backup.studentId,
      status: "rolled-back",
      backupId,
    });
  } catch (error) {
    console.error("Error rolling back transaction:", error);
    throw error;
  }
}

/**
 * Log scanning transaction
 */
export async function logScanningTransaction(data: any): Promise<void> {
  const sb = requireSupabase();

  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...data,
  };

  const { error } = await sb.from(SCANNING_LOGS_TABLE).insert([logEntry]);

  if (error) {
    console.error("Error logging transaction:", error);
    // Don't throw - logging failure shouldn't break the main transaction
  }
}

/**
 * Get scanning history for a student
 */
export async function getScanningHistory(studentId: string, limit: number = 20): Promise<ScanningTransaction[]> {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from(SCANNING_TRANSACTIONS_TABLE)
    .select("*")
    .eq("studentId", studentId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching scanning history:", error);
    return [];
  }

  return (data || []) as ScanningTransaction[];
}

/**
 * Get all scanning transactions with filters
 */
export async function getAllScanningTransactions(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<ScanningTransaction[]> {
  const sb = requireSupabase();

  let query = sb.from(SCANNING_TRANSACTIONS_TABLE).select("*");

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.dateFrom) {
    query = query.gte("timestamp", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("timestamp", filters.dateTo);
  }

  const { data, error } = await query
    .order("timestamp", { ascending: false })
    .limit(filters?.limit || 100);

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return (data || []) as ScanningTransaction[];
}
