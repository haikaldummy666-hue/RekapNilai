import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownUp, History, Search, UserCheck } from "lucide-react";
import { PageCard, PageHeader } from "@/components/layout/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { SUBJECTS, type Subject } from "@/data/subjects";
import { collectKelasList, normalizeKelas, useStudentStore } from "@/stores/studentStore";
import type { Student } from "@/types/student.types";
import type { Predikat, NilaiHistoryEntry } from "@/types/nilai.types";
import {
  buildHasilAkhir,
  buildHasilUjian,
  nilaiFillSummary,
  type NilaiFillStatus,
  predikatOf,
  rataKeseluruhan,
  rataKurmerPerMapel,
  rataUjianPerMapel,
  nilaiAkhirPerMapel,
} from "@/utils/calculateUtils";
import { formatNilai } from "@/utils/formatUtils";

export const Route = createFileRoute("/siswa")({
  head: () => ({ meta: [{ title: "Daftar Siswa — Rekap Nilai MI" }] }),
  component: DaftarSiswaPage,
});

type Metric = "nilaiAkhir" | "rataKurmer" | "rataUjian" | "ujianTertulis" | "praktek";

const METRIC_LABEL: Record<Metric, string> = {
  nilaiAkhir: "Nilai Akhir",
  rataKurmer: "Rata-rata Kurmer",
  rataUjian: "Rata-rata Ujian",
  ujianTertulis: "Ujian Tertulis",
  praktek: "Praktek",
};

const PREDIKAT_COLOR: Record<Predikat, string> = {
  "Sangat Baik": "bg-gradient-primary text-primary-foreground",
  Baik: "bg-success/15 text-success border-success/30",
  Cukup: "bg-warning/15 text-warning border-warning/30",
  Kurang: "bg-destructive/15 text-destructive border-destructive/30",
};

const NILAI_STATUS_BADGE: Record<NilaiFillStatus, { label: string; className: string }> = {
  completed: { label: "completed", className: "bg-success/15 text-success border-success/30" },
  "in progress": { label: "in progress", className: "bg-warning/15 text-warning border-warning/30" },
  "not started": { label: "not started", className: "bg-muted/30 text-muted-foreground border-border" },
};

function valueForMetric(nilai: Student["nilai"], subject: Subject, metric: Metric): number {
  if (metric === "nilaiAkhir") return nilaiAkhirPerMapel(nilai, subject);
  if (metric === "rataKurmer") return rataKurmerPerMapel(nilai, subject);
  if (metric === "rataUjian") return rataUjianPerMapel(nilai, subject);
  if (metric === "ujianTertulis") return nilai.ujianTertulis[subject] ?? 0;
  return nilai.praktek[subject] ?? 0;
}

function averageMetric(nilai: Student["nilai"], metric: Metric): number {
  const sum = SUBJECTS.reduce((acc, s) => acc + valueForMetric(nilai, s, metric), 0);
  return sum / SUBJECTS.length;
}

function DaftarSiswaPage() {
  const students = useStudentStore((s) => s.students);
  const activeId = useStudentStore((s) => s.activeId);
  const setActive = useStudentStore((s) => s.setActive);
  const isMobile = useIsMobile();

  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState<Metric>("nilaiAkhir");
  const [gender, setGender] = useState<"all" | "L" | "P">("all");
  const [kelas, setKelas] = useState<string>("all");
  const [predikat, setPredikat] = useState<"all" | Predikat>("all");
  const [peringkat, setPeringkat] = useState<"all" | "ada" | "kosong">("all");
  const [sortKey, setSortKey] = useState<"nama" | "nilai">("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);

  // Extract unique class list
  const classList = useMemo(() => {
    return collectKelasList(students);
  }, [students]);

  const classCountMap = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const k = normalizeKelas(s.identitas.kelas);
      if (k) {
        map.set(k, (map.get(k) ?? 0) + 1);
      }
    });
    return map;
  }, [students]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const enriched = students.map((s) => {
      const nama = (s.identitas.nama || "(tanpa nama)").trim();
      const pred = predikatOf(rataKeseluruhan(s.nilai));
      const avg = averageMetric(s.nilai, metric);
      const bySubject = SUBJECTS.reduce(
        (acc, subj) => {
          acc[subj] = valueForMetric(s.nilai, subj, metric);
          return acc;
        },
        {} as Record<Subject, number>,
      );

      return {
        student: s,
        nama,
        search: `${nama} ${s.identitas.nisn} ${s.identitas.noUjian}`.toLowerCase(),
        predikat: pred,
        avg,
        bySubject,
      };
    });

    const filtered = enriched.filter((r) => {
      if (q && !r.search.includes(q)) return false;
      if (gender !== "all" && r.student.identitas.jenisKelamin !== gender) return false;
      if (kelas !== "all" && normalizeKelas(r.student.identitas.kelas) !== normalizeKelas(kelas))
        return false;
      if (predikat !== "all" && r.predikat !== predikat) return false;
      if (peringkat === "ada" && r.student.nilai.peringkatKelas === undefined) return false;
      if (peringkat === "kosong" && r.student.nilai.peringkatKelas !== undefined) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortKey === "nama") return a.nama.localeCompare(b.nama) * dir;
      return (a.avg - b.avg) * dir;
    });

    return filtered;
  }, [students, query, gender, kelas, predikat, peringkat, metric, sortKey, sortDir]);

  const selected = useMemo(
    () => (selectedId ? (students.find((s) => s.id === selectedId) ?? null) : null),
    [selectedId, students],
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Daftar Siswa"
        description="Cari, filter, dan urutkan siswa. Klik siswa untuk melihat detail nilai."
      />

      <PageCard title="Pencarian & Filter">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama / NISN / No Ujian…"
              className="pl-9"
            />
          </div>

          <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih metrik" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METRIC_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={kelas} onValueChange={(v) => setKelas(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {classList.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={gender} onValueChange={(v) => setGender(v as "all" | "L" | "P")}>
            <SelectTrigger>
              <SelectValue placeholder="Jenis kelamin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua JK</SelectItem>
              <SelectItem value="L">L</SelectItem>
              <SelectItem value="P">P</SelectItem>
            </SelectContent>
          </Select>

          <Select value={predikat} onValueChange={(v) => setPredikat(v as "all" | Predikat)}>
            <SelectTrigger>
              <SelectValue placeholder="Predikat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Predikat</SelectItem>
              <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
              <SelectItem value="Baik">Baik</SelectItem>
              <SelectItem value="Cukup">Cukup</SelectItem>
              <SelectItem value="Kurang">Kurang</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Select value={peringkat} onValueChange={(v) => setPeringkat(v as typeof peringkat)}>
            <SelectTrigger>
              <SelectValue placeholder="Peringkat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Peringkat</SelectItem>
              <SelectItem value="ada">Ada Peringkat</SelectItem>
              <SelectItem value="kosong">Belum Diisi</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
            <SelectTrigger>
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nama">Nama Siswa</SelectItem>
              <SelectItem value="nilai">Nilai (rata-rata)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="justify-center"
          >
            <ArrowDownUp className="mr-2 h-4 w-4" /> {sortDir === "asc" ? "Naik" : "Turun"}
          </Button>
        </div>
      </PageCard>

      <PageCard
        className="mt-6"
        title={`Daftar (${rows.length})`}
        description={`Metrik tampilan: ${METRIC_LABEL[metric]}`}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Siswa</TableHead>
                <TableHead className="w-[130px] text-center">Rata-rata</TableHead>
                {!isMobile &&
                  SUBJECTS.map((s) => (
                    <TableHead key={s} className="min-w-[130px] text-center">
                      {s}
                    </TableHead>
                  ))}
                <TableHead className="w-[160px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isActive = r.student.id === activeId;
                const fill = nilaiFillSummary(r.student.nilai);
                const status = NILAI_STATUS_BADGE[fill.status];
                return (
                  <TableRow
                    key={r.student.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(r.student.id)}
                  >
                    <TableCell className="align-top">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {r.nama}{" "}
                            {isActive && (
                              <Badge variant="outline" className="ml-2">
                                Aktif
                              </Badge>
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>NISN: {r.student.identitas.nisn || "-"}</span>
                            <span>No Ujian: {r.student.identitas.noUjian || "-"}</span>
                            <span>JK: {r.student.identitas.jenisKelamin}</span>
                          </div>
                          <div className="mt-2">
                            <Badge className={PREDIKAT_COLOR[r.predikat]} variant="outline">
                              {r.predikat}
                            </Badge>
                            <Badge className={status.className} variant="outline">
                              {status.label} · {fill.percent}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center align-top font-bold tabular-nums text-primary">
                      {formatNilai(r.avg)}
                    </TableCell>

                    {!isMobile &&
                      SUBJECTS.map((s) => (
                        <TableCell key={s} className="text-center align-top tabular-nums">
                          {formatNilai(r.bySubject[s])}
                        </TableCell>
                      ))}

                    <TableCell
                      className="align-top text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryStudent(r.student)}
                          title="Lihat history pengisian nilai"
                        >
                          <History className="mr-1 h-4 w-4" /> History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedId(r.student.id)}
                        >
                          Detail
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-primary text-primary-foreground"
                          onClick={() => setActive(r.student.id)}
                        >
                          <UserCheck className="mr-2 h-4 w-4" /> Aktifkan
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isMobile ? 3 : 2 + SUBJECTS.length + 1}
                    className="py-10 text-center"
                  >
                    <p className="text-sm text-muted-foreground">
                      Tidak ada siswa yang cocok dengan filter.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageCard>

      {selected && (
        <StudentDetail
          student={selected}
          open={!!selectedId}
          onOpenChange={(v) => setSelectedId(v ? selectedId : null)}
          isMobile={isMobile}
          onSetActive={() => setActive(selected.id)}
        />
      )}

      {historyStudent && (
        <StudentHistoryModal
          student={historyStudent}
          open={!!historyStudent}
          onOpenChange={(open) => setHistoryStudent(open ? historyStudent : null)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

function StudentDetail({
  student,
  open,
  onOpenChange,
  isMobile,
  onSetActive,
}: {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  onSetActive: () => void;
}) {
  const header = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold">{student.identitas.nama || "(tanpa nama)"}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>NISN: {student.identitas.nisn || "-"}</span>
          <span>No Ujian: {student.identitas.noUjian || "-"}</span>
          <span>JK: {student.identitas.jenisKelamin}</span>
          <span>Peringkat: {student.nilai.peringkatKelas ?? "-"}</span>
        </div>
      </div>
      <Button className="bg-gradient-primary text-primary-foreground" onClick={onSetActive}>
        <UserCheck className="mr-2 h-4 w-4" /> Jadikan Aktif
      </Button>
    </div>
  );

  const body = (
    <div className="space-y-4">
      {header}
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat
          label="Rata-rata Kurmer"
          value={formatNilai(averageMetric(student.nilai, "rataKurmer"))}
        />
        <MiniStat
          label="Rata-rata Ujian"
          value={formatNilai(averageMetric(student.nilai, "rataUjian"))}
        />
        <MiniStat
          label="Rata-rata Nilai Akhir"
          value={formatNilai(rataKeseluruhan(student.nilai))}
          accent
        />
      </div>

      <Tabs defaultValue="akhir">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="akhir">Akhir</TabsTrigger>
          <TabsTrigger value="kurmer">Kurmer</TabsTrigger>
          <TabsTrigger value="ujian">Ujian</TabsTrigger>
          <TabsTrigger value="prakt">Praktek</TabsTrigger>
        </TabsList>

        <TabsContent value="akhir" className="space-y-3">
          <DetailTableHasilAkhir student={student} />
        </TabsContent>
        <TabsContent value="kurmer" className="space-y-3">
          <DetailTableKurmer student={student} />
        </TabsContent>
        <TabsContent value="ujian" className="space-y-3">
          <DetailTableUjian student={student} />
        </TabsContent>
        <TabsContent value="prakt" className="space-y-3">
          <DetailTablePraktek student={student} />
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>Detail Nilai</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Nilai</DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
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

function DetailTableHasilAkhir({ student }: { student: Student }) {
  const rows = buildHasilAkhir(student.nilai);
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No</TableHead>
            <TableHead>Mata Pelajaran</TableHead>
            <TableHead className="text-center">Kurmer</TableHead>
            <TableHead className="text-center">Ujian</TableHead>
            <TableHead className="text-center">Akhir</TableHead>
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
  );
}

function DetailTableKurmer({ student }: { student: Student }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No</TableHead>
            <TableHead>Mata Pelajaran</TableHead>
            <TableHead className="text-center">Kls 5 S1</TableHead>
            <TableHead className="text-center">Kls 5 S2</TableHead>
            <TableHead className="text-center">Kls 6 S1</TableHead>
            <TableHead className="text-center">Rata</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SUBJECTS.map((subj, i) => {
            const r = student.nilai.kurmer[subj];
            const avg = rataKurmerPerMapel(student.nilai, subj);
            return (
              <TableRow key={subj}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{subj}</TableCell>
                <TableCell className="text-center tabular-nums">{formatNilai(r.k5s1)}</TableCell>
                <TableCell className="text-center tabular-nums">{formatNilai(r.k5s2)}</TableCell>
                <TableCell className="text-center tabular-nums">{formatNilai(r.k6s1)}</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">
                  {formatNilai(avg)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function DetailTableUjian({ student }: { student: Student }) {
  const rows = buildHasilUjian(student.nilai);
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No</TableHead>
            <TableHead>Mata Pelajaran</TableHead>
            <TableHead className="text-center">Tertulis</TableHead>
            <TableHead className="text-center">Praktek</TableHead>
            <TableHead className="text-center">Rata Ujian</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.subject}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-medium">{r.subject}</TableCell>
              <TableCell className="text-center tabular-nums">{formatNilai(r.tertulis)}</TableCell>
              <TableCell className="text-center tabular-nums">{formatNilai(r.praktek)}</TableCell>
              <TableCell className="text-center font-semibold tabular-nums">
                {formatNilai(r.rataUjian)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DetailTablePraktek({ student }: { student: Student }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No</TableHead>
            <TableHead>Mata Pelajaran</TableHead>
            <TableHead className="text-center">Nilai Praktek</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SUBJECTS.map((subj, i) => (
            <TableRow key={subj}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-medium">{subj}</TableCell>
              <TableCell className="text-center tabular-nums">
                {formatNilai(student.nilai.praktek[subj] ?? 0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatHistoryDescription(entry: NilaiHistoryEntry): string {
  const timestamp = new Date(entry.timestamp).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const typeLabel = {
    kurmer: "Kurmer",
    praktek: "Praktek",
    ujianTertulis: "Ujian Tertulis",
    peringkat: "Peringkat",
  }[entry.type];

  const oldVal = entry.oldValue ?? 0;
  const newVal = entry.newValue ?? 0;

  let desc = `${typeLabel}`;
  if (entry.subject) {
    desc += ` - ${entry.subject}`;
    if (entry.field) {
      desc += ` (${entry.field})`;
    }
  }
  desc += `: ${oldVal} → ${newVal}`;

  return `[${timestamp}] ${desc}`;
}

function StudentHistoryModal({
  student,
  open,
  onOpenChange,
  isMobile,
}: {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
}) {
  const fill = nilaiFillSummary(student.nilai);
  const status = NILAI_STATUS_BADGE[fill.status];

  const content = (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">
          {student.identitas.nama || "(tanpa nama)"}
        </h3>
        <p className="text-xs text-muted-foreground">
          NISN: {student.identitas.nisn} | Kelas: {student.identitas.kelas || "-"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge className={status.className} variant="outline">
            {status.label} · {fill.percent}%
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({fill.filled}/{fill.total} terisi)
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">History Pengisian Nilai</h4>
        <div className="max-h-96 overflow-y-auto space-y-1 rounded-lg border border-border bg-muted/30 p-3">
          {student.nilaiHistory.entries.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Belum ada history pengisian nilai
            </p>
          ) : (
            <div className="space-y-1">
              {student.nilaiHistory.entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded bg-card p-2 text-xs border-l-2 border-primary/30"
                >
                  <p className="font-mono text-muted-foreground">
                    {formatHistoryDescription(entry)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Total: {student.nilaiHistory.entries.length} perubahan
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>History Nilai Siswa</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>History Pengisian Nilai Siswa</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
