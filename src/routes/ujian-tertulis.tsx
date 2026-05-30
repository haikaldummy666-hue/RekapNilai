import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Save, Trash2, Download } from "lucide-react";
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
import { downloadTemplateUjianTertulisExcel, downloadTemplateUjianTertulisKelasExcel } from "@/utils/excelUtils";
import { useMulokStore } from "@/stores/mulokStore";
import { MulokManager } from "@/components/forms/MulokManager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const students = useStudentStore((s) => s.students);
  const setNilai = useStudentStore((s) => s.setNilai);
  const getDraft = useAppStateStore((s) => s.state.routes["/ujian-tertulis"]?.drafts);
  const setRouteDraft = useAppStateStore((s) => s.setRouteDraft);
  const removeRouteDraft = useAppStateStore((s) => s.removeRouteDraft);
  const mulokConfig = useMulokStore((s) => s.config);

  const baselineRef = useRef<TertulisDraft | null>(null);
  const draftRef = useRef<TertulisDraft | null>(null);
  const draftOwnerRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<TertulisDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState<string>("all");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

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

  const clearDraft = useCallback(() => {
    if (!active) return;
    const cleared = {} as TertulisDraft;
    SUBJECTS.forEach((s) => (cleared[s] = 0));
    draftOwnerRef.current = active.id;
    draftRef.current = cleared;
    setDraft(cleared);
    setRouteDraft("/ujian-tertulis", active.id, cleared as any);
    toast.success("Nilai tertulis dibersihkan");
  }, [active, setRouteDraft]);

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

  // Get kelas list
  const kelasList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const k = s.identitas.kelas?.trim();
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [students]);

  // Get students for selected kelas
  const siswaByKelas = useMemo(() => {
    if (selectedKelas === "all") return students;
    return students.filter((s) => (s.identitas.kelas?.trim() || "") === selectedKelas);
  }, [students, selectedKelas]);

  const handleDownloadTemplateKelas = () => {
    if (siswaByKelas.length === 0) {
      toast.error("Tidak ada siswa di kelas ini");
      return;
    }
    downloadTemplateUjianTertulisKelasExcel(siswaByKelas, mulokConfig.selected);
    toast.success("Template Ujian Tertulis (Kelas) diunduh");
    setTemplateDialogOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Ujian Tertulis" description="Input nilai ujian tertulis per mata pelajaran." />
      {!active ? (
        <EmptyStudent />
      ) : (
        <PageCard
          actions={
            <div className="flex flex-wrap items-end gap-2">
              <StudentSwitcher
                label="data siswa"
                showClassFilter
                showAdd={false}
                showRemove={false}
              />
              
              {/* Download Template Dialog */}
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>### Download Template Nilai Ujian</DialogTitle>
                    <DialogDescription>
                      Pilih format template yang ingin diunduh untuk input nilai ujian tertulis.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Template Individual */}
                    <div className="rounded-lg border p-4">
                      <h3 className="mb-2 font-medium">Template Individual</h3>
                      <p className="mb-3 text-sm text-muted-foreground">
                        Template untuk input nilai satu siswa per satu. Gunakan untuk merekam nilai siswa satu per satu.
                      </p>
                      <Button
                        onClick={() => {
                          downloadTemplateUjianTertulisExcel();
                          toast.success("Template Individual diunduh");
                          setTemplateDialogOpen(false);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Template Individual
                      </Button>
                    </div>

                    {/* Template Kelas */}
                    <div className="rounded-lg border p-4">
                      <h3 className="mb-2 font-medium">Template Nilai Ujian (Kelas)</h3>
                      <p className="mb-3 text-sm text-muted-foreground">
                        Template dengan daftar siswa di kelas. Sesuaikan dengan siswa yang ada, hanya kolom nilai yang dapat diedit (angka 0-100 saja).
                      </p>
                      
                      <div className="mb-3">
                        <label className="text-sm font-medium">Pilih Kelas:</label>
                        <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Pilih kelas…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Siswa</SelectItem>
                            {kelasList.map((k) => (
                              <SelectItem key={k} value={k}>
                                {k}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mb-3 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                        <p className="font-medium">Informasi:</p>
                        <ul className="mt-1 list-inside list-disc space-y-1">
                          <li>Siswa di kelas: <strong>{siswaByKelas.length}</strong></li>
                          <li>Mata Pelajaran: {SUBJECTS.length + mulokConfig.selected.length}</li>
                          <li>Sheet dikunci - hanya nilai yang dapat diedit</li>
                        </ul>
                      </div>

                      <Button
                        onClick={handleDownloadTemplateKelas}
                        disabled={siswaByKelas.length === 0}
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Template Kelas
                      </Button>
                    </div>

                    {/* Manajemen MULOK */}
                    <div className="rounded-lg border p-4">
                      <h3 className="mb-3 font-medium">Manajemen Mata Pelajaran Lokal</h3>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Kelola mata pelajaran lokal yang akan ditampilkan di template Excel. Bahasa Sunda tidak bisa dihapus (wajib). Perubahan akan otomatis tercermin saat download file.
                      </p>
                      <MulokManager inline />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  (document.activeElement as HTMLElement | null)?.blur?.();
                  clearDraft();
                }}
                aria-label="Hapus nilai tertulis"
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
