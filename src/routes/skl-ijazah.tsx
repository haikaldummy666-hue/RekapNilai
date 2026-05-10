import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FileText, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { PageCard, PageHeader, EmptyStudent } from "@/components/layout/PageCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudentSwitcher } from "@/components/layout/StudentSwitcher";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useActiveStudent } from "@/hooks/useActiveStudent";
import { useStudentStore } from "@/stores/studentStore";
import { useAuthStore, resolveMadrasahLogo } from "@/stores/authStore";
import {
  buildHasilAkhir,
  jumlahHasilAkhir,
  predikatOf,
  rataKeseluruhan,
} from "@/utils/calculateUtils";
import { formatNilai, formatTTL } from "@/utils/formatUtils";
import { exportElementToPDF } from "@/utils/pdfUtils";

export const Route = createFileRoute("/skl-ijazah")({
  head: () => ({ meta: [{ title: "SKL & Ijazah — Rekap Nilai MI" }] }),
  component: SKLPage,
});

function SKLPage() {
  const active = useActiveStudent();
  const updatePeringkat = useStudentStore((s) => s.updatePeringkat);
  const user = useAuthStore((s) => s.getCurrentUser());
  const printRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef<number | undefined>(undefined);
  const [peringkat, setPeringkat] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    if (!active) {
      baselineRef.current = undefined;
      setPeringkat("");
      return;
    }
    baselineRef.current = active.nilai.peringkatKelas;
    setPeringkat(active.nilai.peringkatKelas ? String(active.nilai.peringkatKelas) : "");
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps


  const parsedPeringkat = useMemo(() => {
    const v = peringkat.trim();
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return NaN;
    return n;
  }, [peringkat]);

  const isDirty = useMemo(() => {
    const base = baselineRef.current;
    if (parsedPeringkat === undefined) return base !== undefined;
    if (Number.isNaN(parsedPeringkat)) return true;
    return parsedPeringkat !== base;
  }, [parsedPeringkat]);

  const doSave = useCallback(async () => {
    if (!active) return;
    const v = peringkat.trim();
    let next: number | undefined;
    if (v) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) {
        toast.error("Peringkat harus bilangan bulat ≥ 1");
        return;
      }
      next = n;
    } else {
      next = undefined;
    }

    setSaving(true);
    try {
      updatePeringkat(active.id, next);
      baselineRef.current = next;
      toast.success("Peringkat disimpan");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyimpan peringkat");
    } finally {
      setSaving(false);
    }
  }, [active, peringkat, updatePeringkat]);

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

  if (!active) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title="SKL & Ijazah" />
        <EmptyStudent />
      </div>
    );
  }

  const rows = buildHasilAkhir(active.nilai);
  const total = jumlahHasilAkhir(active.nilai);
  const rata = rataKeseluruhan(active.nilai);
  const pred = predikatOf(rata);
  const logoSrc = resolveMadrasahLogo(user?.profile);
  const namaMadrasah = user?.profile.namaMadrasah || "Madrasah Ibtidaiyah";
  const kepala = user?.profile.namaKepalaMadrasah?.trim() || "—";
  const kelas = active.identitas.kelas?.trim() || user?.profile.kelas?.trim() || "—";

  const onPDF = async () => {
    if (!printRef.current) return;
    toast.info("Menyiapkan PDF SKL…");
    try {
      await exportElementToPDF(printRef.current, `SKL-${active.identitas.nama || "Siswa"}.pdf`);
      toast.success("PDF berhasil diunduh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat PDF");
      console.error(e);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="SKL & Ijazah"
        description="Surat Keterangan Lulus & rekap nilai akhir untuk ijazah."
        actions={
          <Button onClick={onPDF} className="bg-gradient-primary text-primary-foreground">
            <FileText className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        }
      />

      <PageCard
        className="mb-6"
        title="Peringkat Kelas"
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
        <div className="flex max-w-sm flex-col gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Peringkat (input manual)
          </Label>
          <Input
            type="number"
            min={1}
            placeholder="Contoh: 3"
            value={peringkat}
            onChange={(e) => setPeringkat(e.target.value)}
          />
        </div>
      </PageCard>

      <div ref={printRef} className="space-y-6 bg-background p-2">
        <PageCard>
          <div className="flex items-center gap-4">
            <img
              src={logoSrc}
              alt="Logo"
              className="h-14 w-14 rounded-xl border border-border object-cover"
              crossOrigin="anonymous"
            />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Rekap Nilai MI
              </p>
              <p className="truncate text-lg font-semibold">{namaMadrasah}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Kelas: {kelas}</p>
            </div>
          </div>
        </PageCard>

        <PageCard>
          <div className="text-center">
            <h2 className="mt-1 text-2xl font-bold">SURAT KETERANGAN LULUS</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tahun Pelajaran 2025/2026</p>
          </div>
          <div className="mx-auto mt-6 grid max-w-xl gap-2 text-sm">
            <Row k="Nama" v={active.identitas.nama || "—"} />
            <Row k="Kelas" v={kelas} />
            <Row k="NISN" v={active.identitas.nisn || "—"} />
            <Row k="No Ujian" v={active.identitas.noUjian || "—"} />
            <Row
              k="Tempat, Tanggal Lahir"
              v={formatTTL(active.identitas.tempatLahir, active.identitas.tanggalLahir)}
            />
            <Row k="Nama Ayah" v={active.identitas.namaAyah || "—"} />
            <Row k="Nama Ibu" v={active.identitas.namaIbu || "—"} />
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div />
            <div className="text-sm">
              <p className="text-muted-foreground">Kepala Madrasah</p>
              <div className="mt-12 font-semibold">{kepala}</div>
            </div>
          </div>
        </PageCard>

        <PageCard title="Daftar Nilai Akhir">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead className="text-center">Nilai Akhir</TableHead>
                  <TableHead className="text-center">Predikat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.subject}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.subject}</TableCell>
                    <TableCell className="text-center font-semibold tabular-nums text-primary">
                      {formatNilai(r.nilaiAkhir)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{r.predikat}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Jumlah" value={formatNilai(total)} />
            <Stat label="Rata-rata" value={formatNilai(rata)} />
            <Stat
              label="Peringkat"
              value={active.nilai.peringkatKelas ? `${active.nilai.peringkatKelas}` : "—"}
              accent
            />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Predikat keseluruhan: <span className="font-semibold text-foreground">{pred}</span>
          </p>
        </PageCard>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">: {v}</span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        accent
          ? "border-primary/30 bg-gradient-primary text-primary-foreground"
          : "border-border bg-card"
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-wide ${accent ? "opacity-80" : "text-muted-foreground"}`}
      >
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
