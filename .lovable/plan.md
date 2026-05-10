
# Rekap Nilai & Rapor Kelas 6 Madrasah Ibtidaiyah

Aplikasi full-stack offline-first untuk mengelola nilai siswa Kelas 6 MI dengan 13 mata pelajaran tetap, multi-siswa, Excel import/export, dan PDF rapor.

## Catatan Stack

Project ini menggunakan **TanStack Start** (bukan Vite SPA murni + React Router DOM). Saya akan tetap penuhi semua fitur, dengan penyesuaian kecil:
- Routing pakai file-based di `src/routes/` (bukan `src/pages/`). Setiap halaman tetap satu file, mudah dipahami.
- Folder lain (`stores/`, `types/`, `utils/`, `data/`, `hooks/`, `components/`) sama persis seperti spesifikasi.
- Semua logic (Zustand persist, localStorage, perhitungan, Excel, PDF) berjalan 100% di browser — tetap SPA-feel & offline-first.

## Halaman & Routing

```
src/routes/
  __root.tsx              -> Layout: Sidebar + Header + dark mode + Outlet
  index.tsx               -> Dashboard (ringkasan + progress bar rata-rata)
  identitas.tsx           -> Form identitas + preview kartu siswa
  kurmer.tsx              -> Tabel Raport Kurmer (3 semester)
  praktek.tsx             -> Input nilai Ujian Praktek
  hasil-ujian.tsx         -> Tertulis + Praktek -> Rata-rata
  hasil-akhir.tsx         -> Kurmer 60% + Ujian 40% + predikat
  skl-ijazah.tsx          -> SKL & Ijazah + peringkat (manual)
  excel-tools.tsx         -> Download template, Import, Export hasil akhir
```

## Struktur Folder Lengkap

```
src/
  components/
    ui/                   (shadcn — sudah ada)
    layout/               AppSidebar, AppHeader, PageCard, ThemeToggle, StudentSwitcher
    forms/                IdentitasForm, NilaiInput (validasi 0-100)
    tables/               DataTableKurmer, DataTablePraktek, DataTableHasilUjian,
                          DataTableHasilAkhir, DataTableSKL
  stores/
    studentStore.ts       Zustand + persist (multi-siswa, activeStudentId, CRUD)
    uiStore.ts            theme, sidebar collapsed
  types/
    student.types.ts      Student, Identitas, NilaiSiswa
    nilai.types.ts        NilaiKurmer, NilaiPraktek, NilaiUjian, Predikat
  utils/
    calculateUtils.ts     rataKurmer, rataUjian, nilaiAkhir, predikat
    excelUtils.ts         downloadTemplate, importExcel, exportHasilAkhir
    pdfUtils.ts           exportRaporPDF (jsPDF + html2canvas)
    formatUtils.ts        formatTTL, formatNilai, formatTanggal
  data/
    subjects.ts           Array 13 mapel (URUTAN TETAP, frozen)
    sampleData.ts         Data contoh (Ahmad Fauzan Hakim, MI Al-Hidayah)
  hooks/
    useActiveStudent.ts   selector + setter siswa aktif
    useAutoSave.ts        toast feedback auto-save
  lib/utils.ts            (sudah ada — cn helper)
```

## Model Data (TypeScript)

```ts
// 13 mapel TETAP, urutan tidak berubah
export const SUBJECTS = [
  'Qurdis','Akidah Akhlak','Fikih','SKI','Bahasa Arab',
  'Pendidikan Pancasila','Bahasa Indonesia','Matematika','IPAS','PJOK',
  'SBP','Bahasa Inggris','Bahasa Sunda',
] as const;

interface Identitas {
  nisn: string; noUjian: string; nama: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string; tanggalLahir: string; // ISO -> diformat saat tampil
  namaAyah: string; namaIbu: string;
}

interface NilaiSiswa {
  kurmer:  Record<Subject, { k5s1: number; k5s2: number; k6s1: number }>;
  praktek: Record<Subject, number>;
  ujianTertulis: Record<Subject, number>;
  peringkatKelas?: number;
}

interface Student { id: string; identitas: Identitas; nilai: NilaiSiswa; updatedAt: string; }
```

Store di-persist ke `localStorage` via Zustand `persist` middleware. Interface `StorageAdapter` disiapkan supaya bisa diganti ke Supabase/Firebase nanti tanpa ubah komponen.

## Rumus Perhitungan

- **Rata Kurmer per mapel** = (k5s1 + k5s2 + k6s1) / 3
- **Rata Ujian per mapel** = (tertulis + praktek) / 2
- **Nilai Akhir** = (rataKurmer × 0.6) + (rataUjian × 0.4)
- **Predikat**: ≥90 Sangat Baik · ≥80 Baik · ≥70 Cukup · <70 Kurang
- **Rata-rata keseluruhan** = mean(nilaiAkhir 13 mapel) — tampil di dashboard sebagai Progress bar

## Fitur Excel (xlsx / SheetJS)

1. **Download Template** — workbook dengan 4 sheet: Identitas, Kurmer, Praktek, Ujian. Header bold + warna emerald, 13 baris mapel sudah terisi, 1 baris contoh, kolom angka diformat.
2. **Import dari Excel** — parse semua sheet, validasi 0–100, mapping by nama mapel, masuk ke store siswa aktif (dengan konfirmasi overwrite).
3. **Export Hasil Akhir** — workbook lengkap: Identitas + Kurmer + Praktek + Hasil Ujian + Hasil Akhir + SKL. Styling: header emerald, border, freeze pane di baris header, kolom angka, predikat berwarna.

## Fitur PDF (jsPDF + html2canvas)

- Tombol **Download Rapor PDF** di Hasil Akhir & SKL.
- Render section yang sudah disiapkan (`#rapor-printable`) → canvas → multi-page A4 portrait.

## Desain (Modern Islamic Premium 2026)

- Token CSS di `src/styles.css` (oklch): `--primary` emerald-600, `--accent` gold (~oklch 0.78 0.14 85), `--gradient-primary`, `--shadow-elegant`, `--glass` (rgba + backdrop-blur).
- Dark mode default (class `dark` di `<html>` via `uiStore`), toggle di header.
- Sidebar shadcn `collapsible="icon"` dengan glassmorphism.
- Animasi 300ms ease-out di card hover & tab switch.
- Responsive: sidebar offcanvas di mobile, tabel scroll horizontal.

## Fitur Tambahan

- **StudentSwitcher** di header: dropdown daftar siswa + tombol "+ Tambah Siswa".
- **Auto-save**: setiap input langsung commit ke store (toast halus "Tersimpan").
- **Validasi** input nilai 0–100 (clamp + error state).
- **Load Data Contoh** & **Reset Semua** di halaman Identitas.
- **Dashboard** (`/`): kartu ringkasan (jumlah siswa, rata-rata akhir siswa aktif, predikat, progress bar), shortcut ke setiap halaman.

## Dependencies Baru

`zustand`, `xlsx`, `jspdf`, `html2canvas`, `lucide-react` (cek dulu — biasanya sudah terpasang). Shadcn components yang dipakai: sidebar, button, input, label, card, table, select, dropdown-menu, dialog, tabs, progress, badge, sonner (toast), tooltip.

## Urutan Implementasi

1. Install deps + setup design tokens (styles.css) + dark mode default
2. Types + data/subjects.ts + utils (calculate, format)
3. Zustand store + sample data
4. Layout: __root.tsx, AppSidebar, AppHeader, ThemeToggle, StudentSwitcher
5. Halaman Identitas (form + preview kartu)
6. Halaman Kurmer, Praktek, Hasil Ujian (tabel input real-time)
7. Halaman Hasil Akhir (perhitungan + predikat + progress)
8. Halaman SKL & Ijazah (peringkat manual + ringkasan)
9. excelUtils + halaman Excel Tools
10. pdfUtils + tombol Download PDF
11. Dashboard (index)
12. README dengan instruksi `bun install && bun dev`

Setelah disetujui, saya implementasi semuanya dan verifikasi build.
