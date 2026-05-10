import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageCard, PageHeader, EmptyStudent } from "@/components/layout/PageCard";
import { StudentSwitcher } from "@/components/layout/StudentSwitcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveStudent } from "@/hooks/useActiveStudent";
import {
  buildHasilAkhir,
  jumlahHasilAkhir,
  rataKeseluruhan,
  predikatOf,
} from "@/utils/calculateUtils";
import { formatNilai } from "@/utils/formatUtils";
import { exportHasilAkhirExcel } from "@/utils/excelUtils";
import { exportElementToPDF } from "@/utils/pdfUtils";
import type { Predikat } from "@/types/nilai.types";

export const Route = createFileRoute("/hasil-akhir")({
  head: () => ({ meta: [{ title: "Hasil Akhir — Rekap Nilai MI" }] }),
  component: HasilAkhirPage,
});

const PREDIKAT_COLOR: Record<Predikat, string> = {
  "Sangat Baik": "bg-gradient-primary text-primary-foreground",
  Baik: "bg-success/15 text-success border-success/30",
  Cukup: "bg-warning/15 text-warning border-warning/30",
  Kurang: "bg-destructive/15 text-destructive border-destructive/30",
};

function HasilAkhirPage() {
  const active = useActiveStudent();
  const printRef = useRef<HTMLDivElement>(null);

  if (!active) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title="Hasil Akhir" />
        <EmptyStudent />
      </div>
    );
  }

  const rows = buildHasilAkhir(active.nilai);
  const total = jumlahHasilAkhir(active.nilai);
  const rata = rataKeseluruhan(active.nilai);
  const pred = predikatOf(rata);

  const onExportExcel = () => {
    exportHasilAkhirExcel(active);
    toast.success("File Excel diunduh");
  };

  const onExportPDF = async () => {
    if (!printRef.current) return;
    toast.info("Menyiapkan PDF…");
    try {
      await exportElementToPDF(printRef.current, `Rapor-${active.identitas.nama || "Siswa"}.pdf`);
      toast.success("PDF berhasil diunduh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat PDF");
      console.error(e);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Hasil Akhir"
        description="Nilai Akhir = (Rata-rata Kurmer × 60%) + (Nilai Ujian × 40%)"
        actions={
          <>
            <StudentSwitcher label="siswa" showClassFilter compact />
            <Button variant="outline" onClick={onExportPDF}>
              <FileText className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button onClick={onExportExcel} className="bg-gradient-primary text-primary-foreground">
              <Download className="mr-2 h-4 w-4" /> Download Excel
            </Button>
          </>
        }
      />

      <div ref={printRef} className="space-y-6 bg-background p-2">
        <PageCard title="Ringkasan">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Jumlah Nilai Akhir" value={formatNilai(total)} />
            <Stat label="Rata-rata Keseluruhan" value={formatNilai(rata)} accent />
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Predikat</p>
              <Badge className={`mt-2 text-sm ${PREDIKAT_COLOR[pred]}`}>{pred}</Badge>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <Progress value={rata} className="h-3 flex-1" />
            <span className="w-20 text-right text-2xl font-bold tabular-nums">
              {formatNilai(rata)}
            </span>
          </div>
        </PageCard>

        <PageCard title={`Nilai Akhir — ${active.identitas.nama || "Siswa"}`}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead className="text-center">Rata-rata Kurmer</TableHead>
                  <TableHead className="text-center">Nilai Ujian Madrasah</TableHead>
                  <TableHead className="text-center">Nilai Akhir</TableHead>
                  <TableHead className="text-center">Predikat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.subject}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.subject}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {formatNilai(r.rataKurmer)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {formatNilai(r.nilaiUjian)}
                    </TableCell>
                    <TableCell className="text-center font-bold tabular-nums text-primary">
                      {formatNilai(r.nilaiAkhir)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={PREDIKAT_COLOR[r.predikat]}>
                        {r.predikat}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </PageCard>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-primary/30 bg-gradient-primary text-primary-foreground shadow-elegant"
          : "border-border bg-card"
      }`}
    >
      <p
        className={`text-xs uppercase tracking-wide ${accent ? "opacity-80" : "text-muted-foreground"}`}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
