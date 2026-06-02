/**
 * Tipe data untuk Mata Pelajaran Lokal (Mulok)
 * Terdiri dari mata pelajaran pilihan yang ditambahkan secara dinamis
 */

/** Mata pelajaran lokal yang tersedia untuk dipilih */
export const AVAILABLE_MULOK = [
  "Bahasa Daerah",
  "Seni Budaya Lokal",
  "Informatika",
  "Keterampilan",
  "Olahraga Tradisional",
  "Kesenian",
  "Pertanian",
  "Perdagangan",
  "Kerajinan",
  "Tata Graha",
  "Boga",
] as const;

export type AvailableMulok = (typeof AVAILABLE_MULOK)[number];

/** Konfigurasi Mulok yang dipilih untuk kelas/sekolah */
export interface MulokConfig {
  /** Daftar mata pelajaran lokal yang dipilih */
  selected: AvailableMulok[];
  /** Waktu terakhir update */
  updatedAt: string;
}

/** Default: kosong (mulok opsional) */
export const DEFAULT_MULOK: MulokConfig = {
  selected: [],
  updatedAt: new Date().toISOString(),
};
