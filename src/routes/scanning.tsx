import { createFileRoute } from "@tanstack/react-router";
import { PageCard, PageHeader } from "@/components/layout/PageCard";

export const Route = createFileRoute("/scanning")({
  head: () => ({ meta: [{ title: "Pindai Nilai — Rekap Nilai MI" }] }),
  component: ScanningPage,
});

function ScanningPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pindai Nilai Siswa"
        description="Fitur Pindai Nilai (AI) sudah dihapus."
      />

      <PageCard>
        <div className="text-sm text-muted-foreground">
          Untuk input nilai, gunakan menu Raport Kurmer / Ujian Praktek / Hasil Ujian.
        </div>
      </PageCard>
    </div>
  );
}
