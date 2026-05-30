import { createFileRoute } from "@tanstack/react-router";
import { PageCard, PageHeader, EmptyStudent } from "@/components/layout/PageCard";
import { StudentSwitcher } from "@/components/layout/StudentSwitcher";
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
import { rataUjianPerMapel } from "@/utils/calculateUtils";
import { formatNilai } from "@/utils/formatUtils";

export const Route = createFileRoute("/hasil-ujian")({
  head: () => ({ meta: [{ title: "Hasil Ujian — Rekap Nilai MI" }] }),
  component: HasilUjianPage,
});

function HasilUjianPage() {
  const active = useActiveStudent();

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
              <StudentSwitcher
                label="data siswa"
                showClassFilter
                showAdd={false}
                showRemove={false}
              />
            </div>
          }
        >
          <div className="rounded-xl border border-border bg-muted/10 p-4 text-sm text-muted-foreground mb-4">
            Halaman ini hanya menampilkan output rata-rata nilai ujian. Input nilai tertulis dan praktek ada di menu masing-masing.
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead className="text-center">Rata-rata Ujian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUBJECTS.map((s, i) => (
                  <TableRow key={`${active.id}-${s}`}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s}</TableCell>
                    <TableCell className="text-center font-semibold tabular-nums text-primary">
                      {formatNilai(rataUjianPerMapel(active.nilai, s))}
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
