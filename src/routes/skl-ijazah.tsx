import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { PageCard, PageHeader, EmptyStudent } from "@/components/layout/PageCard";
import { Button } from "@/components/ui/button";
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
  const students = useStudentStore((s) => s.students);

  const user = useAuthStore((s) => s.getCurrentUser());
  const printRef = useRef<HTMLDivElement>(null);
  
  const activeClass = active?.identitas.kelas?.trim() || "";
  
  const computedRank = useMemo(() => {
    if (!active) return "—";
    
    // Ambil siswa dengan kelas yang sama
    const peers = students.filter(s => (s.identitas.kelas?.trim() || "") === activeClass);
    
    // Urutkan berdasarkan jumlahHasilAkhir menurun
    const sortedPeers = [...peers].sort((a, b) => {
      const totalA = jumlahHasilAkhir(a.nilai);
      const totalB = jumlahHasilAkhir(b.nilai);
      return totalB - totalA;
    });

    const activeTotal = jumlahHasilAkhir(active.nilai);
    let rank = 1;
    for (let i = 0; i < sortedPeers.length; i++) {
      if (sortedPeers[i].id === active.id) break;
      if (jumlahHasilAkhir(sortedPeers[i].nilai) > activeTotal) {
        rank++;
      }
    }
    
    return rank;
  }, [active, students, activeClass]);

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

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <StudentSwitcher label="data siswa" showClassFilter />
      </div>

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
              value={`${computedRank}`}
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
