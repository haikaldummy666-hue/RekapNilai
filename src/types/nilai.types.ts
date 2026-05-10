import type { Subject } from "@/data/subjects";

export type Predikat = "Sangat Baik" | "Baik" | "Cukup" | "Kurang";

export interface NilaiHistoryEntry {
  timestamp: string; // ISO date string
  type: "kurmer" | "praktek" | "ujianTertulis" | "peringkat";
  subject?: Subject;
  field?: "k5s1" | "k5s2" | "k6s1";
  oldValue: number | undefined;
  newValue: number | undefined;
}

export interface NilaiHistoryLog {
  entries: NilaiHistoryEntry[];
}

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
