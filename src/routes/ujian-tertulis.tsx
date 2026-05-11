import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
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
import { downloadTemplateUjianTertulisExcel } from "@/utils/excelUtils";

export const Route = createFileRoute("/ujian-tertulis")({
  head: () => ({ meta: [{ title: "Ujian Tertulis — Rekap Nilai MI" }] }),
  component: UjianTertulisPage,
});

type TertulisDraft = Record<Subject, number>;

function cloneDraft(src: TertulisDraft): TertulisDraft {
  const out = {} as TertulisDraft;
  SUBJECTS.forEach((s) => (out[s] = src[s] ?? 0));
  return out;
}

function isEqual(a: TertulisDraft, b: TertulisDraft): boolean {
  for (const s of SUBJECTS) {
    if ((a[s] ?? 0) !== (b[s] ?? 0)) return false;
  }
  return true;
}

function UjianTertulisPage() {
  const active = useActiveStudent();
  const setNilai = useStudentStore((s) => s.setNilai);
  const getDraft = useAppStateStore((s) => s.state.routes["/ujian-tertulis"]?.drafts);
  const setRouteDraft = useAppStateStore((s) => s.setRouteDraft);
  const removeRouteDraft = useAppStateStore((s) => s.removeRouteDraft);

  const baselineRef = useRef<TertulisDraft | null>(null);
  const draftRef = useRef<TertulisDraft | null>(null);
  const draftOwnerRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<TertulisDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) {
      baselineRef.current = null;
      draftRef.current = null;
      draftOwnerRef.current = null;
      setDraft(null);
      return;
    }
    const baseline = cloneDraft(active.nilai.ujianTertulis);
    const saved = (getDraft?.[active.id] as any) as TertulisDraft | undefined;
    const next = saved ?? baseline;
    baselineRef.current = baseline;
    draftRef.current = next;
    draftOwnerRef.current = active.id;
    setDraft(next);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentDraft = draftOwnerRef.current === active?.id ? draft : null;

  const isDirty = useMemo(() => {
    if (!draft || !baselineRef.current) return false;
    return !isEqual(draft, baselineRef.current);
  }, [draft]);

  const setCell = useCallback(
    (subject: Subject, value: number) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const next = { ...prev, [subject]: value };
        draftRef.current = next;
        const owner = draftOwnerRef.current;
        if (owner) setRouteDraft("/ujian-tertulis", owner, next as any);
        return next;
      });
    },
    [setRouteDraft],
  );

  const total = useMemo(() => {
    if (!active) return 0;
    const src = draft ?? active.nilai.ujianTertulis;
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
        toast.error(`Nilai tertulis ${s} harus 0–100`);
        return;
      }
    }

    setSaving(true);
    try {
      setNilai(active.id, { ...active.nilai, ujianTertulis: current });
      baselineRef.current = current;
      removeRouteDraft("/ujian-tertulis", active.id);
      toast.success("Nilai tertulis disimpan");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyimpan nilai tertulis");
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
      <PageHeader title="Ujian Tertulis" description="Input nilai ujian tertulis per mata pelajaran." />
      {!active ? (
        <EmptyStudent />
      ) : (
        <PageCard
          actions={
            <div className="flex items-end gap-2">
              <StudentSwitcher
                label="data siswa"
                showClassFilter
                showAdd={false}
                templateDownload={{
                  label: "Download template Ujian Tertulis",
                  onClick: () => {
                    downloadTemplateUjianTertulisExcel();
                    toast.success("Template Ujian Tertulis diunduh");
                  },
                }}
              />
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
                  <TableHead className="text-center">Nilai Tertulis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUBJECTS.map((s, i) => (
                  <TableRow key={`${active.id}-${s}`}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s}</TableCell>
                    <TableCell className="text-center">
                      <NilaiInput
                        value={(currentDraft?.[s] ?? active.nilai.ujianTertulis[s] ?? 0) as number}
                        onCommit={(v) => setCell(s, v)}
                        ariaLabel={`Tertulis ${s}`}
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
