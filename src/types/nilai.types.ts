import type { Subject } from "@/data/subjects";

export type Predikat = "Sangat Baik" | "Baik" | "Cukup" | "Kurang";

export interface HasilUjianRow {
  subject: Subject;
  tertulis: number;
  praktek: number;
  rataUjian: number;
}

export interface HasilAkhirRow {
  subject: Subject;
  rataKurmer: number;
  nilaiUjian: number;
  nilaiAkhir: number;
  predikat: Predikat;
}
