# Rekap Nilai & Rapor — Kelas 6 Madrasah Ibtidaiyah

Aplikasi **offline-first** untuk merekap nilai siswa Kelas 6 MI: Raport Kurmer (3 semester), Ujian Praktek, Hasil Ujian, Hasil Akhir (60/40), serta SKL & Ijazah. Mendukung **multi-siswa**, **Excel import/export**, dan **PDF rapor**.

## Fitur

- 13 mata pelajaran tetap (urutan dikunci): Qurdis, Akidah Akhlak, Fikih, SKI, Bahasa Arab, Pendidikan Pancasila, Bahasa Indonesia, Matematika, IPAS, PJOK, SBP, Bahasa Inggris, Bahasa Sunda.
- Auto-save (Zustand + localStorage), validasi nilai 0–100.
- Multi-siswa: pilih lewat dropdown di header.
- Dashboard dengan progress bar rata-rata + predikat otomatis (Sangat Baik / Baik / Cukup / Kurang).
- **Excel Tools**: Download Template · Import dari Excel · Export Hasil Akhir lengkap.
- **PDF**: Download rapor dari halaman Hasil Akhir & SKL.
- Dark mode default, glassmorphism, emerald + gold accent.

## Tech Stack

- **TanStack Start** (React 19 + Vite + file-based routing) — proyek ini menggantikan Vite SPA + React Router DOM yang ada di spesifikasi awal.
- **TypeScript strict**, **Tailwind CSS v4**, **shadcn/ui**, **Lucide React**.
- **Zustand** (`persist` middleware) sebagai database lokal.
- **xlsx** (SheetJS) untuk Excel, **jsPDF + html2canvas** untuk PDF.

## Struktur Folder

```
src/
  components/
    ui/                  shadcn components
    layout/              AppSidebar, AppHeader, ThemeToggle, StudentSwitcher, PageCard
    forms/               NilaiInput
  routes/                file-based routes (TanStack Router)
    __root.tsx           layout: Sidebar + Header + Outlet + Toaster
    index.tsx            Dashboard
    identitas.tsx        Form identitas + preview kartu
    kurmer.tsx           Raport Kurmer (3 semester)
    praktek.tsx          Ujian Praktek
    hasil-ujian.tsx      Tertulis + Praktek -> Rata-rata
    hasil-akhir.tsx      Kurmer 60% + Ujian 40% + predikat (PDF + Excel)
    skl-ijazah.tsx       SKL + peringkat manual (PDF)
    excel-tools.tsx      Template, Import, Export
  stores/                studentStore, uiStore
  types/                 student.types, nilai.types
  utils/                 calculateUtils, excelUtils, pdfUtils, formatUtils
  data/                  subjects (13 mapel), sampleData
  hooks/                 useActiveStudent, useThemeSync
```

## Rumus

- Rata Kurmer = (Kelas 5 Sem 1 + Kelas 5 Sem 2 + Kelas 6 Sem 1) / 3
- Rata Ujian = (Tertulis + Praktek) / 2
- **Nilai Akhir = Rata Kurmer × 60% + Rata Ujian × 40%**
- Predikat: ≥90 Sangat Baik · ≥80 Baik · ≥70 Cukup · <70 Kurang

## Menjalankan Lokal

```bash
bun install   # atau: npm install
bun dev       # atau: npm run dev
```

Buka http://localhost:5173.

## Deployment (Vercel)

- Build Command: `npm run build`
- Output Directory: `dist/client`
- Environment Variables (Vercel Project Settings):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_DEFAULT_ADMIN_EMAIL`
  - `VITE_DEFAULT_ADMIN_PASSWORD`
- Domain & SSL: tambahkan domain di Vercel → SSL otomatis aktif (Let’s Encrypt).

## Supabase

- Jalankan schema: copy-paste isi `supabase-schema.sql` ke Supabase SQL Editor lalu Execute.
- Authentication: aktifkan Email/Password di Supabase Auth.
- Ambil konfigurasi: Project Settings → API → `Project URL` dan `anon public key`.

## Kredensial Admin Default

- Email: `adminhaikal@rekap.data`
- Password: `haikalrekapnilai60707295`

## Roadmap (siap migrasi)

Shape data sudah didesain agar mudah dipindah ke Supabase / Firebase: cukup ganti adapter `persist` di `src/stores/studentStore.ts`, komponen tidak perlu berubah.
