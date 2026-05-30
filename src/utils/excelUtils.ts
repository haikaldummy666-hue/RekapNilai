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

export function downloadTemplateNilaiUjianKelasExcel(
  students: Student[],
  filename = "Template-Nilai-Ujian-Kelas.xlsx",
  mulokList: AvailableMulok[] = ["Bahasa Sunda"],
) {
  const wb = buildNilaiUjianWorkbook(students, mulokList, false);
  const writeOptions: XLSX.WritingOptions & { cellStyles?: boolean } = {
    bookType: "xlsx",
    compression: true,
    cellStyles: true,
  };
  XLSX.writeFile(wb, filename, writeOptions);
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

  // Lock identity columns (A=0,B=1,C=2,D=3) for data rows
  for (let r = 1; r <= range.e.r; r++) {
    for (let c = 0; c <= 3; c++) {
      const cell = ensureCell(ws, r, c);
      if (!cell.s) cell.s = {};
      (cell.s as any).locked = true;
    }
  }

  // Set number format for nilai cells and leave them unlocked
  for (let r = 1; r <= range.e.r; r++) {
    for (let c = 4; c < 4 + allSubjects.length; c++) {
      const cell = ensureCell(ws, r, c);
      if (!cell.s) cell.s = {};
      delete (cell.s as any).locked;
      cell.z = "0";
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
  filename = "Template-Nilai-Ujian-Kelas.xlsx",
  mulokList: AvailableMulok[] = ["Bahasa Sunda"],
) {
  const wb = XLSX.utils.book_new();

  const headerTop: (string | number)[] = ["No", "NISN", "Nama Lengkap", "JK"];
  const headerSub: (string | number)[] = ["", "", "", ""];
  
  // Add SUBJECTS columns
  for (const s of SUBJECTS) {
    headerTop.push(displaySubjectTemplate(s), "");
    headerSub.push("V-1", "V-2");
  }
  
  // Add MULOK columns
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
    
    // Add SUBJECTS values
    for (const subj of SUBJECTS) {
      row.push(s ? s.nilai.ujianTertulis[subj] : "", s ? s.nilai.praktek[subj] : "");
    }
    
    // Add MULOK values
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

  // Removed cell comment pop-ups and data validation per user request.
  // Template will be protected so cells are not selectable/editable in Excel.

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
    // Prevent selecting locked and unlocked cells so sheet is not clickable/editable
    selectLockedCells: false,
    selectUnlockedCells: false,
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
  const looksLikeVFormat = (v: unknown) => {
    const k = norm(v);
    return k === "v1" || k === "v-1" || k === "v2" || k === "v-2";
  };

  const maxScanV = Math.min(arr.length - 1, 15);
  let vHeaderRow = -1;
  for (let i = 0; i < maxScanV; i++) {
    const row = (arr[i] ?? []) as unknown[];
    const next = (arr[i + 1] ?? []) as unknown[];
    const keys = new Set(row.map(norm));
    const hasBase =
      keys.has(norm("No")) &&
      keys.has(norm("NISN")) &&
      (keys.has(norm("Nama Lengkap")) || keys.has(norm("Nama Siswa"))) &&
      keys.has(norm("JK"));
    const nextHasV = next.some(looksLikeVFormat);
    if (hasBase && nextHasV) {
      vHeaderRow = i;
      break;
    }
  }

  if (vHeaderRow !== -1) {
    const top = (arr[vHeaderRow] ?? []) as unknown[];
    const sub = (arr[vHeaderRow + 1] ?? []) as unknown[];
    const findCol = (label: string) => top.findIndex((x) => norm(x) === norm(label));
    const idxNo = findCol("No");
    const idxNisn = findCol("NISN");
    const idxNama = findCol("Nama Lengkap") !== -1 ? findCol("Nama Lengkap") : findCol("Nama Siswa");
    const idxJk = findCol("JK");
    if ([idxNo, idxNisn, idxNama, idxJk].some((x) => x === -1)) {
      return {
        rows: [],
        warnings,
        errors: ["Header template Nilai Ujian tidak valid. Pastikan ada kolom: No, NISN, Nama Lengkap, JK."],
      };
    }

    const maxCols = Math.max(top.length, sub.length);
    const colMap: Array<{ col: number; subject: Subject; kind: "tertulis" | "praktek" }> = [];
    const mulokColMap: Array<{ col: number; mulok: AvailableMulok; kind: "tertulis" | "praktek" }> = [];
    
    for (let c = 0; c < maxCols; c++) {
      const sk = norm(sub[c]);
      if (sk !== "v1" && sk !== "v-1" && sk !== "v2" && sk !== "v-2") continue;
      const kind = sk === "v2" || sk === "v-2" ? "praktek" : "tertulis";
      const direct = str(top[c]).trim();
      const subjRaw = direct ? direct : str(top[c - 1]).trim();
      
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
      const nisn = str(worksheetValueAt(ws, r, idxNisn) ?? row[idxNisn])
        .replace(/^'+/, "")
        .trim();
      const noRaw = worksheetValueAt(ws, r, idxNo) ?? row[idxNo];
      const no = typeof noRaw === "number" ? Math.trunc(noRaw) : parseInt(str(noRaw), 10) || 0;

      const isEmpty = !nama && !nisn;
      if (isEmpty) continue;

      const values: NilaiUjianKelasRow["values"] = {};
      const mulokValues: NilaiUjianKelasRow["mulokValues"] = {};
      const rowErrors: string[] = [];
      if (!nama) rowErrors.push("Nama Siswa kosong.");
      if (!nisn) rowErrors.push("NISN kosong.");

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

      rows.push({ excelRow: r + 1, no, nama, nisn, kelas: "", values, mulokValues, errors: rowErrors });
    }
    return { rows, warnings, errors };
  }

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
