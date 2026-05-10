import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStudentStore } from "@/stores/studentStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function StudentSwitcher({
  label,
  compact,
  showRemove = true,
  showClassFilter = false,
  className,
}: {
  label?: string;
  compact?: boolean;
  showRemove?: boolean;
  /** Show a class filter dropdown beside the student selector */
  showClassFilter?: boolean;
  className?: string;
}) {
  const students = useStudentStore((s) => s.students);
  const activeId = useStudentStore((s) => s.activeId);
  const setActive = useStudentStore((s) => s.setActive);
  const addStudent = useStudentStore((s) => s.addStudent);
  const removeStudent = useStudentStore((s) => s.removeStudent);
  const user = useAuthStore((s) => s.getCurrentUser());

  // Collect all unique non-empty classes from students, sorted
  const allKelas = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const k = s.identitas.kelas?.trim();
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [students]);

  const activeStudent = students.find((s) => s.id === activeId);

  // Initialise filter to the active student's class (or "all")
  const [selectedKelas, setSelectedKelas] = useState<string>(() => {
    if (showClassFilter) {
      const k = activeStudent?.identitas.kelas?.trim();
      return k || "all";
    }
    return "all";
  });

  // Sync filter when the active student changes externally
  useEffect(() => {
    if (!showClassFilter) return;
    const k = activeStudent?.identitas.kelas?.trim() ?? "";
    if (k && k !== selectedKelas) setSelectedKelas(k);
  }, [activeId, showClassFilter]);

  // Students visible in the student dropdown (filtered by selected class)
  const visibleStudents = useMemo(() => {
    if (!showClassFilter || selectedKelas === "all") return students;
    return students.filter(
      (s) => (s.identitas.kelas?.trim() || "") === selectedKelas,
    );
  }, [students, showClassFilter, selectedKelas]);

  const handleKelasChange = (kelas: string) => {
    setSelectedKelas(kelas);
    if (kelas !== "all") {
      // If the active student is not in the newly selected class, switch to first
      const inClass = students.filter(
        (s) => (s.identitas.kelas?.trim() || "") === kelas,
      );
      if (inClass.length > 0 && !inClass.find((s) => s.id === activeId)) {
        setActive(inClass[0].id);
      }
    }
  };

  const onAdd = () => {
    const defaultKelas =
      selectedKelas !== "all"
        ? selectedKelas
        : (user?.profile.kelas?.trim() ?? "");
    const id = addStudent({ nama: `Siswa ${students.length + 1}`, kelas: defaultKelas });
    setActive(id);
    toast.success("Siswa baru ditambahkan");
  };

  const onRemove = () => {
    if (!activeId) return;
    if (!confirm("Hapus siswa aktif?")) return;
    removeStudent(activeId);
    toast.success("Siswa dihapus");
  };

  const selectWidth = compact ? "w-[150px] sm:w-[190px]" : "w-[190px] sm:w-[230px]";

  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      {/* ── Class filter dropdown (inline, same row) ── */}
      {showClassFilter && allKelas.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase leading-none tracking-wide text-muted-foreground">
            Kelas
          </span>
          <Select value={selectedKelas} onValueChange={handleKelasChange}>
            <SelectTrigger className={cn("h-9", compact ? "w-[110px] sm:w-[130px]" : "w-[130px] sm:w-[150px]")}>
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {allKelas.map((k) => (
                <SelectItem key={k} value={k}>
                  Kelas {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Student dropdown ── */}
      <div className="flex flex-col gap-1">
        {label && (
          <span className="text-[10px] uppercase leading-none tracking-wide text-muted-foreground">
            {label}
          </span>
        )}
        <Select value={activeId ?? ""} onValueChange={(v) => setActive(v)}>
          <SelectTrigger className={cn("h-9", selectWidth)}>
            <SelectValue placeholder="Pilih siswa…" />
          </SelectTrigger>
          <SelectContent>
            {visibleStudents.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {showClassFilter && selectedKelas !== "all"
                  ? `Belum ada siswa di kelas ${selectedKelas}`
                  : "Belum ada siswa"}
              </div>
            ) : (
              visibleStudents.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.identitas.nama || "(tanpa nama)"}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* ── Action buttons ── */}
      <Button size="icon" variant="outline" onClick={onAdd} aria-label="Tambah siswa">
        <Plus className="h-4 w-4" />
      </Button>
      {showRemove && activeId && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          aria-label="Hapus siswa aktif"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
