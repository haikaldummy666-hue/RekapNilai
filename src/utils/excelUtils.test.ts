import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseNilaiUjianKelasFromWorkbook, parseStudentListFromWorkbook } from "./excelUtils";
import { setStudentStoreTenant, useStudentStore } from "../stores/studentStore";
import { SUBJECTS } from "@/data/subjects";

describe("importStudentListFromExcel", () => {
  it("keeps NISN leading zero when stored as string", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
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
      [1, "Siswa A", "0012345678", "06-001-001", "L", "Kota", "2014-03-22", "Ayah", "Ibu"],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");

    const res = parseStudentListFromWorkbook(wb);
    expect(res.students).toHaveLength(1);
    expect(res.students[0]!.nisn).toBe("0012345678");
  });

  it("uses formatted cell text (cell.w) for numeric NISN to preserve leading zero when available", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
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
      [1, "Siswa B", 12345, "06-001-002", "P", "Kota", "2014-03-22", "Ayah", "Ibu"],
    ]);
    ws["C2"] = { t: "n", v: 12345, w: "0000012345" } as XLSX.CellObject;
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");

    const res = parseStudentListFromWorkbook(wb);
    expect(res.students).toHaveLength(1);
    expect(res.students[0]!.nisn).toBe("0000012345");
  });

  it("parses various tanggal lahir formats into ISO yyyy-mm-dd", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
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
      [1, "Siswa C", "11111111", "06-001-003", "L", "Kota", "22/03/2014", "Ayah", "Ibu"],
      [2, "Siswa D", "22222222", "06-001-004", "L", "Kota", "22-03-2014", "Ayah", "Ibu"],
      [3, "Siswa E", "33333333", "06-001-005", "L", "Kota", "2014-03-22", "Ayah", "Ibu"],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");

    const res = parseStudentListFromWorkbook(wb);
    expect(res.students).toHaveLength(3);
    expect(res.students[0]!.tanggalLahir).toBe("2014-03-22");
    expect(res.students[1]!.tanggalLahir).toBe("2014-03-22");
    expect(res.students[2]!.tanggalLahir).toBe("2014-03-22");
  });
});

describe("studentStore addStudentsBulk", () => {
  it("exists and can add multiple students", () => {
    useStudentStore.setState({ students: [], activeId: null });
    const ids = useStudentStore.getState().addStudentsBulk([{ nama: "A" }, { nama: "B" }]);
    expect(ids).toHaveLength(2);
    expect(useStudentStore.getState().students).toHaveLength(2);
  });

  it("still exists after setStudentStoreTenant()", () => {
    setStudentStoreTenant("test-tenant");
    expect(typeof useStudentStore.getState().addStudentsBulk).toBe("function");
  });

  it("applyUjianKelasBulk can update values in one call", () => {
    setStudentStoreTenant("test-tenant-2");
    useStudentStore.setState({ students: [], activeId: null });
    const st = useStudentStore.getState();
    const [id] = st.addStudentsBulk([{ nama: "A", nisn: "001" }]);
    const subject = SUBJECTS[0]!;
    const res = st.applyUjianKelasBulk([
      { id: id!, ujianTertulis: { [subject]: 77 }, praktek: { [subject]: 88 } },
    ]);
    expect(res.updated).toBe(1);
    const s = useStudentStore.getState().students.find((x) => x.id === id)!;
    expect(s.nilai.ujianTertulis[subject]).toBe(77);
    expect(s.nilai.praktek[subject]).toBe(88);
  });
});

describe("parseNilaiUjianKelasFromWorkbook", () => {
  it("parses nilai ujian kelas rows and clamps values to 0-100", () => {
    const header = [
      "No",
      "Nama Siswa",
      "NISN",
      "Kelas",
      ...SUBJECTS.flatMap((s) => [`${s} - Tertulis`, `${s} - Praktek`]),
    ];
    const row1 = [
      1,
      "Siswa A",
      "0012345678",
      "6",
      ...SUBJECTS.flatMap((s) => (s === SUBJECTS[0] ? [120, -5] : ["", ""])),
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, row1]);
    XLSX.utils.book_append_sheet(wb, ws, "Nilai Ujian");

    const res = parseNilaiUjianKelasFromWorkbook(wb);
    expect(res.errors).toHaveLength(0);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.nisn).toBe("0012345678");
    const first = SUBJECTS[0]!;
    expect(res.rows[0]!.values[first]!.tertulis).toBe(100);
    expect(res.rows[0]!.values[first]!.praktek).toBe(0);
  });

  it("returns error when required columns are missing", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["No", "Nama Siswa", "NISN", "Kelas"],
      [1, "A", "1", "6"],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Nilai Ujian");

    const res = parseNilaiUjianKelasFromWorkbook(wb);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
