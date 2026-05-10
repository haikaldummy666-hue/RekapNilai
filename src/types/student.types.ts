import type { Subject } from "@/data/subjects";
import type { NilaiHistoryLog } from "@/types/nilai.types";

export interface Identitas {
  nisn: string;
  noUjian: string;
  nama: string;
  jenisKelamin: "L" | "P";
  tempatLahir: string;
  /** ISO date string (yyyy-mm-dd) */
  tanggalLahir: string;
  namaAyah: string;
  namaIbu: string;
  /** Format kelas siswa, mis: 6.A, 6.B, 6.1 */
  kelas?: string;
}

export interface NilaiKurmerRow {
  k5s1: number;
  k5s2: number;
  k6s1: number;
}

export interface NilaiSiswa {
  kurmer: Record<Subject, NilaiKurmerRow>;
  praktek: Record<Subject, number>;
  ujianTertulis: Record<Subject, number>;
  peringkatKelas?: number;
}

export interface Student {
  id: string;
  identitas: Identitas;
  nilai: NilaiSiswa;
  nilaiHistory: NilaiHistoryLog;
  updatedAt: string;
}
