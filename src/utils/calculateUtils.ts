import { SUBJECTS, type Subject } from "@/data/subjects";
import type { NilaiSiswa } from "@/types/student.types";
import type { HasilAkhirRow, HasilUjianRow, Predikat } from "@/types/nilai.types";

export type NilaiFillStatus = "not started" | "in progress" | "completed";

export function rataKurmerPerMapel(nilai: NilaiSiswa, subject: Subject): number {
  const r = nilai.kurmer[subject];
  if (!r) return 0;
  return (r.k5s1 + r.k5s2 + r.k6s1) / 3;
}

export function rataUjianPerMapel(nilai: NilaiSiswa, subject: Subject): number {
  const t = nilai.ujianTertulis[subject] ?? 0;
  const p = nilai.praktek[subject] ?? 0;
  return (t + p) / 2;
}

export function nilaiAkhirPerMapel(nilai: NilaiSiswa, subject: Subject): number {
  return rataKurmerPerMapel(nilai, subject) * 0.6 + rataUjianPerMapel(nilai, subject) * 0.4;
}

export function predikatOf(nilai: number): Predikat {
  if (nilai >= 90) return "Sangat Baik";
  if (nilai >= 80) return "Baik";
  if (nilai >= 70) return "Cukup";
  return "Kurang";
}

export function buildHasilUjian(nilai: NilaiSiswa): HasilUjianRow[] {
  return SUBJECTS.map((s) => ({
    subject: s,
    tertulis: nilai.ujianTertulis[s] ?? 0,
    praktek: nilai.praktek[s] ?? 0,
    rataUjian: rataUjianPerMapel(nilai, s),
  }));
}

export function buildHasilAkhir(nilai: NilaiSiswa): HasilAkhirRow[] {
  return SUBJECTS.map((s) => {
    const na = nilaiAkhirPerMapel(nilai, s);
    return {
      subject: s,
      rataKurmer: rataKurmerPerMapel(nilai, s),
      nilaiUjian: rataUjianPerMapel(nilai, s),
      nilaiAkhir: na,
      predikat: predikatOf(na),
    };
  });
}

export function rataKeseluruhan(nilai: NilaiSiswa): number {
  const rows = buildHasilAkhir(nilai);
  if (!rows.length) return 0;
  const sum = rows.reduce((a, r) => a + r.nilaiAkhir, 0);
  return sum / rows.length;
}

export function jumlahHasilAkhir(nilai: NilaiSiswa): number {
  return buildHasilAkhir(nilai).reduce((a, r) => a + r.nilaiAkhir, 0);
}

function isFilled(n: number | undefined | null): boolean {
  if (n === undefined || n === null) return false;
  if (!Number.isFinite(n)) return false;
  return n !== 0;
}

export function nilaiFillSummary(nilai: NilaiSiswa): {
  status: NilaiFillStatus;
  filled: number;
  total: number;
  percent: number;
} {
  let total = 0;
  let filled = 0;

  for (const s of SUBJECTS) {
    const k = nilai.kurmer[s];
    total += 3;
    if (isFilled(k?.k5s1)) filled++;
    if (isFilled(k?.k5s2)) filled++;
    if (isFilled(k?.k6s1)) filled++;

    total += 1;
    if (isFilled(nilai.ujianTertulis[s])) filled++;

    total += 1;
    if (isFilled(nilai.praktek[s])) filled++;
  }

  total += 1;
  if (isFilled(nilai.peringkatKelas)) filled++;

  const status: NilaiFillStatus =
    filled === 0 ? "not started" : filled === total ? "completed" : "in progress";

  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);

  return { status, filled, total, percent };
}
