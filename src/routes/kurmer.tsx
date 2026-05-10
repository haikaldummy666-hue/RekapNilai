import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { SUBJECTS, type Subject } from "@/data/subjects";
import { useActiveStudent } from "@/hooks/useActiveStudent";
import { useStudentStore } from "@/stores/studentStore";
import type { NilaiKurmerRow } from "@/types/student.types";
import { Button } from "@/components/ui/button";
import { formatNilai } from "@/utils/formatUtils";
import { rataKurmerPerMapel } from "@/utils/calculateUtils";

export const Route = createFileRoute("/kurmer")({
  head: () => ({ meta: [{ title: "Raport Kurmer — Rekap Nilai MI" }] }),
  component: KurmerPage,
});

type KurmerDraft = Record<Subject, NilaiKurmerRow>;

function cloneKurmer(src: KurmerDraft): KurmerDraft {
  const out = {} as KurmerDraft;
  SUBJECTS.forEach((s) => {
    const r = src[s];
    out[s] = { k5s1: r.k5s1, k5s2: r.k5s2, k6s1: r.k6s1 };
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
  }
  return true;
}

function KurmerPage() {
  const active = useActiveStudent();
  const setNilai = useStudentStore((s) => s.setNilai);

  const baselineRef = useRef<KurmerDraft | null>(null);
  const draftRef = useRef<KurmerDraft | null>(null);
  const [draft, setDraft] = useState<KurmerDraft | null>(null);
  const [saving, setSaving] = useState(false);

  // Gunakan useLayoutEffect + active?.id agar draft reset sinkron sebelum
  // paint dan tidak reset ulang hanya karena nilai siswa sama diupdate.
  useLayoutEffect(() => {
    if (!active) {
      baselineRef.current = null;
      draftRef.current = null;
      setDraft(null);
      return;
    }
    const next = cloneKurmer(active.nilai.kurmer);
    baselineRef.current = next;
    draftRef.current = next;
    setDraft(next);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps


  const isDirty = useMemo(() => {
    if (!draft || !baselineRef.current) return false;
    return !isKurmerEqual(draft, baselineRef.current);
  }, [draft]);

  const setCell = useCallback((subject: Subject, field: keyof NilaiKurmerRow, value: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [subject]: { ...prev[subject], [field]: value } };
      draftRef.current = next;
      return next;
    });
  }, []);

  const doSave = useCallback(async () => {
    if (!active) return;
    const current = draftRef.current;
    if (!current) return;

    for (const s of SUBJECTS) {
      const r = current[s];
      const vals = [r.k5s1, r.k5s2, r.k6s1];
      if (vals.some((n) => Number.isNaN(n) || n < 0 || n > 100)) {
        toast.error(`Nilai ${s} harus 0–100`);
        return;
      }
    }

    setSaving(true);
    try {
      setNilai(active.id, { ...active.nilai, kurmer: current });
      baselineRef.current = current;
      toast.success("Nilai kurmer disimpan");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyimpan nilai kurmer");
    } finally {
      setSaving(false);
    }
  }, [active, setNilai]);

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
        description="Nilai Kelas 5 Semester 1 & 2, dan Kelas 6 Semester 1. Jumlah & rata-rata dihitung otomatis."
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
                  <TableHead className="text-center">Kls 5 Sem 1</TableHead>
                  <TableHead className="text-center">Kls 5 Sem 2</TableHead>
                  <TableHead className="text-center">Kls 6 Sem 1</TableHead>
                  <TableHead className="text-center">Jumlah</TableHead>
                  <TableHead className="text-center">Rata-rata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUBJECTS.map((s, i) => {
                  const r = draft?.[s] ?? active.nilai.kurmer[s];
                  const sum = r.k5s1 + r.k5s2 + r.k6s1;
                  const rata = rataKurmerPerMapel(
                    { ...active.nilai, kurmer: draft ?? active.nilai.kurmer },
                    s,
                  );
                  return (
                    <TableRow key={s}>
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
