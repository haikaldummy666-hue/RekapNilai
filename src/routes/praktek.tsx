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
  const setNilai = useStudentStore((s) => s.setNilai);
  const getDraft = useAppStateStore((s) => s.state.routes["/praktek"]?.drafts);
  const setRouteDraft = useAppStateStore((s) => s.setRouteDraft);
  const removeRouteDraft = useAppStateStore((s) => s.removeRouteDraft);

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
              <StudentSwitcher label="data siswa" showClassFilter />
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
