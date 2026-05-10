/**
 * Excel utilities (SheetJS).
 *
 * - downloadTemplateExcel: workbook kosong yang siap diisi guru.
 * - importFromExcel: parse workbook (template) -> NilaiSiswa.
 * - exportHasilAkhirExcel: workbook lengkap berisi semua tabel + perhitungan.
 *
 * Catatan: SheetJS Community (xlsx) tidak mendukung styling kaya. Kami tetap
 * mengatur lebar kolom, freeze pane, dan format angka. Untuk warna sel,
 * kami menggunakan workbook properties yang didukung (cellStyles via XLSX
 * tidak penuh di build community — diabaikan secara graceful).
 */
import * as XLSX from "xlsx";
import { SUBJECTS, type Subject } from "@/data/subjects";
import type { Identitas, NilaiSiswa, Student } from "@/types/student.types";
import { emptyNilai } from "@/data/sampleData";
import {
  buildHasilAkhir,
  buildHasilUjian,
  jumlahHasilAkhir,
  rataKeseluruhan,
} from "./calculateUtils";
import { clampNilai, formatTTL } from "./formatUtils";

function triggerDownload(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename, { bookType: "xlsx", compression: true });
}

function ensureCell(ws: XLSX.WorkSheet, r: number, c: number): XLSX.CellObject {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr] as XLSX.CellObject | undefined;
  if (cell) return cell;
  const created = { t: "s", v: "" } as XLSX.CellObject;
  ws[addr] = created;
  return created;
}

function setStyle(ws: XLSX.WorkSheet, r: number, c: number, s: unknown) {
  const cell = ensureCell(ws, r, c) as XLSX.CellObject & { s?: unknown };
  cell.s = s;
}

function setNumber(ws: XLSX.WorkSheet, r: number, c: number, v: number | null | undefined) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (v === null || v === undefined || Number.isNaN(v)) {
    ws[addr] = { t: "s", v: "" } as XLSX.CellObject;
    return;
  }
  ws[addr] = { t: "n", v } as XLSX.CellObject;
}

function autoCols(rows: (string | number)[][], min: number[] = []): XLSX.ColInfo[] {
  const widths = [...min];
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      const raw = row[c];
      const s = raw === null || raw === undefined ? "" : String(raw);
      const w = Math.min(60, Math.max(4, s.length + 2));
      widths[c] = Math.max(widths[c] ?? 0, w);
    }
  }
  return widths.map((wch) => ({ wch }));
}

/* ---------------- Template ---------------- */

export function downloadTemplateExcel(filename = "Template-Rekap-Nilai-MI.xlsx") {
  const wb = XLSX.utils.book_new();

  // Identitas
  const identitas = [
    ["Field", "Nilai"],
    ["NISN", "0123456789"],
    ["No Ujian", "06-001-001"],
    ["Nama Lengkap", "Ahmad Fauzan Hakim"],
    ["Jenis Kelamin (L/P)", "L"],
    ["Tempat Lahir", "Sukabumi"],
    ["Tanggal Lahir (YYYY-MM-DD)", "2014-03-22"],
    ["Nama Ayah", "H. Muhammad Hakim"],
    ["Nama Ibu", "Hj. Siti Aminah"],
  ];
  const wsId = XLSX.utils.aoa_to_sheet(identitas);
  wsId["!cols"] = [{ wch: 32 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsId, "Identitas");

  // Kurmer
  const kurmer: (string | number)[][] = [
    ["No", "Mata Pelajaran", "Kelas 5 Sem 1", "Kelas 5 Sem 2", "Kelas 6 Sem 1"],
    ...SUBJECTS.map((s, i) => [i + 1, s, "", "", ""]),
  ];
  const wsK = XLSX.utils.aoa_to_sheet(kurmer);
  wsK["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  wsK["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, wsK, "Kurmer");

  // Praktek
  const praktek: (string | number)[][] = [
    ["No", "Mata Pelajaran", "Nilai Praktek"],
    ...SUBJECTS.map((s, i) => [i + 1, s, ""]),
  ];
  const wsP = XLSX.utils.aoa_to_sheet(praktek);
  wsP["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsP, "Praktek");

  // Ujian Tertulis
  const ujian: (string | number)[][] = [
    ["No", "Mata Pelajaran", "Nilai Tertulis"],
    ...SUBJECTS.map((s, i) => [i + 1, s, ""]),
  ];
  const wsU = XLSX.utils.aoa_to_sheet(ujian);
  wsU["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsU, "Ujian");

  triggerDownload(wb, filename);
}

export function downloadTemplateSiswaExcel(filename = "Template-Upload-Siswa.xlsx") {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [
    [
      "No",
      "Nama Lengkap",
      "NISN",
      "No Ujian",
      "Jenis Kelamin (L/P)",
      "Tempat Lahir",
      "Tanggal Lahir (YYYY-MM-DD)",
      "Nama Ayah",
      "Nama Ibu",
    ],
    [
      1,
      "Ahmad Fauzan Hakim",
      "0123456789",
      "06-001-001",
      "L",
      "Sukabumi",
      "",
      "H. Muhammad Hakim",
      "Hj. Siti Aminah",
    ],
    [2, "", "", "", "", "", "", "", ""],
    [3, "", "", "", "", "", "", "", ""],
    [4, "", "", "", "", "", "", "", ""],
    [5, "", "", "", "", "", "", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);

  const sampleDateAddr = XLSX.utils.encode_cell({ r: 1, c: 6 });
  ws[sampleDateAddr] = { t: "d", v: new Date(2014, 2, 22) } as XLSX.CellObject;

  const ensureCell = (r: number, c: number) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr] as XLSX.CellObject | undefined;
    if (cell) return cell;
    const created = { t: "s", v: "" } as XLSX.CellObject;
    ws[addr] = created;
    return created;
  };

  const maxRows = 300;
  for (let r = 1; r <= maxRows; r++) {
    ensureCell(r, 2).z = "@";
    ensureCell(r, 3).z = "@";
    ensureCell(r, 6).z = "yyyy-mm-dd";
  }

  ws["!cols"] = [
    { wch: 4 },
    { wch: 30 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, "Siswa");
  triggerDownload(wb, filename);
}

/* ---------------- Import ---------------- */

export interface ImportResult {
  identitas?: Partial<Identitas>;
  nilai: NilaiSiswa;
  warnings: string[];
}

export interface StudentListImportResult {
  students: Partial<Identitas>[];
  warnings: string[];
}

function findSubjectRow(rows: unknown[][], subject: Subject): unknown[] | null {
  const target = subject.toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const name = String(r[1] ?? "")
      .trim()
      .toLowerCase();
    if (name === target) return r;
  }
  return null;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return clampNilai(n);
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(Math.trunc(v));
  return String(v).trim();
}

function normalizeHeader(v: unknown): string {
  return str(v)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseIsoDateString(s: string): string {
  const raw = s.trim();
  if (!raw) return "";

  const ymd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (
      !Number.isNaN(dt.getTime()) &&
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    ) {
      return dt.toISOString().slice(0, 10);
    }
  }

  const dmy = raw.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (
      !Number.isNaN(dt.getTime()) &&
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    ) {
      return dt.toISOString().slice(0, 10);
    }
  }

  return "";
}

function isoDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return XLSX.SSF.format("yyyy-mm-dd", v);
  const s = str(v);
  return parseIsoDateString(s) || "";
}

export async function importFromExcel(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const warnings: string[] = [];
  const nilai = emptyNilai();
  let identitas: Partial<Identitas> | undefined;

  // Identitas
  const idSheet = wb.Sheets["Identitas"];
  if (idSheet) {
    const arr = XLSX.utils.sheet_to_json<unknown[]>(idSheet, { header: 1 });
    const map: Record<string, string> = {};
    for (const row of arr) {
      const k = String(row?.[0] ?? "").trim();
      const v = String(row?.[1] ?? "").trim();
      if (k) map[k.toLowerCase()] = v;
    }
    identitas = {
      nisn: map["nisn"] ?? "",
      noUjian: map["no ujian"] ?? "",
      nama: map["nama lengkap"] ?? "",
      jenisKelamin: (map["jenis kelamin (l/p)"] ?? "L").toUpperCase() === "P" ? "P" : "L",
      tempatLahir: map["tempat lahir"] ?? "",
      tanggalLahir: map["tanggal lahir (yyyy-mm-dd)"] ?? "",
      namaAyah: map["nama ayah"] ?? "",
      namaIbu: map["nama ibu"] ?? "",
    };
  } else warnings.push("Sheet 'Identitas' tidak ditemukan.");

  const kSheet = wb.Sheets["Kurmer"];
  if (kSheet) {
    const arr = XLSX.utils.sheet_to_json<unknown[]>(kSheet, { header: 1 });
    SUBJECTS.forEach((s) => {
      const row = findSubjectRow(arr, s);
      if (row) {
        nilai.kurmer[s] = { k5s1: num(row[2]), k5s2: num(row[3]), k6s1: num(row[4]) };
      }
    });
  } else warnings.push("Sheet 'Kurmer' tidak ditemukan.");

  const pSheet = wb.Sheets["Praktek"];
  if (pSheet) {
    const arr = XLSX.utils.sheet_to_json<unknown[]>(pSheet, { header: 1 });
    SUBJECTS.forEach((s) => {
      const row = findSubjectRow(arr, s);
      if (row) nilai.praktek[s] = num(row[2]);
    });
  } else warnings.push("Sheet 'Praktek' tidak ditemukan.");

  const uSheet = wb.Sheets["Ujian"];
  if (uSheet) {
    const arr = XLSX.utils.sheet_to_json<unknown[]>(uSheet, { header: 1 });
    SUBJECTS.forEach((s) => {
      const row = findSubjectRow(arr, s);
      if (row) nilai.ujianTertulis[s] = num(row[2]);
    });
  } else warnings.push("Sheet 'Ujian' tidak ditemukan.");

  return { identitas, nilai, warnings };
}

export async function importStudentListFromExcel(file: File): Promise<StudentListImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  return parseStudentListFromWorkbook(wb);
}

export function parseStudentListFromWorkbook(wb: XLSX.WorkBook): StudentListImportResult {
  const warnings: string[] = [];

  const sheetName = wb.Sheets["Siswa"] ? "Siswa" : (wb.SheetNames[0] ?? "");
  if (!sheetName) return { students: [], warnings: ["Workbook kosong atau tidak terbaca."] };
  if (sheetName !== "Siswa") {
    warnings.push("Sheet 'Siswa' tidak ditemukan. Menggunakan sheet pertama.");
  }

  const ws = wb.Sheets[sheetName];
  const arr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
  const buildHeaderIndex = (row: unknown[]): Map<string, number> => {
    const m = new Map<string, number>();
    row.forEach((h, idx) => {
      const key = normalizeHeader(h);
      if (key) m.set(key, idx);
    });
    return m;
  };

  const maxScan = Math.min(arr.length, 10);
  let headerRowIndex = -1;
  let headerIndex = new Map<string, number>();
  for (let i = 0; i < maxScan; i++) {
    const row = (arr[i] ?? []) as unknown[];
    const idx = buildHeaderIndex(row);
    const hasNama = idx.has("namalengkap") || idx.has("nama");
    const hasId = idx.has("nisn") || idx.has("noujian");
    if (hasNama && hasId) {
      headerRowIndex = i;
      headerIndex = idx;
      break;
    }
  }
  if (headerRowIndex === -1) {
    warnings.push("Header tidak ditemukan. Pastikan ada kolom: Nama Lengkap, NISN, No Ujian.");
    return { students: [], warnings };
  }

  const idxNama = headerIndex.get("namalengkap") ?? headerIndex.get("nama");
  if (idxNama === undefined) warnings.push("Kolom 'Nama Lengkap' tidak ditemukan.");

  const cellObjectAt = (r: number, c: number): XLSX.CellObject | undefined => {
    const addr = XLSX.utils.encode_cell({ r, c });
    return ws[addr] as XLSX.CellObject | undefined;
  };

  const valueAt = (r: number, c: number): unknown => {
    const cell = cellObjectAt(r, c);
    if (!cell) return undefined;
    if (cell.t === "d") return cell.v;
    if (cell.t === "n" && typeof cell.w === "string" && cell.w.trim()) return cell.w;
    return cell.v;
  };

  const pickAt = (rowIndex: number, keys: string[]): unknown => {
    for (const k of keys) {
      const idx = headerIndex.get(k);
      if (idx !== undefined) return valueAt(rowIndex, idx);
    }
    return "";
  };

  const normalizeNisn = (v: unknown): string => {
    const s = str(v);
    if (!s) return "";
    return s.replace(/^'+/, "").replace(/\D/g, "");
  };

  const normalizeNoUjian = (v: unknown): string => {
    const s = str(v);
    if (!s) return "";
    return s.replace(/^'+/, "").trim();
  };

  const students: Partial<Identitas>[] = [];
  for (let i = headerRowIndex + 1; i < arr.length; i++) {
    const nama = str(
      idxNama !== undefined ? valueAt(i, idxNama) : pickAt(i, ["namalengkap", "nama"]),
    );
    const nisnRaw = pickAt(i, ["nisn"]);
    const noUjianRaw = pickAt(i, ["noujian"]);
    const jkRaw = pickAt(i, ["jeniskelaminlp", "jeniskelamin", "jk"]);
    const tempatLahir = str(pickAt(i, ["tempatlahir"]));
    const tanggalRaw = pickAt(i, ["tanggallahiryyyymmdd", "tanggallahir", "ttl"]);
    const namaAyah = str(pickAt(i, ["namaayah", "ayah"]));
    const namaIbu = str(pickAt(i, ["namaibu", "ibu"]));

    const nisn = normalizeNisn(nisnRaw);
    const noUjian = normalizeNoUjian(noUjianRaw);
    const jkText = str(jkRaw).toUpperCase();
    const jenisKelamin: Identitas["jenisKelamin"] = jkText.startsWith("P") ? "P" : "L";
    const tanggalLahir = isoDate(tanggalRaw);

    const isEmpty = !nama && !nisn && !noUjian;
    if (isEmpty) continue;

    if (!nama) {
      warnings.push(`Baris ${i + 1}: Nama Lengkap kosong, baris dilewati.`);
      continue;
    }

    if (typeof nisnRaw === "number" && nisn.length > 0) {
      warnings.push(
        `Baris ${i + 1}: NISN terbaca sebagai angka (leading zero bisa hilang). Gunakan template agar kolom NISN bertipe Text.`,
      );
    }
    if (typeof noUjianRaw === "number" && noUjian.length > 0) {
      warnings.push(`Baris ${i + 1}: No Ujian terbaca sebagai angka (format bisa berubah).`);
    }
    if (nisn && !/^\d{8,12}$/.test(nisn)) {
      warnings.push(`Baris ${i + 1}: NISN tidak valid (harus 8–12 digit).`);
    }
    if (!tanggalLahir && str(tanggalRaw)) {
      warnings.push(
        `Baris ${i + 1}: Tanggal Lahir tidak dikenali ("${str(tanggalRaw)}"). Gunakan format YYYY-MM-DD atau DD/MM/YYYY.`,
      );
    }

    students.push({
      nisn,
      noUjian,
      nama,
      jenisKelamin,
      tempatLahir,
      tanggalLahir,
      namaAyah,
      namaIbu,
    });
  }

  return { students, warnings };
}

/* ---------------- Export Hasil Akhir ---------------- */

export function exportHasilAkhirExcel(student: Student, filename?: string) {
  const wb = XLSX.utils.book_new();
  const { identitas, nilai } = student;

  // Identitas
  const idAoA = [
    ["IDENTITAS SISWA"],
    [],
    ["NISN", identitas.nisn],
    ["No Ujian", identitas.noUjian],
    ["Nama Lengkap", identitas.nama],
    ["Jenis Kelamin", identitas.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"],
    ["Tempat, Tanggal Lahir", formatTTL(identitas.tempatLahir, identitas.tanggalLahir)],
    ["Nama Ayah", identitas.namaAyah],
    ["Nama Ibu", identitas.namaIbu],
  ];
  const wsId = XLSX.utils.aoa_to_sheet(idAoA);
  wsId["!cols"] = [{ wch: 28 }, { wch: 40 }];
  wsId["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, wsId, "Identitas");

  // Kurmer
  const kHeader = [
    "No",
    "Mata Pelajaran",
    "Kls 5 Sem 1",
    "Kls 5 Sem 2",
    "Kls 6 Sem 1",
    "Jumlah",
    "Rata-rata",
  ];
  const kRows = SUBJECTS.map((s, i) => {
    const r = nilai.kurmer[s];
    const sum = r.k5s1 + r.k5s2 + r.k6s1;
    return [i + 1, s, r.k5s1, r.k5s2, r.k6s1, sum, sum / 3];
  });
  const wsK = XLSX.utils.aoa_to_sheet([kHeader, ...kRows]);
  wsK["!cols"] = [
    { wch: 4 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
  ];
  wsK["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, wsK, "Raport Kurmer");

  // Praktek
  const wsP = XLSX.utils.aoa_to_sheet([
    ["No", "Mata Pelajaran", "Nilai Praktek"],
    ...SUBJECTS.map((s, i) => [i + 1, s, nilai.praktek[s]]),
  ]);
  wsP["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }];
  wsP["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, wsP, "Ujian Praktek");

  // Hasil Ujian
  const hu = buildHasilUjian(nilai);
  const wsHU = XLSX.utils.aoa_to_sheet([
    ["No", "Mata Pelajaran", "Tertulis", "Praktek", "Rata-rata Ujian"],
    ...hu.map((r, i) => [i + 1, r.subject, r.tertulis, r.praktek, r.rataUjian]),
  ]);
  wsHU["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
  wsHU["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, wsHU, "Hasil Ujian");

  // Hasil Akhir
  const ha = buildHasilAkhir(nilai);
  const wsHA = XLSX.utils.aoa_to_sheet([
    ["No", "Mata Pelajaran", "Rata-rata Kurmer", "Nilai Ujian Madrasah", "Nilai Akhir", "Predikat"],
    ...ha.map((r, i) => [i + 1, r.subject, r.rataKurmer, r.nilaiUjian, r.nilaiAkhir, r.predikat]),
    [],
    ["", "Jumlah", "", "", jumlahHasilAkhir(nilai), ""],
    ["", "Rata-rata Keseluruhan", "", "", rataKeseluruhan(nilai), ""],
    ["", "Peringkat Kelas", "", "", nilai.peringkatKelas ?? "-", ""],
  ]);
  wsHA["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 }];
  wsHA["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, wsHA, "Hasil Akhir");

  // SKL
  const wsSKL = XLSX.utils.aoa_to_sheet([
    ["SKL & IJAZAH"],
    [],
    ["Nama", identitas.nama],
    ["NISN", identitas.nisn],
    ["No Ujian", identitas.noUjian],
    [],
    ["No", "Mata Pelajaran", "Nilai Akhir", "Predikat"],
    ...ha.map((r, i) => [i + 1, r.subject, r.nilaiAkhir, r.predikat]),
    [],
    ["", "Jumlah", jumlahHasilAkhir(nilai), ""],
    ["", "Rata-rata Keseluruhan", rataKeseluruhan(nilai), ""],
    ["", "Peringkat Kelas", nilai.peringkatKelas ?? "-", ""],
  ]);
  wsSKL["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }, { wch: 14 }];
  wsSKL["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  XLSX.utils.book_append_sheet(wb, wsSKL, "SKL & Ijazah");

  const safeName = (identitas.nama || "Siswa").replace(/[^\w\d-]+/g, "_");
  triggerDownload(wb, filename ?? `Hasil-Akhir-${safeName}.xlsx`);
}

export type NilaiUjianKelasRow = {
  excelRow: number;
  no: number;
  nama: string;
  nisn: string;
  kelas: string;
  values: Partial<Record<Subject, { tertulis?: number; praktek?: number }>>;
  errors: string[];
};

export type NilaiUjianKelasParseResult = {
  rows: NilaiUjianKelasRow[];
  warnings: string[];
  errors: string[];
};

function nilaiUjianKelasHeaders(): string[] {
  const base = ["No", "Nama Siswa", "NISN", "Kelas"];
  const cols: string[] = [];
  for (const s of SUBJECTS) {
    cols.push(`${s} - Tertulis`, `${s} - Praktek`);
  }
  return [...base, ...cols];
}

function normalizeSubjectCol(subject: Subject, kind: "tertulis" | "praktek"): string {
  return normalizeHeader(`${subject}${kind}`);
}

function worksheetValueAt(ws: XLSX.WorkSheet, r: number, c: number): unknown {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr] as XLSX.CellObject | undefined;
  if (!cell) return undefined;
  if (cell.t === "d") return cell.v;
  if (cell.t === "n" && typeof cell.w === "string" && cell.w.trim()) return cell.w;
  return cell.v;
}

function clampNilaiOrNull(v: unknown): number | null {
  const raw = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(raw)) return null;
  return clampNilai(raw);
}

export function downloadTemplateNilaiUjianKelasExcel(
  students: Student[],
  filename = "Template-Nilai-Ujian-Kelas.xlsx",
  sheetPassword = "mi-2026",
) {
  const wb = XLSX.utils.book_new();

  const instruksi = XLSX.utils.aoa_to_sheet([
    ["TEMPLATE NILAI UJIAN (KELAS)"],
    [],
    ["Kolom yang boleh diedit:", "Semua kolom nilai (Tertulis/Praktek)."],
    ["Kolom yang dikunci:", "No, Nama Siswa, NISN, Kelas."],
    ["Aturan nilai:", "Angka 0–100 (hanya angka)."],
    ["Catatan:", "Proteksi adalah proteksi sheet (bukan password untuk membuka file)."],
  ]);
  instruksi["!cols"] = [{ wch: 24 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(wb, instruksi, "Instruksi");

  const header = nilaiUjianKelasHeaders();
  const minRows = Math.max(50, students.length);
  const rows: (string | number)[][] = [header];

  for (let i = 0; i < minRows; i++) {
    const s = students[i];
    const no = i + 1;
    const nama = s?.identitas.nama ?? "";
    const nisn = s?.identitas.nisn ?? "";
    const kelas = "6";
    const row: (string | number)[] = [no, nama, nisn, kelas];
    for (const subj of SUBJECTS) {
      row.push(s ? s.nilai.ujianTertulis[subj] : "", s ? s.nilai.praktek[subj] : "");
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!freeze"] = { xSplit: 4, ySplit: 1 };
  ws["!cols"] = autoCols(rows, [
    4,
    30,
    16,
    8,
    ...Array.from({ length: SUBJECTS.length * 2 }).map(() => 14),
  ]);

  for (let r = 1; r <= minRows; r++) {
    ensureCell(ws, r, 2).z = "@";
  }

  const headerStyle = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "1F8A70" } },
    alignment: { vertical: "center", horizontal: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "D0D5DD" } },
      bottom: { style: "thin", color: { rgb: "D0D5DD" } },
      left: { style: "thin", color: { rgb: "D0D5DD" } },
      right: { style: "thin", color: { rgb: "D0D5DD" } },
    },
    protection: { locked: true },
  };
  const lockedStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } },
    },
    protection: { locked: true },
  };
  const unlockedStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } },
    },
    protection: { locked: false },
  };

  for (let c = 0; c < header.length; c++) setStyle(ws, 0, c, headerStyle);

  const lastCol = header.length - 1;
  for (let r = 1; r <= minRows; r++) {
    for (let c = 0; c <= lastCol; c++) {
      if (c <= 3) setStyle(ws, r, c, lockedStyle);
      else setStyle(ws, r, c, unlockedStyle);
    }
  }

  const wsMeta = ws as unknown as Record<string, unknown>;
  wsMeta["protect"] = { password: sheetPassword };
  wsMeta["!protect"] = { password: sheetPassword };

  XLSX.utils.book_append_sheet(wb, ws, "Nilai Ujian");
  const writeOptions: XLSX.WritingOptions & { cellStyles?: boolean } = {
    bookType: "xlsx",
    compression: true,
    cellStyles: true,
  };
  XLSX.writeFile(wb, filename, writeOptions);
}

export function parseNilaiUjianKelasFromWorkbook(wb: XLSX.WorkBook): NilaiUjianKelasParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const sheetName = wb.Sheets["Nilai Ujian"] ? "Nilai Ujian" : (wb.SheetNames[0] ?? "");
  if (!sheetName) return { rows: [], warnings, errors: ["Workbook kosong atau tidak terbaca."] };
  if (sheetName !== "Nilai Ujian")
    warnings.push("Sheet 'Nilai Ujian' tidak ditemukan. Menggunakan sheet pertama.");

  const ws = wb.Sheets[sheetName];
  const arr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });

  const expected = nilaiUjianKelasHeaders();
  const expectedNorm = expected.map(normalizeHeader);

  const maxScan = Math.min(arr.length, 10);
  let headerRowIndex = -1;
  let headerIndex = new Map<string, number>();
  for (let i = 0; i < maxScan; i++) {
    const row = (arr[i] ?? []) as unknown[];
    const idx = new Map<string, number>();
    row.forEach((h, c) => {
      const key = normalizeHeader(h);
      if (key) idx.set(key, c);
    });
    const hasAllBase =
      idx.has(normalizeHeader("No")) &&
      idx.has(normalizeHeader("Nama Siswa")) &&
      idx.has(normalizeHeader("NISN")) &&
      idx.has(normalizeHeader("Kelas"));
    if (hasAllBase) {
      headerRowIndex = i;
      headerIndex = idx;
      break;
    }
  }
  if (headerRowIndex === -1) {
    return {
      rows: [],
      warnings,
      errors: [
        "Header tidak ditemukan. Pastikan file memakai template 'Nilai Ujian' dengan kolom: No, Nama Siswa, NISN, Kelas, dan kolom nilai per mapel.",
      ],
    };
  }

  for (let i = 0; i < expectedNorm.length; i++) {
    const key = expectedNorm[i]!;
    if (!headerIndex.has(key)) errors.push(`Kolom wajib tidak ditemukan: "${expected[i]!}"`);
  }
  if (errors.length > 0) return { rows: [], warnings, errors };

  const idxNo = headerIndex.get(normalizeHeader("No"))!;
  const idxNama = headerIndex.get(normalizeHeader("Nama Siswa"))!;
  const idxNisn = headerIndex.get(normalizeHeader("NISN"))!;
  const idxKelas = headerIndex.get(normalizeHeader("Kelas"))!;

  const rows: NilaiUjianKelasRow[] = [];
  for (let r = headerRowIndex + 1; r < arr.length; r++) {
    const row = (arr[r] ?? []) as unknown[];
    const nama = str(worksheetValueAt(ws, r, idxNama) ?? row[idxNama]);
    const nisn = str(worksheetValueAt(ws, r, idxNisn) ?? row[idxNisn])
      .replace(/^'+/, "")
      .trim();
    const kelas = str(worksheetValueAt(ws, r, idxKelas) ?? row[idxKelas]).trim();
    const noRaw = worksheetValueAt(ws, r, idxNo) ?? row[idxNo];
    const no = typeof noRaw === "number" ? Math.trunc(noRaw) : parseInt(str(noRaw), 10) || 0;

    const isEmpty = !nama && !nisn;
    if (isEmpty) continue;

    const values: NilaiUjianKelasRow["values"] = {};
    const rowErrors: string[] = [];
    if (!nama) rowErrors.push("Nama Siswa kosong.");
    if (!nisn) rowErrors.push("NISN kosong.");

    for (const subj of SUBJECTS) {
      const idxT = headerIndex.get(normalizeSubjectCol(subj, "tertulis"))!;
      const idxP = headerIndex.get(normalizeSubjectCol(subj, "praktek"))!;
      const tertulis = clampNilaiOrNull(worksheetValueAt(ws, r, idxT) ?? row[idxT]);
      const praktek = clampNilaiOrNull(worksheetValueAt(ws, r, idxP) ?? row[idxP]);

      if (tertulis !== null || praktek !== null) {
        values[subj] = {};
        if (tertulis !== null) values[subj]!.tertulis = tertulis;
        if (praktek !== null) values[subj]!.praktek = praktek;
      }

      const rawT = str(worksheetValueAt(ws, r, idxT) ?? row[idxT]).trim();
      if (rawT && tertulis === null) rowErrors.push(`Nilai Tertulis ${subj} tidak valid (0–100).`);
      const rawP = str(worksheetValueAt(ws, r, idxP) ?? row[idxP]).trim();
      if (rawP && praktek === null) rowErrors.push(`Nilai Praktek ${subj} tidak valid (0–100).`);
    }

    rows.push({ excelRow: r + 1, no, nama, nisn, kelas, values, errors: rowErrors });
  }

  return { rows, warnings, errors };
}

export async function importNilaiUjianKelasFromExcel(
  file: File,
): Promise<NilaiUjianKelasParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  return parseNilaiUjianKelasFromWorkbook(wb);
}
