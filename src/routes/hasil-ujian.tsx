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
import { rataUjianPerMapel } from "@/utils/calculateUtils";
import { formatNilai } from "@/utils/formatUtils";

export const Route = createFileRoute("/hasil-ujian")({
  head: () => ({ meta: [{ title: "Hasil Ujian — Rekap Nilai MI" }] }),
  component: HasilUjianPage,
});

type NilaiMap = Record<Subject, number>;

type UjianDraft = {
  tertulis: NilaiMap;
  praktek: NilaiMap;
};

function cloneNilaiMap(src: NilaiMap): NilaiMap {
  const out = {} as NilaiMap;
  SUBJECTS.forEach((s) => (out[s] = src[s] ?? 0));
  return out;
}

function isNilaiMapEqual(a: NilaiMap, b: NilaiMap): boolean {
  for (const s of SUBJECTS) {
    if ((a[s] ?? 0) !== (b[s] ?? 0)) return false;
  }
  return true;
}

function HasilUjianPage() {
  const active = useActiveStudent();
  const setNilai = useStudentStore((s) => s.setNilai);
  const getDraft = useAppStateStore((s) => s.state.routes["/hasil-ujian"]?.drafts);
  const setRouteDraft = useAppStateStore((s) => s.setRouteDraft);
  const removeRouteDraft = useAppStateStore((s) => s.removeRouteDraft);

  const baselineRef = useRef<UjianDraft | null>(null);
  const draftRef = useRef<UjianDraft | null>(null);
  const draftOwnerRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<UjianDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) {
      baselineRef.current = null;
      draftRef.current = null;
      draftOwnerRef.current = null;
      setDraft(null);
      return;
    }
    const baseline: UjianDraft = {
      tertulis: cloneNilaiMap(active.nilai.ujianTertulis),
      praktek: cloneNilaiMap(active.nilai.praktek),
    };
    const saved = (getDraft?.[active.id] as any) as UjianDraft | undefined;
    const next = saved ?? baseline;
    baselineRef.current = baseline;
    draftRef.current = next;
    draftOwnerRef.current = active.id;
    setDraft(next);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentDraft = draftOwnerRef.current === active?.id ? draft : null;

  const isDirty = useMemo(() => {
    if (!draft || !baselineRef.current) return false;
    return (
      !isNilaiMapEqual(draft.tertulis, baselineRef.current.tertulis) ||
      !isNilaiMapEqual(draft.praktek, baselineRef.current.praktek)
    );
  }, [draft]);

  const setCell = useCallback((kind: keyof UjianDraft, subject: Subject, value: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [kind]: { ...prev[kind], [subject]: value } };
      draftRef.current = next;
      const owner = draftOwnerRef.current;
      if (owner) setRouteDraft("/hasil-ujian", owner, next as any);
      return next;
    });
  }, [setRouteDraft]);

  const doSave = useCallback(async () => {
    if (!active) return;
    const current = draftRef.current;
    if (!current) return;

    for (const s of SUBJECTS) {
      const tertulis = current.tertulis[s] ?? 0;
      const praktek = current.praktek[s] ?? 0;
      if ([tertulis, praktek].some((n) => Number.isNaN(n) || n < 0 || n > 100)) {
        toast.error(`Nilai ${s} harus 0–100`);
        return;
      }
    }

    setSaving(true);
    try {
      setNilai(active.id, {
        ...active.nilai,
        ujianTertulis: current.tertulis,
        praktek: current.praktek,
      });
      baselineRef.current = current;
      removeRouteDraft("/hasil-ujian", active.id);
      toast.success("Nilai ujian disimpan");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyimpan nilai ujian");
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
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Hasil Ujian"
        description="Rata-rata = (Nilai Tertulis + Nilai Praktek) / 2."
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
                  <TableHead className="text-center">Tertulis</TableHead>
                  <TableHead className="text-center">Praktek</TableHead>
                  <TableHead className="text-center">Rata-rata Ujian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUBJECTS.map((s, i) => (
                  <TableRow key={`${active.id}-${s}`}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s}</TableCell>
                    <TableCell className="text-center">
                      <NilaiInput
                        value={(currentDraft?.tertulis[s] ?? active.nilai.ujianTertulis[s] ?? 0) as number}
                        onCommit={(v) => setCell("tertulis", s, v)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <NilaiInput
                        value={(currentDraft?.praktek[s] ?? active.nilai.praktek[s] ?? 0) as number}
                        onCommit={(v) => setCell("praktek", s, v)}
                      />
                    </TableCell>
                    <TableCell className="text-center font-semibold tabular-nums text-primary">
                      {formatNilai(
                        rataUjianPerMapel(
                          {
                            ...active.nilai,
                            ujianTertulis: currentDraft?.tertulis ?? active.nilai.ujianTertulis,
                            praktek: currentDraft?.praktek ?? active.nilai.praktek,
                          },
                          s,
                        ),
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </PageCard>
      )}
    </div>
  );
}
