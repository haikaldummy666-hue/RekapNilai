import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Download, FileDown, FileUp, Users } from "lucide-react";
import { toast } from "sonner";
import { PageCard, PageHeader, EmptyStudent } from "@/components/layout/PageCard";
import { Button } from "@/components/ui/button";
import { useActiveStudent } from "@/hooks/useActiveStudent";
import { useStudentStore } from "@/stores/studentStore";
import type { Subject } from "@/data/subjects";
import {
  downloadTemplateExcel,
  downloadTemplateNilaiUjianKelasExcel,
  downloadTemplateSiswaExcel,
  exportHasilAkhirExcel,
  importFromExcel,
  importNilaiUjianKelasFromExcel,
  importStudentListFromExcel,
  type NilaiUjianKelasParseResult,
} from "@/utils/excelUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/excel-tools")({
  head: () => ({ meta: [{ title: "Excel Tools — Rekap Nilai MI" }] }),
  component: ExcelToolsPage,
});

function ExcelToolsPage() {
  const active = useActiveStudent();
  const students = useStudentStore((s) => s.students);
  const setNilai = useStudentStore((s) => s.setNilai);
  const updateIdentitas = useStudentStore((s) => s.updateIdentitas);
  const addStudentsBulk = useStudentStore((s) => s.addStudentsBulk);
  const applyUjianKelasBulk = useStudentStore((s) => s.applyUjianKelasBulk);
  const exportSnapshot = useStudentStore((s) => s.exportSnapshot);
  const importSnapshot = useStudentStore((s) => s.importSnapshot);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputSiswaRef = useRef<HTMLInputElement>(null);
  const inputBackupRef = useRef<HTMLInputElement>(null);
  const inputNilaiKelasRef = useRef<HTMLInputElement>(null);
  const [nilaiKelasPreview, setNilaiKelasPreview] = useState<NilaiUjianKelasParseResult | null>(
    null,
  );

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    if (!active) {
      toast.error("Pilih atau tambahkan siswa terlebih dahulu.");
      return;
    }
    try {
      const result = await importFromExcel(file);
      if (!confirm("Impor akan menimpa data nilai siswa aktif. Lanjutkan?")) return;
      setNilai(active.id, result.nilai);
      if (result.identitas) updateIdentitas(active.id, result.identitas);
      result.warnings.forEach((w) => toast.warning(w));
      toast.success("Data berhasil diimpor dari Excel");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Gagal membaca file Excel");
    }
  };

  const onImportSiswa = async (file: File) => {
    try {
      const result = await importStudentListFromExcel(file);
      result.warnings.forEach((w) => toast.warning(w));

      if (result.students.length === 0) {
        toast.error("Tidak ada data siswa yang bisa diimpor.");
        return;
      }

      const existingNisn = new Set(students.map((s) => s.identitas.nisn).filter(Boolean));
      const existingNoUjian = new Set(students.map((s) => s.identitas.noUjian).filter(Boolean));

      let skipped = 0;
      const toAdd = result.students.filter((s) => {
        const nisn = (s.nisn ?? "").trim();
        const noUjian = (s.noUjian ?? "").trim();
        const dup = (nisn && existingNisn.has(nisn)) || (noUjian && existingNoUjian.has(noUjian));
        if (dup) {
          skipped++;
          return false;
        }
        if (nisn) existingNisn.add(nisn);
        if (noUjian) existingNoUjian.add(noUjian);
        return true;
      });

      if (toAdd.length === 0) {
        toast.error("Semua baris terdeteksi duplikat. Tidak ada yang ditambahkan.");
        return;
      }

      const extra = skipped > 0 ? ` (${skipped} duplikat dilewati)` : "";
      if (!confirm(`Impor akan menambahkan ${toAdd.length} siswa${extra}. Lanjutkan?`)) return;

      addStudentsBulk(toAdd);
      toast.success(`Berhasil menambahkan ${toAdd.length} siswa`);
      if (skipped > 0) toast.warning(`${skipped} baris duplikat dilewati`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Gagal membaca file Excel");
    }
  };

  const nisnToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students) {
      const nisn = (s.identitas.nisn ?? "").trim();
      if (nisn) m.set(nisn, s.id);
    }
    return m;
  }, [students]);

  const onImportNilaiKelas = async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx")) {
      toast.error("Format file harus .xlsx");
      return;
    }
    try {
      const parsed = await importNilaiUjianKelasFromExcel(file);
      parsed.warnings.forEach((w) => toast.warning(w));
      if (parsed.errors.length > 0) {
        parsed.errors.forEach((e) => toast.error(e));
        setNilaiKelasPreview(parsed);
        return;
      }
      if (parsed.rows.length === 0) {
        toast.error("Tidak ada baris nilai yang bisa diproses.");
        setNilaiKelasPreview(parsed);
        return;
      }
      setNilaiKelasPreview(parsed);
      toast.success("Preview import siap. Periksa lalu terapkan.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Gagal membaca file Excel");
    }
  };

  const applyPreviewNilaiKelas = () => {
    if (!nilaiKelasPreview) return;
    const rows = nilaiKelasPreview.rows;
    if (nilaiKelasPreview.errors.length > 0) {
      toast.error("Perbaiki error struktur file sebelum menerapkan.");
      return;
    }
    const invalid = rows.filter((r) => r.errors.length > 0);
    if (invalid.length > 0) {
      toast.error(`Terdapat ${invalid.length} baris invalid. Perbaiki dulu sebelum menerapkan.`);
      return;
    }

    const updates: Array<{
      id: string;
      ujianTertulis: Partial<Record<Subject, number>>;
      praktek: Partial<Record<Subject, number>>;
    }> = [];
    let notFound = 0;
    for (const r of rows) {
      const id = nisnToId.get(r.nisn);
      if (!id) {
        notFound++;
        continue;
      }
      const ujianTertulis: Partial<Record<Subject, number>> = {};
      const praktek: Partial<Record<Subject, number>> = {};
      for (const subject of Object.keys(r.values) as Subject[]) {
        const v = r.values[subject];
        if (v?.tertulis !== undefined) ujianTertulis[subject] = v.tertulis;
        if (v?.praktek !== undefined) praktek[subject] = v.praktek;
      }
      updates.push({ id, ujianTertulis, praktek });
    }

    if (updates.length === 0) {
      toast.error("Tidak ada siswa yang cocok (berdasarkan NISN).");
      return;
    }
    const extra = notFound > 0 ? ` (${notFound} baris NISN tidak cocok dilewati)` : "";
    if (
      !confirm(
        `Impor akan memperbarui nilai ujian untuk ${updates.length} siswa${extra}. Lanjutkan?`,
      )
    )
      return;

    const result = applyUjianKelasBulk(
      updates.map((u) => ({ id: u.id, ujianTertulis: u.ujianTertulis, praktek: u.praktek })),
    );
    toast.success(`Import selesai (${result.updated} siswa diperbarui)`);
    if (result.skipped > 0) toast.message(`${result.skipped} siswa tidak berubah`);
    if (notFound > 0) toast.warning(`${notFound} baris NISN tidak ditemukan, dilewati`);
    setNilaiKelasPreview(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Excel Tools"
        description="Unduh template, impor data (nilai & siswa) dari Excel, atau ekspor hasil akhir lengkap."
      />

      <div className="mb-6 rounded-2xl border border-border bg-muted/10 p-4 text-sm">
        <p className="font-medium">Panduan File Excel</p>
        <p className="mt-1 text-muted-foreground">
          Untuk upload siswa bulk, gunakan Template Siswa. Kolom NISN sudah diset Text agar leading
          zero tidak hilang, dan kolom Tanggal Lahir sudah diset YYYY-MM-DD agar mudah diparse.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ToolCard
          icon={<FileDown className="h-6 w-6" />}
          title="Backup Data (JSON)"
          desc="Unduh semua data siswa & nilai untuk backup/migrasi (cocok untuk persiapan database)."
          action={
            <Button
              variant="outline"
              onClick={() => {
                downloadJson(exportSnapshot(), "Backup-Rekap-Nilai-MI.json");
                toast.success("Backup JSON diunduh");
              }}
            >
              <FileDown className="mr-2 h-4 w-4" /> Unduh Backup
            </Button>
          }
        />

        <ToolCard
          icon={<FileUp className="h-6 w-6" />}
          title="Restore Data (JSON)"
          desc="Impor file backup JSON untuk mengembalikan data. Impor akan menimpa data saat ini."
          action={
            <>
              <input
                ref={inputBackupRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    const txt = await f.text();
                    const parsed = JSON.parse(txt) as unknown;
                    if (!confirm("Restore akan menimpa data saat ini. Lanjutkan?")) return;
                    const result = importSnapshot(parsed, "replace");
                    if (result.added === 0) {
                      toast.error("File backup tidak valid atau kosong.");
                      return;
                    }
                    toast.success(`Restore selesai (${result.added} siswa)`);
                  } catch (err) {
                    console.error(err);
                    toast.error("Gagal membaca file backup");
                  }
                }}
              />
              <Button variant="outline" onClick={() => inputBackupRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" /> Pilih File
              </Button>
            </>
          }
        />

        <ToolCard
          icon={<Users className="h-6 w-6" />}
          title="Download Template Siswa"
          desc="File .xlsx untuk upload daftar siswa sekaligus (Identitas per baris)."
          action={
            <Button
              className="bg-gradient-primary text-primary-foreground"
              onClick={() => {
                downloadTemplateSiswaExcel();
                toast.success("Template siswa diunduh");
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Unduh Template
            </Button>
          }
        />

        <ToolCard
          icon={<Users className="h-6 w-6" />}
          title="Import Daftar Siswa"
          desc="Pilih file template siswa yang sudah diisi. Siswa baru akan ditambahkan (duplikat dilewati)."
          action={
            <>
              <input
                ref={inputSiswaRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportSiswa(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" onClick={() => inputSiswaRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" /> Pilih File
              </Button>
            </>
          }
        />

        <ToolCard
          icon={<FileDown className="h-6 w-6" />}
          title="Download Template Nilai Ujian (Kelas)"
          desc="Template .xlsx untuk input nilai Ujian Tertulis & Praktek semua siswa (berdasarkan NISN)."
          action={
            <Button
              className="bg-gradient-primary text-primary-foreground"
              onClick={() => {
                downloadTemplateNilaiUjianKelasExcel(students);
                toast.success("Template nilai ujian diunduh");
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Unduh Template
            </Button>
          }
        />

        <ToolCard
          icon={<FileUp className="h-6 w-6" />}
          title="Upload Nilai Ujian (Kelas)"
          desc="Upload file template nilai ujian (.xlsx). Ada preview sebelum diterapkan."
          action={
            <>
              <input
                ref={inputNilaiKelasRef}
                type="file"
                accept=".xlsx"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportNilaiKelas(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" onClick={() => inputNilaiKelasRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" /> Pilih File
              </Button>
            </>
          }
        />

        <ToolCard
          icon={<FileDown className="h-6 w-6" />}
          title="Download Template"
          desc="File .xlsx dengan 13 mapel siap diisi (Identitas, Kurmer, Praktek, Ujian)."
          action={
            <Button
              className="bg-gradient-primary text-primary-foreground"
              onClick={() => {
                downloadTemplateExcel();
                toast.success("Template diunduh");
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Unduh Template
            </Button>
          }
        />

        <ToolCard
          icon={<FileUp className="h-6 w-6" />}
          title="Import dari Excel"
          desc="Pilih file template yang sudah diisi. Data akan masuk ke siswa aktif."
          action={
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" /> Pilih File
              </Button>
            </>
          }
        />

        <ToolCard
          icon={<Download className="h-6 w-6" />}
          title="Download Hasil Akhir"
          desc="Workbook lengkap: Identitas, Kurmer, Praktek, Hasil Ujian, Hasil Akhir, SKL."
          action={
            <Button
              className="bg-gradient-gold text-gold-foreground"
              disabled={!active}
              onClick={() => {
                if (!active) return;
                exportHasilAkhirExcel(active);
                toast.success("Hasil akhir diunduh");
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Unduh Hasil
            </Button>
          }
        />
      </div>

      {!active && (
        <div className="mt-6">
          <EmptyStudent />
        </div>
      )}

      {nilaiKelasPreview ? (
        <PageCard
          className="mt-6"
          title="Preview Import Nilai Ujian (Kelas)"
          description={`Baris terbaca: ${nilaiKelasPreview.rows.length} · Error struktur: ${nilaiKelasPreview.errors.length}`}
          actions={
            <>
              <Button variant="outline" onClick={() => setNilaiKelasPreview(null)}>
                Batalkan
              </Button>
              <Button
                className="bg-gradient-primary text-primary-foreground"
                onClick={applyPreviewNilaiKelas}
              >
                Terapkan Import
              </Button>
            </>
          }
        >
          {nilaiKelasPreview.errors.length > 0 ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Error Struktur Template</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {nilaiKelasPreview.errors.slice(0, 8).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 overflow-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">Baris</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-[160px]">NISN</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nilaiKelasPreview.rows.slice(0, 30).map((r) => {
                  const ok = r.errors.length === 0;
                  return (
                    <TableRow key={`${r.excelRow}-${r.nisn}`}>
                      <TableCell className="font-medium tabular-nums">{r.excelRow}</TableCell>
                      <TableCell>{r.nama}</TableCell>
                      <TableCell className="tabular-nums">{r.nisn}</TableCell>
                      <TableCell className={ok ? "text-success" : "text-destructive"}>
                        {ok ? "OK" : `${r.errors.length} error`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {nilaiKelasPreview.rows.some((r) => r.errors.length > 0) ? (
            <div className="mt-4 rounded-xl border border-border bg-muted/10 p-3 text-sm">
              <p className="font-medium">Contoh Error</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {nilaiKelasPreview.rows
                  .filter((r) => r.errors.length > 0)
                  .slice(0, 3)
                  .flatMap((r) => r.errors.slice(0, 2).map((e) => `Baris ${r.excelRow}: ${e}`))
                  .map((t) => (
                    <li key={t}>{t}</li>
                  ))}
              </ul>
            </div>
          ) : null}
        </PageCard>
      ) : null}

      <PageCard className="mt-6" title="Petunjuk">
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            Untuk input daftar siswa sekaligus: klik <b>Unduh Template Siswa</b>, isi per baris,
            lalu gunakan <b>Import Daftar Siswa</b>.
          </li>
          <li>
            Klik <b>Unduh Template</b> untuk mendapatkan file kosong dengan struktur yang benar.
          </li>
          <li>
            Isi nilai pada sheet <i>Kurmer</i>, <i>Praktek</i>, <i>Ujian</i>, dan data diri di sheet{" "}
            <i>Identitas</i>.
          </li>
          <li>
            Pastikan sudah ada siswa aktif (pojok kanan atas), lalu klik <b>Pilih File</b> untuk
            impor.
          </li>
          <li>
            Setelah data lengkap, gunakan <b>Unduh Hasil</b> untuk mendapatkan rekap final lengkap
            dengan perhitungan otomatis.
          </li>
          <li>
            Untuk input nilai ujian kelas sekaligus: unduh <b>Template Nilai Ujian (Kelas)</b>, isi
            kolom nilai (yang bisa diedit), lalu upload dan cek preview sebelum menerapkan.
          </li>
        </ol>
      </PageCard>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="glass flex flex-col rounded-2xl p-5 shadow-soft transition-base hover:-translate-y-0.5 hover:shadow-elegant">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}
