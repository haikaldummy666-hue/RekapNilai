import * as XLSX from "xlsx";
import type { Subject } from "@/data/subjects";
import { SUBJECTS } from "@/data/subjects";
import type { Student, Identitas, NilaiSiswa } from "@/types/student.types";
import type { AvailableMulok } from "@/types/mulok.types";
import { AVAILABLE_MULOK } from "@/types/mulok.types";
import { clampNilai, formatTTL } from "@/utils/formatUtils";
import { emptyNilai } from "@/data/sampleData";
import {
  buildHasilUjian,
  buildHasilAkhir,
  jumlahHasilAkhir,
  rataKeseluruhan,
} from "@/utils/calculateUtils";

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
 */

/**
 * Module-level helper: ensure a cell exists at (r, c) in a worksheet.
 */
function ensureCell(ws: XLSX.WorkSheet, r: number, c: number): XLSX.CellObject {
  const addr = XLSX.utils.encode_cell({ r, c });
  let cell = ws[addr] as XLSX.CellObject | undefined;
  if (!cell) {
    cell = { t: "s", v: "" } as XLSX.CellObject;
    ws[addr] = cell;
  }
  return cell;
}

/**
 * Module-level helper: set cell style at (r, c) in a worksheet.
 */
function setStyle(ws: XLSX.WorkSheet, r: number, c: number, style: any) {
  const cell = ensureCell(ws, r, c);
  cell.s = style;
}

/**
 * Helper function to download workbook
 */
function triggerDownload(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

function buildNilaiUjianWorkbook(
  students: Student[],
  mulokList: AvailableMulok[] = ["Bahasa Sunda"],
  locked = false,
) {
  const wb = XLSX.utils.book_new();

  const headerTop: (string | number)[] = ["No", "NISN", "Nama Lengkap", "JK"];
  const headerSub: (string | number)[] = ["", "", "", ""];
  
  for (const s of SUBJECTS) {
    headerTop.push(displaySubjectTemplate(s), "");
    headerSub.push("V-1", "V-2");
  }
  for (const m of mulokList) {
    headerTop.push(displayMulokTemplate(m), "");
    headerSub.push("V-1", "V-2");
  }

  const minRows = Math.max(50, students.length);
  const rows: (string | number)[][] = [headerTop, headerSub];

  for (let i = 0; i < minRows; i++) {
    const s = students[i];
    const no = i + 1;
    const nisn = s?.identitas.nisn ?? "";
    const nama = s?.identitas.nama ?? "";
    const jk = s?.identitas.jenisKelamin ?? "";
    const row: (string | number)[] = [no, nisn, nama, jk];
    for (const subj of SUBJECTS) {
      row.push(s ? s.nilai.ujianTertulis[subj] : "", s ? s.nilai.praktek[subj] : "");
    }
    for (const m of mulokList) {
      row.push(s ? s.nilai.ujianMulok[m] : "", s ? s.nilai.praktekMulok[m] : "");
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!freeze"] = { xSplit: 4, ySplit: 2 };
  const colCount = SUBJECTS.length + mulokList.length;
  ws["!cols"] = [
    { wch: 4 },
    { wch: 16 },
    { wch: 30 },
    { wch: 6 },
    ...Array.from({ length: colCount * 2 }).map(() => ({ wch: 6 })),
  ];

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
    ...SUBJECTS.map((_, idx) => {
      const start = 4 + idx * 2;
      return { s: { r: 0, c: start }, e: { r: 0, c: start + 1 } };
    }),
    ...mulokList.map((_, idx) => {
      const start = 4 + SUBJECTS.length * 2 + idx * 2;
      return { s: { r: 0, c: start }, e: { r: 0, c: start + 1 } };
    }),
  ];
  ws["!merges"] = merges;

  const headerRows = 2;
  for (let r = headerRows; r < headerRows + minRows; r++) {
    ensureCell(ws, r, 1).z = "@";
  }

  const headerStyle = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "111827" } },
    fill: { patternType: "solid", fgColor: { rgb: "F3F4F6" } },
    alignment: { vertical: "center", horizontal: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: true },
  };
  const subHeaderStyle = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "111827" } },
    fill: { patternType: "solid", fgColor: { rgb: "F3F4F6" } },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: true },
  };
  const lockedStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: true },
  };
  const unlockedStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: false },
    numFmt: "0",
  };

  const lastCol = headerTop.length - 1;
  for (let c = 0; c <= lastCol; c++) setStyle(ws, 0, c, headerStyle);
  for (let c = 0; c <= lastCol; c++) setStyle(ws, 1, c, subHeaderStyle);

  for (let r = headerRows; r < headerRows + minRows; r++) {
    for (let c = 0; c <= lastCol; c++) {
      if (c <= 3) {
        const style = { ...lockedStyle } as any;
        if (c === 0 || c === 1 || c === 3) style.alignment = { vertical: "center", horizontal: "center" };
        if (c === 2) style.alignment = { vertical: "center", horizontal: "left" };
        setStyle(ws, r, c, style);
      } else {
        setStyle(ws, r, c, unlockedStyle);
      }
    }
  }

  ws["!protect"] = {
    sheet: true,
    content: true,
    objects: false,
    scenarios: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    // selectUnlocked/selectLocked determine whether cells are selectable/editable in Excel
    selectLockedCells: locked ? false : true,
    selectUnlockedCells: locked ? false : true,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  };

  XLSX.utils.book_append_sheet(wb, ws, "Nilai Ujian");
  return wb;
}

export function downloadTemplateNilaiUjianKelasLocked(
  students: Student[],
  filename = "Template-Nilai-Ujian-Kelas-Locked.xlsx",
  mulokList: AvailableMulok[] = ["Bahasa Sunda"],
) {
  const wb = buildNilaiUjianWorkbook(students, mulokList, true);
  const writeOptions: XLSX.WritingOptions & { cellStyles?: boolean } = {
    bookType: "xlsx",
    compression: true,
    cellStyles: true,
  };
  XLSX.writeFile(wb, filename, writeOptions);
}

/**
 * Build worksheet untuk template ujian tertulis kelas
 */
function buildUjianTertulisKelasTemplateSheet(
  students: Array<{ nama: string; [key: string]: any }>,
  selectedMulok: AvailableMulok[] = ["Bahasa Sunda"],
): XLSX.WorkSheet {
  const allSubjects = [...SUBJECTS, ...selectedMulok];
  const headerTop: (string | number)[] = ["No", "NISN", "Nama", "JK"];
  const headerSub: (string | number)[] = ["", "", "", ""];

  for (const s of SUBJECTS) {
    headerTop.push(displaySubjectTemplate(s), "");
    headerSub.push("V-1", "V-2");
  }
  for (const m of selectedMulok) {
    headerTop.push(displayMulokTemplate(m), "");
    headerSub.push("V-1", "V-2");
  }

  const rows: (string | number)[][] = [headerTop, headerSub];
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const row: (string | number)[] = [
      i + 1,
      s.identitas?.nisn ?? "",
      s.nama ?? s.identitas?.nama ?? "",
      s.identitas?.jenisKelamin ?? "",
    ];
    for (let j = 0; j < SUBJECTS.length; j++) {
      row.push("", "");
    }
    for (let j = 0; j < selectedMulok.length; j++) {
      row.push("", "");
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const ensureCell = (r: number, c: number) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    let cell = ws[addr] as XLSX.CellObject | undefined;
    if (!cell) {
      cell = { t: "s", v: "" } as XLSX.CellObject;
      ws[addr] = cell;
    }
    return cell;
  };
  const setStyle = (r: number, c: number, style: any) => {
    const cell = ensureCell(r, c);
    cell.s = style;
  };

  ws["!cols"] = Array(headerTop.length)
    .fill(null)
    .map(() => ({ wch: 12 }));
  ws["!freeze"] = { xSplit: 4, ySplit: 2 };

  const headerStyle = {
    font: { bold: true, name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center", wrapText: true },
    fill: { fgColor: { rgb: "CCCCCC" } },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: true },
  };
  const subHeaderStyle = {
    font: { name: "Calibri", sz: 10 },
    alignment: { vertical: "center", horizontal: "center" },
    fill: { fgColor: { rgb: "E5E5E5" } },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: true },
  };
  const lockedStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: true },
  };
  const unlockedStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: false },
    numFmt: "0",
  };

  const lastCol = headerTop.length - 1;
  for (let c = 0; c <= lastCol; c++) setStyle(0, c, headerStyle);
  for (let c = 0; c <= lastCol; c++) setStyle(1, c, subHeaderStyle);

  for (let r = 2; r < rows.length; r++) {
    for (let c = 0; c <= lastCol; c++) {
      if (c <= 3) {
        setStyle(r, c, lockedStyle);
      } else {
        setStyle(r, c, unlockedStyle);
      }
    }
  }

  ws["!protect"] = {
    sheet: true,
    content: true,
    objects: false,
    scenarios: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    selectLockedCells: true,
    sort: false,
    autoFilter: false,
    pivotTables: false,
    selectUnlockedCells: true,
  };

  return ws;
}

/**
 * Download template ujian tertulis kelas dengan daftar siswa
 * Hanya kolom nilai yang bisa di-edit, sheet dikunci
 */
export function downloadTemplateUjianTertulisKelasExcel(
  students: Array<{ nama: string; [key: string]: any }>,
  selectedMulok: AvailableMulok[] = ["Bahasa Sunda"],
  filename = "Template-Ujian-Tertulis-Kelas.xlsx",
) {
  const wb = XLSX.utils.book_new();
  const ws = buildUjianTertulisKelasTemplateSheet(students, selectedMulok);
  XLSX.utils.book_append_sheet(wb, ws, "Ujian Tertulis");
  triggerDownload(wb, filename);
}

/**
 * Import hasil nilai ujian dari template kelas yang sudah terisi
 * Mengembalikan pemetaan NISN -> nilai ujian tertulis
 */
export async function importUjianTertulisKelasFromExcel(
  file: File,
): Promise<{ results: Map<string, Record<Subject, number>>; warnings: string[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const warnings: string[] = [];
  const results = new Map<string, Record<Subject, number>>();

  const ws = wb.Sheets["Ujian Tertulis"] || wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    warnings.push("Sheet 'Ujian Tertulis' tidak ditemukan");
    return { results, warnings };
  }

  const arr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
  if (arr.length < 2) {
    warnings.push("Template terlalu pendek (minimal header + 1 baris data)");
    return { results, warnings };
  }

  const headerRow = arr[0] as unknown[];
  const buildHeaderIndex = (row: unknown[]): Map<string, number> => {
    const m = new Map<string, number>();
    row.forEach((h, idx) => {
      const key = normalizeHeader(h);
      if (key) m.set(key, idx);
    });
    return m;
  };

  const headerIndex = buildHeaderIndex(headerRow);
  const idxNama = headerIndex.get("namasising") ?? headerIndex.get("nama");
  
  if (idxNama === undefined) {
    warnings.push("Kolom 'Nama Siswa' tidak ditemukan");
    return { results, warnings };
  }

  // Parsing data rows (mulai dari row 1)
  for (let i = 1; i < arr.length; i++) {
    const row = arr[i] as unknown[];
    const nama = str(row?.[idxNama]);
    
    if (!nama) continue; // Skip empty rows

    const nilaiBySubject: Record<Subject, number> = {} as any;
    SUBJECTS.forEach((s) => {
      nilaiBySubject[s] = 0;
    });

    // Parse nilai untuk setiap subject
    for (let c = 2; c < row.length; c++) {
      const headerVal = headerRow?.[c];
      if (!headerVal) break;
      
      const headerStr = str(headerVal);
      // Try to match subject
      const subject = subjectFromTemplateHeader(headerStr);
      if (subject) {
        nilaiBySubject[subject] = clampNilaiOrNull(row[c]) ?? 0;
      }
    }

    // Gunakan nama sebagai key (karena NISN mungkin tidak ada di template sederhana)
    results.set(nama, nilaiBySubject);
  }

  if (results.size === 0) {
    warnings.push("Tidak ada data nilai yang berhasil diparse");
  }

  return { results, warnings };
}


/**
 * Download template ujian tertulis individual (tanpa daftar siswa)
 * Template kosong untuk input nilai ujian tertulis satu siswa
 */
export function downloadTemplateUjianTertulisExcel(
  selectedMulok: AvailableMulok[] = ["Bahasa Sunda"],
  filename = "Template-Ujian-Tertulis.xlsx",
) {
  const wb = XLSX.utils.book_new();
  const allSubjects = [...SUBJECTS, ...selectedMulok];

  const headerTop: (string | number)[] = ["No", "Mata Pelajaran", "V-1", "V-2"];
  const rows: (string | number)[][] = [headerTop];

  let rowNum = 1;
  for (const s of SUBJECTS) {
    rows.push([rowNum, displaySubjectTemplate(s), "", ""]);
    rowNum++;
  }
  for (const m of selectedMulok) {
    rows.push([rowNum, displayMulokTemplate(m), "", ""]);
    rowNum++;
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const ensureCell = (r: number, c: number) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    let cell = ws[addr] as XLSX.CellObject | undefined;
    if (!cell) {
      cell = { t: "s", v: "" } as XLSX.CellObject;
      ws[addr] = cell;
    }
    return cell;
  };
  const setStyle = (r: number, c: number, style: any) => {
    const cell = ensureCell(r, c);
    cell.s = style;
  };

  ws["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 12 }];
  ws["!freeze"] = { xSplit: 2, ySplit: 1 };

  const headerStyle = {
    font: { bold: true, name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    fill: { fgColor: { rgb: "CCCCCC" } },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: true },
  };
  const dataStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: false },
    numFmt: "0",
  };

  for (let c = 0; c < 4; c++) {
    setStyle(0, c, headerStyle);
  }

  for (let r = 1; r < rows.length; r++) {
    setStyle(r, 0, dataStyle);
    setStyle(r, 1, { ...dataStyle, protection: { locked: true } });
    setStyle(r, 2, dataStyle);
    setStyle(r, 3, dataStyle);
  }

  ws["!protect"] = {
    sheet: true,
    content: true,
    objects: false,
    scenarios: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    selectLockedCells: false,
    selectUnlockedCells: true,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  };

  XLSX.utils.book_append_sheet(wb, ws, "Ujian Tertulis");
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
        nilai.kurmer[s] = {
          k5s1: num(row[2]),
          k5s2: num(row[3]),
          k6s1: num(row[4]),
          k6s2: num(row[5]),
        };
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
    "Kls 6 Sem 2",
    "Jumlah",
    "Rata-rata",
  ];
  const kRows = SUBJECTS.map((s, i) => {
    const r = nilai.kurmer[s];
    const sum = r.k5s1 + r.k5s2 + r.k6s1 + r.k6s2;
    return [i + 1, s, r.k5s1, r.k5s2, r.k6s1, r.k6s2, sum, sum / 4];
  });
  const wsK = XLSX.utils.aoa_to_sheet([kHeader, ...kRows]);
  wsK["!cols"] = [
    { wch: 4 },
    { wch: 24 },
    { wch: 12 },
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
  mulokValues: Partial<Record<AvailableMulok, { tertulis?: number; praktek?: number }>>;
  /** Kurmer values from V-1/V-2/VI-1/VI-2 format */
  kurmerValues: Partial<Record<Subject, { k5s1?: number; k5s2?: number; k6s1?: number; k6s2?: number }>>;
  mulokKurmerValues: Partial<Record<AvailableMulok, { k5s1?: number; k5s2?: number; k6s1?: number; k6s2?: number }>>;
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

function displaySubjectTemplate(s: Subject): string {
  if (s === "Pendidikan Pancasila") return "P.Pancasila";
  if (s === "Bahasa Indonesia") return "Bindo";
  return s;
}

function displayMulokTemplate(m: AvailableMulok): string {
  // For now, display Mulok as-is. Can be customized later for abbreviations
  return m;
}

function subjectFromTemplateHeader(raw: string): Subject | null {
  const key = normalizeHeader(raw);
  if (!key) return null;
  const aliases: Record<string, Subject> = {
    ppancasila: "Pendidikan Pancasila",
    pendidikanpancasila: "Pendidikan Pancasila",
    bindo: "Bahasa Indonesia",
    bahasaindonesia: "Bahasa Indonesia",
  };
  if (aliases[key]) return aliases[key]!;
  for (const s of SUBJECTS) {
    if (normalizeHeader(s) === key) return s;
    if (normalizeHeader(displaySubjectTemplate(s)) === key) return s;
  }
  return null;
}

function mulokFromTemplateHeader(raw: string): AvailableMulok | null {
  const key = normalizeHeader(raw);
  if (!key) return null;
  
  for (const m of AVAILABLE_MULOK) {
    if (normalizeHeader(m) === key) return m;
    if (normalizeHeader(displayMulokTemplate(m)) === key) return m;
  }
  return null;
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
  mulokList: AvailableMulok[] = ["Bahasa Sunda"],
  filename = "Template-Nilai-Ujian-Kelas.xlsx",
) {
  const wb = XLSX.utils.book_new();

  // Semester sub-labels under each subject
  const semesterLabels = ["V-1", "V-2", "VI-1", "VI-2"];

  // Build header row 1: No | Nama Lengkap | JK | [Subject merged 4 cols] | [Mulok merged 4 cols]
  const headerTop: (string | number)[] = ["No", "Nama Lengkap", "JK"];
  const headerSub: (string | number)[] = ["", "", ""];

  for (const s of SUBJECTS) {
    headerTop.push(displaySubjectTemplate(s), "", "", "");
    headerSub.push(...semesterLabels);
  }
  for (const m of mulokList) {
    headerTop.push(displayMulokTemplate(m), "", "", "");
    headerSub.push(...semesterLabels);
  }

  const rows: (string | number)[][] = [headerTop, headerSub];

  // Populate student rows from registered students
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const no = i + 1;
    const nama = s?.identitas.nama ?? "";
    const jk = s?.identitas.jenisKelamin ?? "";
    const row: (string | number)[] = [no, nama, jk];

    // Add empty value cells for each subject (4 cols each: V-1, V-2, VI-1, VI-2)
    for (const _subj of SUBJECTS) {
      row.push("", "", "", "");
    }
    for (const _m of mulokList) {
      row.push("", "", "", "");
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!freeze"] = { xSplit: 3, ySplit: 2 };

  const totalSubjects = SUBJECTS.length + mulokList.length;
  ws["!cols"] = [
    { wch: 5 },   // No
    { wch: 30 },  // Nama Lengkap
    { wch: 5 },   // JK
    ...Array.from({ length: totalSubjects * 4 }).map(() => ({ wch: 6 })),
  ];

  // Merge cells: No, Nama, JK span 2 rows; each subject name spans 4 columns
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // No
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Nama Lengkap
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // JK
    // Each SUBJECT: merge 4 cols in top header row
    ...SUBJECTS.map((_, idx) => {
      const start = 3 + idx * 4;
      return { s: { r: 0, c: start }, e: { r: 0, c: start + 3 } };
    }),
    // Each MULOK: merge 4 cols in top header row
    ...mulokList.map((_, idx) => {
      const start = 3 + SUBJECTS.length * 4 + idx * 4;
      return { s: { r: 0, c: start }, e: { r: 0, c: start + 3 } };
    }),
  ];
  ws["!merges"] = merges;

  // Styles
  const headerStyle = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "1F4E79" } },
    alignment: { vertical: "center", horizontal: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
    protection: { locked: true },
  };
  const subHeaderStyle = {
    font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "111827" } },
    fill: { patternType: "solid", fgColor: { rgb: "D6E4F0" } },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
    protection: { locked: true },
  };
  const lockedStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
    protection: { locked: true },
  };
  const unlockedStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    fill: { patternType: "solid", fgColor: { rgb: "FFF2CC" } },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
    protection: { locked: false },
    numFmt: "0",
  };

  const lastCol = headerTop.length - 1;
  // Apply header styles
  for (let c = 0; c <= lastCol; c++) setStyle(ws, 0, c, headerStyle);
  for (let c = 0; c <= lastCol; c++) setStyle(ws, 1, c, subHeaderStyle);

  // Apply data row styles
  const headerRows = 2;
  for (let r = headerRows; r < headerRows + students.length; r++) {
    for (let c = 0; c <= lastCol; c++) {
      if (c <= 2) {
        // No, Nama, JK — locked
        const style = { ...lockedStyle } as any;
        if (c === 0 || c === 2) style.alignment = { vertical: "center", horizontal: "center" };
        if (c === 1) style.alignment = { vertical: "center", horizontal: "left" };
        setStyle(ws, r, c, style);
      } else {
        // Value cells — unlocked (editable)
        setStyle(ws, r, c, unlockedStyle);
      }
    }
  }

  // Sheet protection: only unlocked value cells can be edited
  ws["!protect"] = {
    sheet: true,
    content: true,
    objects: false,
    scenarios: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    selectLockedCells: false,
    selectUnlockedCells: true,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  };

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

  const norm = (v: unknown) => normalizeHeader(v);

  // Detect semester sub-header format: V-1, V-2, VI-1, VI-2
  const looksLikeSemesterFormat = (v: unknown) => {
    const k = norm(v);
    return k === "v1" || k === "v2" || k === "vi1" || k === "vi2";
  };

  // Detect old V-1/V-2 format
  const looksLikeVFormat = (v: unknown) => {
    const k = norm(v);
    return k === "v1" || k === "v2";
  };

  const maxScanV = Math.min(arr.length - 1, 15);
  let vHeaderRow = -1;
  let hasFourColFormat = false; // true if VI-1/VI-2 are found (new format)
  for (let i = 0; i < maxScanV; i++) {
    const row = (arr[i] ?? []) as unknown[];
    const next = (arr[i + 1] ?? []) as unknown[];
    const keys = new Set(row.map(norm));
    const hasBase =
      keys.has(norm("No")) &&
      (keys.has(norm("Nama Lengkap")) || keys.has(norm("Nama Siswa")));
    const nextHasV = next.some(looksLikeVFormat);
    const nextHasVI = next.some((v) => {
      const k = norm(v);
      return k === "vi1" || k === "vi2";
    });
    if (hasBase && nextHasV) {
      vHeaderRow = i;
      hasFourColFormat = nextHasVI;
      break;
    }
  }

  if (vHeaderRow !== -1) {
    const top = (arr[vHeaderRow] ?? []) as unknown[];
    const sub = (arr[vHeaderRow + 1] ?? []) as unknown[];
    const findCol = (label: string) => top.findIndex((x) => norm(x) === norm(label));
    const idxNo = findCol("No");
    const idxNama = findCol("Nama Lengkap") !== -1 ? findCol("Nama Lengkap") : findCol("Nama Siswa");
    const idxJk = findCol("JK");
    // NISN is optional in new format
    const idxNisn = findCol("NISN");

    if (idxNo === -1 || idxNama === -1) {
      return {
        rows: [],
        warnings,
        errors: ["Header template Nilai Ujian tidak valid. Pastikan ada kolom: No, Nama Lengkap."],
      };
    }

    const maxCols = Math.max(top.length, sub.length);

    if (hasFourColFormat) {
      // ===== NEW FORMAT: V-1, V-2, VI-1, VI-2 (kurmer) =====
      type SemKey = "k5s1" | "k5s2" | "k6s1" | "k6s2";
      const kurmerColMap: Array<{ col: number; subject: Subject; sem: SemKey }> = [];
      const mulokKurmerColMap: Array<{ col: number; mulok: AvailableMulok; sem: SemKey }> = [];

      const semKeyMap: Record<string, SemKey> = {
        v1: "k5s1",
        v2: "k5s2",
        vi1: "k6s1",
        vi2: "k6s2",
      };

      for (let c = 0; c < maxCols; c++) {
        const sk = norm(sub[c]);
        const sem = semKeyMap[sk];
        if (!sem) continue;

        // Find the subject name: check current top cell, or scan left for the merge-source
        let subjRaw = str(top[c]).trim();
        if (!subjRaw) {
          // Scan left to find the merge source cell
          for (let sc = c - 1; sc >= 0; sc--) {
            const val = str(top[sc]).trim();
            if (val) { subjRaw = val; break; }
          }
        }
        if (!subjRaw) continue;

        // Try Subject first
        const subj = subjectFromTemplateHeader(subjRaw);
        if (subj) {
          kurmerColMap.push({ col: c, subject: subj, sem });
          continue;
        }

        // Try Mulok
        const mulok = mulokFromTemplateHeader(subjRaw);
        if (mulok) {
          mulokKurmerColMap.push({ col: c, mulok, sem });
          continue;
        }
      }

      if (kurmerColMap.length === 0 && mulokKurmerColMap.length === 0) {
        return {
          rows: [],
          warnings,
          errors: ["Kolom mapel tidak ditemukan. Pastikan header mapel dan subheader V-1/V-2/VI-1/VI-2 ada."],
        };
      }

      const rows: NilaiUjianKelasRow[] = [];
      for (let r = vHeaderRow + 2; r < arr.length; r++) {
        const row = (arr[r] ?? []) as unknown[];
        const nama = str(worksheetValueAt(ws, r, idxNama) ?? row[idxNama]);
        const nisn = idxNisn !== -1
          ? str(worksheetValueAt(ws, r, idxNisn) ?? row[idxNisn]).replace(/^'+/, "").trim()
          : "";
        const noRaw = worksheetValueAt(ws, r, idxNo) ?? row[idxNo];
        const no = typeof noRaw === "number" ? Math.trunc(noRaw) : parseInt(str(noRaw), 10) || 0;

        const isEmpty = !nama && !nisn;
        if (isEmpty) continue;

        const kurmerValues: NilaiUjianKelasRow["kurmerValues"] = {};
        const mulokKurmerValues: NilaiUjianKelasRow["mulokKurmerValues"] = {};
        const rowErrors: string[] = [];
        if (!nama) rowErrors.push("Nama Siswa kosong.");

        for (const m of kurmerColMap) {
          const v = clampNilaiOrNull(worksheetValueAt(ws, r, m.col) ?? row[m.col]);
          if (v !== null) {
            kurmerValues[m.subject] = kurmerValues[m.subject] ?? {};
            kurmerValues[m.subject]![m.sem] = v;
          }
          const raw = str(worksheetValueAt(ws, r, m.col) ?? row[m.col]).trim();
          if (raw && v === null) {
            rowErrors.push(`Nilai ${m.sem} ${m.subject} tidak valid (0–100).`);
          }
        }

        for (const m of mulokKurmerColMap) {
          const v = clampNilaiOrNull(worksheetValueAt(ws, r, m.col) ?? row[m.col]);
          if (v !== null) {
            mulokKurmerValues[m.mulok] = mulokKurmerValues[m.mulok] ?? {};
            mulokKurmerValues[m.mulok]![m.sem] = v;
          }
          const raw = str(worksheetValueAt(ws, r, m.col) ?? row[m.col]).trim();
          if (raw && v === null) {
            rowErrors.push(`Nilai ${m.sem} ${m.mulok} tidak valid (0–100).`);
          }
        }

        rows.push({
          excelRow: r + 1,
          no,
          nama,
          nisn,
          kelas: "",
          values: {},
          mulokValues: {},
          kurmerValues,
          mulokKurmerValues,
          errors: rowErrors,
        });
      }
      return { rows, warnings, errors };
    }

    // ===== OLD FORMAT: V-1, V-2 (tertulis/praktek) =====
    const colMap: Array<{ col: number; subject: Subject; kind: "tertulis" | "praktek" }> = [];
    const mulokColMap: Array<{ col: number; mulok: AvailableMulok; kind: "tertulis" | "praktek" }> = [];

    for (let c = 0; c < maxCols; c++) {
      const sk = norm(sub[c]);
      if (sk !== "v1" && sk !== "v2") continue;
      const kind = sk === "v2" ? "praktek" : "tertulis";
      let subjRaw = str(top[c]).trim();
      if (!subjRaw) {
        for (let sc = c - 1; sc >= 0; sc--) {
          const val = str(top[sc]).trim();
          if (val) { subjRaw = val; break; }
        }
      }

      // Try Subject first
      const subj = subjectFromTemplateHeader(subjRaw);
      if (subj) {
        colMap.push({ col: c, subject: subj, kind });
        continue;
      }

      // Try Mulok
      const mulok = mulokFromTemplateHeader(subjRaw);
      if (mulok) {
        mulokColMap.push({ col: c, mulok, kind });
        continue;
      }
    }

    if (colMap.length === 0 && mulokColMap.length === 0) {
      return {
        rows: [],
        warnings,
        errors: ["Kolom mapel tidak ditemukan. Pastikan header mapel dan subheader V-1/V-2 ada."],
      };
    }

    const rows: NilaiUjianKelasRow[] = [];
    for (let r = vHeaderRow + 2; r < arr.length; r++) {
      const row = (arr[r] ?? []) as unknown[];
      const nama = str(worksheetValueAt(ws, r, idxNama) ?? row[idxNama]);
      const nisn = idxNisn !== -1
        ? str(worksheetValueAt(ws, r, idxNisn) ?? row[idxNisn]).replace(/^'+/, "").trim()
        : "";
      const noRaw = worksheetValueAt(ws, r, idxNo) ?? row[idxNo];
      const no = typeof noRaw === "number" ? Math.trunc(noRaw) : parseInt(str(noRaw), 10) || 0;

      const isEmpty = !nama && !nisn;
      if (isEmpty) continue;

      const values: NilaiUjianKelasRow["values"] = {};
      const mulokValues: NilaiUjianKelasRow["mulokValues"] = {};
      const rowErrors: string[] = [];
      if (!nama) rowErrors.push("Nama Siswa kosong.");
      if (!nisn && idxNisn !== -1) rowErrors.push("NISN kosong.");

      for (const m of colMap) {
        const v = clampNilaiOrNull(worksheetValueAt(ws, r, m.col) ?? row[m.col]);
        if (v !== null) {
          values[m.subject] = values[m.subject] ?? {};
          values[m.subject]![m.kind] = v;
        }
        const raw = str(worksheetValueAt(ws, r, m.col) ?? row[m.col]).trim();
        if (raw && v === null) {
          rowErrors.push(`Nilai ${m.kind === "tertulis" ? "V-1" : "V-2"} ${m.subject} tidak valid (0–100).`);
        }
      }

      for (const m of mulokColMap) {
        const v = clampNilaiOrNull(worksheetValueAt(ws, r, m.col) ?? row[m.col]);
        if (v !== null) {
          mulokValues[m.mulok] = mulokValues[m.mulok] ?? {};
          mulokValues[m.mulok]![m.kind] = v;
        }
        const raw = str(worksheetValueAt(ws, r, m.col) ?? row[m.col]).trim();
        if (raw && v === null) {
          rowErrors.push(`Nilai ${m.kind === "tertulis" ? "V-1" : "V-2"} ${m.mulok} tidak valid (0–100).`);
        }
      }

      rows.push({
        excelRow: r + 1,
        no,
        nama,
        nisn,
        kelas: "",
        values,
        mulokValues,
        kurmerValues: {},
        mulokKurmerValues: {},
        errors: rowErrors,
      });
    }
    return { rows, warnings, errors };
  }

  // ===== FALLBACK: flat header format (old) =====
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
        "Header tidak ditemukan. Pastikan file memakai template 'Nilai Ujian' dengan kolom: No, Nama Lengkap/Nama Siswa, dan subheader semester (V-1/V-2/VI-1/VI-2).",
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

    rows.push({
      excelRow: r + 1,
      no,
      nama,
      nisn,
      kelas,
      values,
      mulokValues: {},
      kurmerValues: {},
      mulokKurmerValues: {},
      errors: rowErrors,
    });
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

/**
 * Download template praktek individual (tanpa daftar siswa)
 * Template kosong untuk input nilai praktek satu siswa
 */
export function downloadTemplatePraktekExcel(
  selectedMulok: AvailableMulok[] = ["Bahasa Sunda"],
  filename = "Template-Praktek.xlsx",
) {
  const wb = XLSX.utils.book_new();

  const headerTop: (string | number)[] = ["No", "Mata Pelajaran", "Nilai"];
  const rows: (string | number)[][] = [headerTop];

  let rowNum = 1;
  for (const s of SUBJECTS) {
    rows.push([rowNum, displaySubjectTemplate(s), ""]);
    rowNum++;
  }
  for (const m of selectedMulok) {
    rows.push([rowNum, displayMulokTemplate(m), ""]);
    rowNum++;
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const ensureCell = (r: number, c: number) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    let cell = ws[addr] as XLSX.CellObject | undefined;
    if (!cell) {
      cell = { t: "s", v: "" } as XLSX.CellObject;
      ws[addr] = cell;
    }
    return cell;
  };
  const setStyle = (r: number, c: number, style: any) => {
    const cell = ensureCell(r, c);
    cell.s = style;
  };

  ws["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 12 }];
  ws["!freeze"] = { xSplit: 2, ySplit: 1 };

  const headerStyle = {
    font: { bold: true, name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    fill: { fgColor: { rgb: "CCCCCC" } },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: true },
  };
  const dataStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: false },
    numFmt: "0",
  };

  for (let c = 0; c < 3; c++) {
    setStyle(0, c, headerStyle);
  }

  for (let r = 1; r < rows.length; r++) {
    setStyle(r, 0, dataStyle);
    setStyle(r, 1, { ...dataStyle, protection: { locked: true } });
    setStyle(r, 2, dataStyle);
  }

  ws["!protect"] = {
    sheet: true,
    content: true,
    objects: false,
    scenarios: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    selectLockedCells: false,
    selectUnlockedCells: true,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  };

  XLSX.utils.book_append_sheet(wb, ws, "Praktek");
  triggerDownload(wb, filename);
}

/**
 * Download template kurmer individual (tanpa daftar siswa)
 * Template kosong untuk input nilai kurmer satu siswa
 */
export function downloadTemplateKurmerExcel(
  selectedMulok: AvailableMulok[] = ["Bahasa Sunda"],
  filename = "Template-Kurmer.xlsx",
) {
  const wb = XLSX.utils.book_new();

  const headerTop: (string | number)[] = ["No", "Mata Pelajaran", "K5-S1", "K5-S2", "K6-S1", "K6-S2"];
  const rows: (string | number)[][] = [headerTop];

  let rowNum = 1;
  for (const s of SUBJECTS) {
    rows.push([rowNum, displaySubjectTemplate(s), "", "", "", ""]);
    rowNum++;
  }
  for (const m of selectedMulok) {
    rows.push([rowNum, displayMulokTemplate(m), "", "", "", ""]);
    rowNum++;
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const ensureCell = (r: number, c: number) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    let cell = ws[addr] as XLSX.CellObject | undefined;
    if (!cell) {
      cell = { t: "s", v: "" } as XLSX.CellObject;
      ws[addr] = cell;
    }
    return cell;
  };
  const setStyle = (r: number, c: number, style: any) => {
    const cell = ensureCell(r, c);
    cell.s = style;
  };

  ws["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  ws["!freeze"] = { xSplit: 2, ySplit: 1 };

  const headerStyle = {
    font: { bold: true, name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    fill: { fgColor: { rgb: "CCCCCC" } },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: true },
  };
  const dataStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    },
    protection: { locked: false },
    numFmt: "0",
  };

  for (let c = 0; c < 6; c++) {
    setStyle(0, c, headerStyle);
  }

  for (let r = 1; r < rows.length; r++) {
    setStyle(r, 0, dataStyle);
    setStyle(r, 1, { ...dataStyle, protection: { locked: true } });
    setStyle(r, 2, dataStyle);
    setStyle(r, 3, dataStyle);
    setStyle(r, 4, dataStyle);
    setStyle(r, 5, dataStyle);
  }

  // No sheet protection for the Kurmer template so users can input values directly
  // without Excel blocking the file. Locked styling is preserved for visual guidance.

  XLSX.utils.book_append_sheet(wb, ws, "Kurmer");
  triggerDownload(wb, filename);
}

/**
 * Download template lengkap dengan multiple sheets (Identitas, Kurmer, Praktek, Ujian)
 */
export function downloadTemplateExcel(filename = "Template-Rekap-Nilai-Lengkap.xlsx") {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Identitas
  const identitasRows: (string | number)[][] = [
    ["No", "Nama Lengkap", "NISN", "No Ujian", "Jenis Kelamin (L/P)", "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Nama Ayah", "Nama Ibu"],
  ];
  for (let i = 1; i <= 50; i++) {
    identitasRows.push([i, "", "", "", "", "", "", "", ""]);
  }
  const identitasWs = XLSX.utils.aoa_to_sheet(identitasRows);
  identitasWs["!cols"] = [
    { wch: 5 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, identitasWs, "Identitas");

  // Sheet 2: Kurmer
  const kurmerHeaderTop: (string | number)[] = ["No", "NISN", "Nama"];
  for (const s of SUBJECTS) {
    kurmerHeaderTop.push(displaySubjectTemplate(s));
  }
  const kurmerRows: (string | number)[][] = [kurmerHeaderTop];
  for (let i = 1; i <= 50; i++) {
    const row: (string | number)[] = [i, "", ""];
    for (let j = 0; j < SUBJECTS.length; j++) {
      row.push("");
    }
    kurmerRows.push(row);
  }
  const kurmerWs = XLSX.utils.aoa_to_sheet(kurmerRows);
  kurmerWs["!freeze"] = { xSplit: 3, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, kurmerWs, "Kurmer");

  // Sheet 3: Praktek
  const praktekHeaderTop: (string | number)[] = ["No", "NISN", "Nama"];
  for (const s of SUBJECTS) {
    praktekHeaderTop.push(displaySubjectTemplate(s));
  }
  const praktekRows: (string | number)[][] = [praktekHeaderTop];
  for (let i = 1; i <= 50; i++) {
    const row: (string | number)[] = [i, "", ""];
    for (let j = 0; j < SUBJECTS.length; j++) {
      row.push("");
    }
    praktekRows.push(row);
  }
  const praktekWs = XLSX.utils.aoa_to_sheet(praktekRows);
  praktekWs["!freeze"] = { xSplit: 3, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, praktekWs, "Praktek");

  // Sheet 4: Ujian Tertulis
  const ujianHeaderTop: (string | number)[] = ["No", "NISN", "Nama"];
  for (const s of SUBJECTS) {
    ujianHeaderTop.push(displaySubjectTemplate(s));
  }
  const ujianRows: (string | number)[][] = [ujianHeaderTop];
  for (let i = 1; i <= 50; i++) {
    const row: (string | number)[] = [i, "", ""];
    for (let j = 0; j < SUBJECTS.length; j++) {
      row.push("");
    }
    ujianRows.push(row);
  }
  const ujianWs = XLSX.utils.aoa_to_sheet(ujianRows);
  ujianWs["!freeze"] = { xSplit: 3, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ujianWs, "Ujian Tertulis");

  triggerDownload(wb, filename);
}
