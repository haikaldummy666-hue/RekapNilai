/** Util format tampilan. */

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Format tanggal ISO ke "DD Bulan YYYY" (Bahasa Indonesia). */
export function formatTanggal(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Sukabumi, 22 Maret 2014" */
export function formatTTL(tempat: string, iso: string): string {
  const t = formatTanggal(iso);
  return tempat ? `${tempat}, ${t}` : t;
}

/** Format angka nilai 0–100 dengan 2 desimal, "-" jika kosong/NaN. */
export function formatNilai(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "-";
  return Number(n).toFixed(2);
}

/** Clamp nilai 0..100. NaN -> 0. */
export function clampNilai(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
