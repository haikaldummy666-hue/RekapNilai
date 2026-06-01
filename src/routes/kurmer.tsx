import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Save, Trash2, FileUp } from "lucide-react";
import { toast } from "sonner";
import { PageCard, PageHeader, EmptyStudent } from "@/components/layout/PageCard";
import { StudentSwitcher } from "@/components/layout/StudentSwitcher";
import { NilaiInput } from "@/components/forms/NilaiInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SUBJECTS, type Subject } from "@/data/subjects";
import { useActiveStudent } from "@/hooks/useActiveStudent";
import { useStudentStore } from "@/stores/studentStore";
import { useMulokStore } from "@/stores/mulokStore";
import { useAppStateStore } from "@/stores/appStateStore";
import type { NilaiKurmerRow } from "@/types/student.types";
import { Button } from "@/components/ui/button";
import { formatNilai } from "@/utils/formatUtils";
import { rataKurmerPerMapel } from "@/utils/calculateUtils";
import { 
  downloadTemplateNilaiUjianKelasExcel, 
  parseNilaiUjianKelasFromWorkbook, 
  type NilaiUjianKelasParseResult 
} from "@/utils/excelUtils";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/kurmer")({
  head: () => ({ meta: [{ title: "Raport Kurmer — Rekap Nilai MI" }] }),
  component: KurmerPage,
});

type KurmerDraft = Record<Subject, NilaiKurmerRow>;

function cloneKurmer(src: KurmerDraft): KurmerDraft {
  const out = {} as KurmerDraft;
  SUBJECTS.forEach((s) => {
    const r = src[s];
    out[s] = { k5s1: r.k5s1, k5s2: r.k5s2, k6s1: r.k6s1, k6s2: r.k6s2 };
  });
  return out;
}

function isKurmerEqual(a: KurmerDraft, b: KurmerDraft): boolean {
  for (const s of SUBJECTS) {
    const ra = a[s];
    const rb = b[s];
    if (ra.k5s1 !== rb.k5s1) return false;
    if (ra.k5s2 !== rb.k5s2) return false;
    if (ra.k6s1 !== rb.k6s1) return false;
    if (ra.k6s2 !== rb.k6s2) return false;
  }
  return true;
}

function KurmerPage() {
  const active = useActiveStudent();
  const students = useStudentStore((s) => s.students);
  const setNilai = useStudentStore((s) => s.setNilai);
  const updateKurmer = useStudentStore((s) => s.updateKurmer);
  const mulokList = useMulokStore((s) => s.config.selected);
  const getDraft = useAppStateStore((s) => s.state.routes["/kurmer"]?.drafts);
  const setRouteDraft = useAppStateStore((s) => s.setRouteDraft);
  const removeRouteDraft = useAppStateStore((s) => s.removeRouteDraft);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const baselineRef = useRef<KurmerDraft | null>(null);
  const draftRef = useRef<KurmerDraft | null>(null);
  const draftOwnerRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<KurmerDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) {
      baselineRef.current = null;
      draftRef.current = null;
      draftOwnerRef.current = null;
      setDraft(null);
      return;
    }
    const baseline = cloneKurmer(active.nilai.kurmer);
    const saved = (getDraft?.[active.id] as any) as KurmerDraft | undefined;
    const next = saved ?? baseline;
    baselineRef.current = baseline;
    draftRef.current = next;
    draftOwnerRef.current = active.id;
    setDraft(next);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Jika draft milik siswa lain (belum di-reset oleh effect), gunakan null
  // sehingga render fallback ke active.nilai langsung — tidak ada flash nilai lama
  const currentDraft = draftOwnerRef.current === active?.id ? draft : null;

  // --- EXCEL IMPORT/EXPORT LOGIC ---
  const nisnToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students) {
      const nisn = (s.identitas.nisn ?? "").trim();
      if (nisn) m.set(nisn, s.id);
    }
    return m;
  }, [students]);

  const namaToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students) {
      const nama = (s.identitas.nama ?? "").trim().toLowerCase();
      if (nama) m.set(nama, s.id);
    }
    return m;
  }, [students]);

  const findStudentId = (nisn: string, nama: string): string | undefined => {
    if (nisn) {
      const id = nisnToId.get(nisn);
      if (id) return id;
    }
    const namaKey = nama.trim().toLowerCase();
    if (namaKey) return namaToId.get(namaKey);
    return undefined;
  };

  const processNilaiKelasRows = useCallback((parsed: NilaiUjianKelasParseResult) => {
    const rows = parsed.rows;
    const invalid = rows.filter((r) => r.errors.length > 0);
    if (invalid.length > 0) {
      toast.error(`Terdapat ${invalid.length} baris invalid. Perbaiki file dan coba lagi.`);
      return;
    }
    
    const hasKurmer = rows.some((r) => Object.keys(r.kurmerValues).length > 0);
    if (!hasKurmer) {
      toast.error("File tidak mengandung format nilai kurmer (V-1, V-2, dll) yang valid.");
      return;
    }

    let matched = 0;
    let notFound = 0;
    for (const r of rows) {
      const id = findStudentId(r.nisn, r.nama);
      if (!id) {
        notFound++;
        continue;
      }
      matched++;
      for (const [subject, vals] of Object.entries(r.kurmerValues)) {
        for (const field of ["k5s1", "k5s2", "k6s1", "k6s2"] as const) {
          if (vals?.[field] !== undefined) {
            updateKurmer(id, subject as Subject, field, vals[field]!);
          }
        }
      }
    }

    if (matched === 0) {
      toast.error("Tidak ada data siswa yang cocok berdasarkan nama.");
      return;
    }
    
    toast.success(`Import selesai (${matched} siswa diperbarui)`);
    if (notFound > 0) toast.warning(`${notFound} baris siswa tidak ditemukan, dilewati`);
    
    // Clear draft if it exists so we see the fresh updated value from global store
    if (active) {
      draftOwnerRef.current = null;
      setDraft(null);
      removeRouteDraft("/kurmer", active.id);
    }
  }, [findStudentId, updateKurmer, active, removeRouteDraft]);

  const onImportNilaiKelas = useCallback(async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const parsed = parseNilaiUjianKelasFromWorkbook(wb);
      processNilaiKelasRows(parsed);
    } catch (e) {
      toast.error("Gagal membaca file Excel");
    }
  }, [processNilaiKelasRows]);
  // ---------------------------------

  const isDirty = useMemo(() => {
    if (!draft || !baselineRef.current) return false;
    return !isKurmerEqual(draft, baselineRef.current);
  }, [draft]);

  const setCell = useCallback((subject: Subject, field: keyof NilaiKurmerRow, value: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [subject]: { ...prev[subject], [field]: value } };
      draftRef.current = next;
      const owner = draftOwnerRef.current;
      if (owner) setRouteDraft("/kurmer", owner, next as any);
      return next;
    });
  }, [setRouteDraft]);

  const clearDraft = useCallback(() => {
    if (!active) return;
    const cleared = {} as KurmerDraft;
    SUBJECTS.forEach((s) => {
      cleared[s] = { k5s1: 0, k5s2: 0, k6s1: 0, k6s2: 0 };
    });
    draftOwnerRef.current = active.id;
    draftRef.current = cleared;
    setDraft(cleared);
    setRouteDraft("/kurmer", active.id, cleared as any);
    toast.success("Nilai Kurmer dibersihkan");
  }, [active, setRouteDraft]);

  const doSave = useCallback(async () => {
    if (!active) return;
    const current = draftRef.current;
    if (!current) return;

    for (const s of SUBJECTS) {
      const r = current[s];
      const vals = [r.k5s1, r.k5s2, r.k6s1, r.k6s2];
      if (vals.some((n) => Number.isNaN(n) || n < 0 || n > 100)) {
        toast.error(`Nilai ${s} harus 0–100`);
        return;
      }
    }

    setSaving(true);
    try {
      setNilai(active.id, { ...active.nilai, kurmer: current });
      baselineRef.current = current;
      removeRouteDraft("/kurmer", active.id);
      toast.success("Nilai kurmer disimpan");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyimpan nilai kurmer");
    } finally {
      setSaving(false);
    }
  }, [active, removeRouteDraft, setNilai]);

  const requestSave = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.setTimeout(() => {
      void doSave();
    }, 0);
  }, [doSave]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (!saving && isDirty) requestSave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDirty, requestSave, saving]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Raport Kurmer"
        description="Nilai Kelas 5 Semester 1 & 2, dan Kelas 6 Semester 1 & 2. Jumlah & rata-rata dihitung otomatis."
      />
      {!active ? (
        <EmptyStudent />
      ) : (
        <PageCard
          actions={
            <div className="flex items-end gap-2">
              <input
                type="file"
                className="hidden"
                accept=".xlsx"
                ref={inputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportNilaiKelas(file);
                  if (e.target) e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                className="border-dashed h-9"
                onClick={() => inputRef.current?.click()}
                title="Upload Excel Nilai Kurmer"
              >
                <FileUp className="mr-2 h-4 w-4" /> Upload
              </Button>
              <StudentSwitcher
                label="data siswa"
                showClassFilter
                showAdd={false}
                showRemove={false}
                templateDownload={{
                  label: "Download template Raport Kurmer",
                  onClick: () => {
                    const sorted = [...students].sort((a, b) => 
                      (a.identitas.nama || "").localeCompare(b.identitas.nama || "")
                    );
                    downloadTemplateNilaiUjianKelasExcel(sorted, mulokList);
                    toast.success("Template Raport Kurmer diunduh");
                  },
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  (document.activeElement as HTMLElement | null)?.blur?.();
                  clearDraft();
                }}
                aria-label="Hapus nilai Kurmer"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={requestSave}
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead className="text-center">Kls 5 Sem 1</TableHead>
                  <TableHead className="text-center">Kls 5 Sem 2</TableHead>
                  <TableHead className="text-center">Kls 6 Sem 1</TableHead>
                  <TableHead className="text-center">Kls 6 Sem 2</TableHead>
                  <TableHead className="text-center">Jumlah</TableHead>
                  <TableHead className="text-center">Rata-rata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUBJECTS.map((s, i) => {
                  const r = currentDraft?.[s] ?? active.nilai.kurmer[s];
                  const sum = r.k5s1 + r.k5s2 + r.k6s1 + r.k6s2;
                  const rata = rataKurmerPerMapel(
                    { ...active.nilai, kurmer: currentDraft ?? active.nilai.kurmer },
                    s,
                  );
                  return (
                    <TableRow key={`${active.id}-${s}`}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s}</TableCell>
                      <TableCell className="text-center">
                        <NilaiInput
                          value={r.k5s1}
                          onCommit={(v) => setCell(s, "k5s1", v)}
                          ariaLabel={`${s} Kelas 5 Sem 1`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <NilaiInput
                          value={r.k5s2}
                          onCommit={(v) => setCell(s, "k5s2", v)}
                          ariaLabel={`${s} Kelas 5 Sem 2`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <NilaiInput
                          value={r.k6s1}
                          onCommit={(v) => setCell(s, "k6s1", v)}
                          ariaLabel={`${s} Kelas 6 Sem 1`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <NilaiInput
                          value={r.k6s2}
                          onCommit={(v) => setCell(s, "k6s2", v)}
                          ariaLabel={`${s} Kelas 6 Sem 2`}
                        />
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{sum}</TableCell>
                      <TableCell className="text-center font-semibold tabular-nums text-primary">
                        {formatNilai(rata)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </PageCard>
      )}
    </div>
  );
}
