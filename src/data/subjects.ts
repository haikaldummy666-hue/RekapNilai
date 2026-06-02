/**
 * 13 Mata Pelajaran Kelas 6 MI — URUTAN TETAP, TIDAK BOLEH BERUBAH.
 * Frozen agar tidak ada mutasi tak sengaja di runtime.
 */
export const SUBJECTS = Object.freeze([
  "Qurdis",
  "Akidah Akhlak",
  "Fikih",
  "SKI",
  "Bahasa Arab",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "IPAS",
  "PJOK",
  "SBP",
  "Bahasa Inggris",
  "Bahasa Sunda",
] as const);

export type Subject = (typeof SUBJECTS)[number];
