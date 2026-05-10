import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookMarked,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  ScrollText,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { PageHeader, PageCard, EmptyStudent } from "@/components/layout/PageCard";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useStudentStore } from "@/stores/studentStore";
import { useActiveStudent } from "@/hooks/useActiveStudent";
import { predikatOf, rataKeseluruhan } from "@/utils/calculateUtils";
import { formatNilai } from "@/utils/formatUtils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Dashboard — Rekap Nilai MI Kelas 6" }],
  }),
  component: Dashboard,
});

const SHORTCUTS = [
  { to: "/identitas", label: "Identitas", icon: User },
  { to: "/kurmer", label: "Kurmer", icon: BookMarked },
  { to: "/praktek", label: "Ujian Praktek", icon: ClipboardList },
  { to: "/hasil-ujian", label: "Hasil Ujian", icon: ScrollText },
  { to: "/hasil-akhir", label: "Hasil Akhir", icon: Trophy },
  { to: "/skl-ijazah", label: "SKL & Ijazah", icon: GraduationCap },
  { to: "/excel-tools", label: "Excel Tools", icon: FileSpreadsheet },
] as const;

function Dashboard() {
  const studentsCount = useStudentStore((s) => s.students.length);
  const loadSample = useStudentStore((s) => s.loadSample);
  const active = useActiveStudent();

  const rata = active ? rataKeseluruhan(active.nilai) : 0;
  const predikat = predikatOf(rata);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Ringkasan rekap nilai siswa kelas 6 Madrasah Ibtidaiyah."
        actions={
          studentsCount === 0 && (
            <Button onClick={loadSample} className="bg-gradient-primary text-primary-foreground">
              Muat Data Contoh
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Siswa" value={String(studentsCount)} icon={Users} />
        <ActiveStudentCard />
        <StatCard label="Rata-rata Akhir" value={active ? formatNilai(rata) : "—"} icon={Trophy} />
        <StatCard label="Predikat" value={active ? predikat : "—"} icon={GraduationCap} />
      </div>

      {!active ? (
        <div className="mt-6">
          <EmptyStudent />
        </div>
      ) : (
        <PageCard
          className="mt-6"
          title="Progress Rata-rata Keseluruhan"
          description={`Berdasarkan 13 mata pelajaran · Predikat ${predikat}`}
        >
          <div className="flex items-center gap-4">
            <Progress value={rata} className="h-3 flex-1" />
            <span className="w-16 text-right text-2xl font-bold tabular-nums">
              {formatNilai(rata)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="bg-gradient-primary text-primary-foreground">
              {active.identitas.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
            </Badge>
            <Badge variant="outline">NISN {active.identitas.nisn || "-"}</Badge>
            <Badge variant="outline">No Ujian {active.identitas.noUjian || "-"}</Badge>
          </div>
        </PageCard>
      )}

      <PageCard className="mt-6" title="Pintasan Halaman">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-base hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-soft">
                <s.icon className="h-5 w-5" />
              </div>
              <span className="font-medium">{s.label}</span>
            </Link>
          ))}
        </div>
      </PageCard>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass rounded-2xl p-4 shadow-soft transition-base hover:-translate-y-0.5 hover:shadow-elegant">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 truncate text-xl font-bold">{value}</p>
    </div>
  );
}

function ActiveStudentCard() {
  const students = useStudentStore((s) => s.students);
  const activeId = useStudentStore((s) => s.activeId);
  const setActive = useStudentStore((s) => s.setActive);

  return (
    <div className="glass rounded-2xl p-4 shadow-soft transition-base hover:-translate-y-0.5 hover:shadow-elegant">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Siswa Aktif
        </p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
      </div>

      {students.length === 0 ? (
        <p className="mt-2 truncate text-xl font-bold">—</p>
      ) : (
        <Select value={activeId ?? ""} onValueChange={(v) => setActive(v)}>
          <SelectTrigger className="mt-2 h-auto border-0 px-0 py-0 text-left text-xl font-bold shadow-none focus:ring-0">
            <SelectValue placeholder="Pilih siswa…" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.identitas.nama || "(tanpa nama)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
