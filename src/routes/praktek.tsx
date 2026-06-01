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
import { Button } from "@/components/ui/button";
import { SUBJECTS, type Subject } from "@/data/subjects";
import { useActiveStudent } from "@/hooks/useActiveStudent";
import { useStudentStore } from "@/stores/studentStore";
import { useAppStateStore } from "@/stores/appStateStore";
import { formatNilai } from "@/utils/formatUtils";
import { 
  downloadTemplateNilaiTunggalKelasExcel,
  parseNilaiTunggalKelasFromWorkbook,
  type NilaiTunggalKelasParseResult
} from "@/utils/excelUtils";
import * as XLSX from "xlsx";
import { useMulokStore } from "@/stores/mulokStore";

export const Route = createFileRoute("/praktek")({
  head: () => ({ meta: [{ title: "Ujian Praktek — Rekap Nilai MI" }] }),
  component: PraktekPage,
});

type PraktekDraft = Record<Subject, number>;

function clonePraktek(src: PraktekDraft): PraktekDraft {
  const out = {} as PraktekDraft;
  SUBJECTS.forEach((s) => (out[s] = src[s] ?? 0));
  return out;
}

function isPraktekEqual(a: PraktekDraft, b: PraktekDraft): boolean {
  for (const s of SUBJECTS) {
    if ((a[s] ?? 0) !== (b[s] ?? 0)) return false;
  }
  return true;
}

function PraktekPage() {
  const active = useActiveStudent();
  const students = useStudentStore((s) => s.students);
  const setNilai = useStudentStore((s) => s.setNilai);
  const updatePraktek = useStudentStore((s) => s.updatePraktek);
  const updatePraktekMulok = useStudentStore((s) => s.updatePraktekMulok);
  const mulokList = useMulokStore((s) => s.config.selected);
  const getDraft = useAppStateStore((s) => s.state.routes["/praktek"]?.drafts);
  const setRouteDraft = useAppStateStore((s) => s.setRouteDraft);
  const removeRouteDraft = useAppStateStore((s) => s.removeRouteDraft);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const baselineRef = useRef<PraktekDraft | null>(null);
  const draftRef = useRef<PraktekDraft | null>(null);
  const draftOwnerRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<PraktekDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) {
      baselineRef.current = null;
      draftRef.current = null;
      draftOwnerRef.current = null;
      setDraft(null);
      return;
    }
    const baseline = clonePraktek(active.nilai.praktek);
    const saved = (getDraft?.[active.id] as any) as PraktekDraft | undefined;
    const next = saved ?? baseline;
    baselineRef.current = baseline;
    draftRef.current = next;
    draftOwnerRef.current = active.id;
    setDraft(next);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const processPraktekRows = useCallback((parsed: NilaiTunggalKelasParseResult) => {
    const rows = parsed.rows;
    const invalid = rows.filter((r) => r.errors.length > 0);
    if (invalid.length > 0) {
      toast.error(`Terdapat ${invalid.length} baris invalid. Perbaiki file dan coba lagi.`);
      return;
    }
    if (rows.length === 0) {
      toast.error("Tidak ada data ditemukan di dalam file Excel.");
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
      for (const [subject, val] of Object.entries(r.values)) {
        if (val !== null) updatePraktek(id, subject as Subject, val);
      }
      for (const [mulok, val] of Object.entries(r.mulokValues)) {
        if (val !== null) updatePraktekMulok(id, mulok as any, val);
      }
    }

    if (matched === 0) {
      toast.error("Tidak ada data siswa yang cocok berdasarkan nama.");
      return;
    }
    
    toast.success(`Import selesai (${matched} siswa diperbarui)`);
    if (notFound > 0) toast.warning(`${notFound} baris siswa tidak ditemukan, dilewati`);
    
    // Clear draft if it exists so we see the fresh updated value
    if (active) {
      draftOwnerRef.current = null;
      setDraft(null);
      removeRouteDraft("/praktek", active.id);
    }
  }, [findStudentId, updatePraktek, updatePraktekMulok, active, removeRouteDraft]);

  const onImportPraktek = useCallback(async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const parsed = parseNilaiTunggalKelasFromWorkbook(wb);
      processPraktekRows(parsed);
    } catch (e) {
      toast.error("Gagal membaca file Excel");
    }
  }, [processPraktekRows]);
  // ---------------------------------

  const isDirty = useMemo(() => {
    if (!draft || !baselineRef.current) return false;
    return !isPraktekEqual(draft, baselineRef.current);
  }, [draft]);

  const setCell = useCallback((subject: Subject, value: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [subject]: value };
      draftRef.current = next;
      const owner = draftOwnerRef.current;
      if (owner) setRouteDraft("/praktek", owner, next as any);
      return next;
    });
  }, [setRouteDraft]);

  const clearDraft = useCallback(() => {
    if (!active) return;
    const cleared = {} as PraktekDraft;
    SUBJECTS.forEach((s) => (cleared[s] = 0));
    draftOwnerRef.current = active.id;
    draftRef.current = cleared;
    setDraft(cleared);
    setRouteDraft("/praktek", active.id, cleared as any);
    toast.success("Nilai praktek dibersihkan");
  }, [active, setRouteDraft]);

  const total = useMemo(() => {
    if (!active) return 0;
    const src = draft ?? active.nilai.praktek;
    return SUBJECTS.reduce((a, s) => a + (src[s] ?? 0), 0);
  }, [active, draft]);
  const rata = total / SUBJECTS.length;

  const doSave = useCallback(async () => {
    if (!active) return;
    const current = draftRef.current;
    if (!current) return;

    for (const s of SUBJECTS) {
      const n = current[s] ?? 0;
      if (Number.isNaN(n) || n < 0 || n > 100) {
        toast.error(`Nilai praktek ${s} harus 0–100`);
        return;
      }
    }

    setSaving(true);
    try {
      setNilai(active.id, { ...active.nilai, praktek: current });
      baselineRef.current = current;
      removeRouteDraft("/praktek", active.id);
      toast.success("Nilai praktek disimpan");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyimpan nilai praktek");
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
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Ujian Praktek"
        description="Input nilai ujian praktek per mata pelajaran."
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
                  if (file) onImportPraktek(file);
                  if (e.target) e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                className="border-dashed h-9"
                onClick={() => inputRef.current?.click()}
                title="Upload Excel Nilai Ujian Praktek"
              >
                <FileUp className="mr-2 h-4 w-4" /> Upload
              </Button>
              <StudentSwitcher
                label="data siswa"
                showClassFilter
                showAdd={false}
                showRemove={false}
                templateDownload={{
                  label: "Download template Ujian Praktek",
                  onClick: () => {
                    const sorted = [...students].sort((a, b) => 
                      (a.identitas.nama || "").localeCompare(b.identitas.nama || "")
                    );
                    downloadTemplateNilaiTunggalKelasExcel(sorted, "Ujian Praktek", mulokList);
                    toast.success("Template Ujian Praktek diunduh");
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
                aria-label="Hapus nilai praktek"
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
                  <TableHead className="text-center">Nilai Praktek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUBJECTS.map((s, i) => (
                  <TableRow key={`${active.id}-${s}`}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s}</TableCell>
                    <TableCell className="text-center">
                      <NilaiInput
                        value={(currentDraft?.[s] ?? active.nilai.praktek[s] ?? 0) as number}
                        onCommit={(v) => setCell(s, v)}
                        ariaLabel={`Praktek ${s}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Jumlah</span>
            <span className="font-semibold tabular-nums">{total}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Rata-rata</span>
            <span className="font-bold tabular-nums text-primary">{formatNilai(rata)}</span>
          </div>
        </PageCard>
      )}
    </div>
  );
}
