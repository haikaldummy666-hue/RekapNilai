import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, LoaderCircle, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageCard, PageHeader, EmptyStudent } from "@/components/layout/PageCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useActiveStudent } from "@/hooks/useActiveStudent";
import { useStudentStore } from "@/stores/studentStore";
import { useAppStateStore } from "@/stores/appStateStore";
import { formatTTL } from "@/utils/formatUtils";
import type { Identitas } from "@/types/student.types";
import { StudentSwitcher } from "@/components/layout/StudentSwitcher";
import { downloadTemplateSiswaExcel, importStudentListFromExcel } from "@/utils/excelUtils";

export const Route = createFileRoute("/identitas")({
  head: () => ({ meta: [{ title: "Identitas Siswa — Rekap Nilai MI" }] }),
  component: IdentitasPage,
});

const KELAS_OPTIONS = [
  "6.A", "6.B", "6.C", "6.D",
  "6.1", "6.2", "6.3", "6.4",
  "6-A", "6-B", "6-C", "6-D",
  "6-1", "6-2", "6-3", "6-4",
];

const IdentitasSchema = z.object({
  nisn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{8,12}$/.test(v), "NISN harus angka 8–12 digit"),
  noUjian: z.string().trim(),
  nama: z.string().trim().min(1, "Nama lengkap wajib diisi"),
  jenisKelamin: z.enum(["L", "P"]),
  tempatLahir: z.string().trim(),
  tanggalLahir: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Tanggal lahir harus format YYYY-MM-DD",
    ),
  namaAyah: z.string().trim(),
  namaIbu: z.string().trim(),
  kelas: z.string().trim().optional().or(z.literal("")),
});


function IdentitasPage() {
  const active = useActiveStudent();
  const students = useStudentStore((s) => s.students);
  const update = useStudentStore((s) => s.updateIdentitas);
  const resetActive = useStudentStore((s) => s.resetActive);
  const addStudent = useStudentStore((s) => s.addStudent);
  const addStudentsBulk = useStudentStore((s) => s.addStudentsBulk);
  const inputSiswaRef = useRef<HTMLInputElement>(null);

  const baselineRef = useRef<Identitas | null>(null);
  const draftRef = useRef<Identitas | null>(null);
  const draftOwnerRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<Identitas | null>(null);
  const [saving, setSaving] = useState(false);
  const getDraft = useAppStateStore((s) => s.state.routes["/identitas"]?.drafts);
  const setRouteDraft = useAppStateStore((s) => s.setRouteDraft);
  const removeRouteDraft = useAppStateStore((s) => s.removeRouteDraft);

  useEffect(() => {
    if (!active) {
      baselineRef.current = null;
      draftRef.current = null;
      draftOwnerRef.current = null;
      setDraft(null);
      return;
    }
    const saved = (getDraft?.[active.id] as any) as Identitas | undefined;
    const next = saved ?? active.identitas;
    baselineRef.current = active.identitas;
    draftRef.current = next;
    draftOwnerRef.current = active.id;
    setDraft(next);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps


  const isDirty = useMemo(() => {
    if (!draft || !baselineRef.current) return false;
    return JSON.stringify(draft) !== JSON.stringify(baselineRef.current);
  }, [draft]);

  const setField = useCallback((patch: Partial<Identitas>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      draftRef.current = next;
      const owner = draftOwnerRef.current;
      if (owner) setRouteDraft("/identitas", owner, next as any);
      return next;
    });
  }, [setRouteDraft]);

  const save = useCallback(async () => {
    if (!active) return;
    const current = draftRef.current;
    if (!current) return;
    const parsed = IdentitasSchema.safeParse(current);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Data identitas belum valid");
      return;
    }

    const nisn = parsed.data.nisn.trim();
    if (nisn) {
      const dup = students.find((s) => s.id !== active.id && s.identitas.nisn.trim() === nisn);
      if (dup) {
        toast.error(`NISN sudah dipakai oleh ${dup.identitas.nama || "siswa lain"}`);
        return;
      }
    }
    const noUjian = parsed.data.noUjian.trim();
    if (noUjian) {
      const dup = students.find(
        (s) => s.id !== active.id && s.identitas.noUjian.trim() === noUjian,
      );
      if (dup) {
        toast.error(`No Ujian sudah dipakai oleh ${dup.identitas.nama || "siswa lain"}`);
        return;
      }
    }

    setSaving(true);
    try {
      update(active.id, parsed.data);
      baselineRef.current = parsed.data;
      draftRef.current = parsed.data;
      removeRouteDraft("/identitas", active.id);
      toast.success("Identitas disimpan");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyimpan identitas");
    } finally {
      setSaving(false);
    }
  }, [active, removeRouteDraft, students, update]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (!saving && isDirty) void save();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDirty, save, saving]);

  const onImportSiswa = useCallback(
    async (file: File) => {
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
    },
    [addStudentsBulk, students],
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Identitas Siswa"
        description="Lengkapi data identitas siswa. Gunakan tombol Simpan (Ctrl+S) untuk menyimpan perubahan."
        actions={
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
            <Button
              variant="outline"
              onClick={() => {
                downloadTemplateSiswaExcel();
                toast.success("Template siswa diunduh");
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Template Siswa
            </Button>
            <Button variant="outline" onClick={() => inputSiswaRef.current?.click()}>
              <Users className="mr-2 h-4 w-4" /> Upload Siswa
            </Button>
            <Button variant="outline" onClick={() => addStudent()}>
              + Siswa Baru
            </Button>
            {active && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Reset semua nilai siswa aktif?")) {
                    resetActive();
                    toast.success("Nilai direset");
                  }
                }}
              >
                Reset Nilai
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 rounded-2xl border border-border bg-muted/10 p-4 text-sm">
        <p className="font-medium">Panduan Upload Siswa</p>
        <p className="mt-1 text-muted-foreground">
          Gunakan tombol Template Siswa lalu copy-paste data. Kolom NISN sudah diset sebagai Text
          dan Tanggal Lahir sebagai YYYY-MM-DD. Jika muncul peringatan leading zero, pastikan NISN
          tidak berubah menjadi angka.
        </p>
      </div>

      {!active ? (
        <EmptyStudent />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <PageCard
            title="Data Diri"
            actions={
              <div className="flex items-end gap-2">
                <StudentSwitcher label="data siswa" showClassFilter />
                <Button
                  onClick={save}
                  disabled={!isDirty || saving}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Menyimpan…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Simpan
                    </>
                  )}
                </Button>
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="NISN">
                <Input
                  value={draft?.nisn ?? ""}
                  onChange={(e) => setField({ nisn: e.target.value })}
                  placeholder="0123456789"
                />
              </Field>
              <Field label="No Ujian">
                <Input
                  value={draft?.noUjian ?? ""}
                  onChange={(e) => setField({ noUjian: e.target.value })}
                  placeholder="06-001-001"
                />
              </Field>
              <Field label="Nama Lengkap" className="sm:col-span-2">
                <Input
                  value={draft?.nama ?? ""}
                  onChange={(e) => setField({ nama: e.target.value })}
                  placeholder="Nama Lengkap"
                />
              </Field>
              <Field label="Jenis Kelamin">
                <Select
                  value={draft?.jenisKelamin ?? "L"}
                  onValueChange={(v) => setField({ jenisKelamin: v as "L" | "P" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tempat Lahir">
                <Input
                  value={draft?.tempatLahir ?? ""}
                  onChange={(e) => setField({ tempatLahir: e.target.value })}
                  placeholder="Sukabumi"
                />
              </Field>
              <Field label="Tanggal Lahir" className="sm:col-span-2">
                <Input
                  type="date"
                  value={draft?.tanggalLahir ?? ""}
                  onChange={(e) => setField({ tanggalLahir: e.target.value })}
                />
              </Field>
              <Field label="Nama Ayah">
                <Input
                  value={draft?.namaAyah ?? ""}
                  onChange={(e) => setField({ namaAyah: e.target.value })}
                />
              </Field>
              <Field label="Nama Ibu">
                <Input
                  value={draft?.namaIbu ?? ""}
                  onChange={(e) => setField({ namaIbu: e.target.value })}
                />
              </Field>
              <Field label="Kelas" className="sm:col-span-2">
                <Select
                  value={draft?.kelas?.trim() || "__none__"}
                  onValueChange={(v) => setField({ kelas: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Belum ditentukan —</SelectItem>
                    {KELAS_OPTIONS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Digunakan untuk filter siswa di halaman pengisian nilai.
                </p>
              </Field>
            </div>
          </PageCard>

          {/* Preview kartu */}
          <PageCard title="Kartu Siswa">
            <div className="overflow-hidden rounded-2xl border border-border bg-gradient-hero p-6 text-white shadow-elegant">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80">
                    Madrasah Ibtidaiyah
                  </p>
                  <p className="text-sm font-semibold">Kartu Identitas Siswa</p>
                </div>
                <div className="rounded-full bg-gradient-gold px-3 py-1 text-xs font-bold text-gold-foreground shadow-soft">
                  {active.identitas.kelas ? `Kelas ${active.identitas.kelas}` : "Kelas 6"}
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <Row k="Nama" v={active.identitas.nama || "—"} />
                <Row k="NISN" v={active.identitas.nisn || "—"} />
                <Row k="No Ujian" v={active.identitas.noUjian || "—"} />
                <Row
                  k="Jenis Kelamin"
                  v={active.identitas.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                />
                <Row
                  k="TTL"
                  v={formatTTL(active.identitas.tempatLahir, active.identitas.tanggalLahir)}
                />
                <Row k="Ayah" v={active.identitas.namaAyah || "—"} />
                <Row k="Ibu" v={active.identitas.namaIbu || "—"} />
                {active.identitas.kelas && (
                  <Row k="Kelas" v={active.identitas.kelas} />
                )}
              </div>
            </div>
          </PageCard>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-sm">
      <span className="opacity-75">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
