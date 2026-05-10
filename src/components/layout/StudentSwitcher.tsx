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
  /** Show a class filter dropdown above the student selector */
  showClassFilter?: boolean;
  className?: string;
}) {
  const students = useStudentStore((s) => s.students);
  const activeId = useStudentStore((s) => s.activeId);
  const setActive = useStudentStore((s) => s.setActive);
  const addStudent = useStudentStore((s) => s.addStudent);
  const removeStudent = useStudentStore((s) => s.removeStudent);
  const user = useAuthStore((s) => s.getCurrentUser());

  // Collect all unique non-empty classes from students
  const allKelas = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.identitas.kelas?.trim()) set.add(s.identitas.kelas.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  const activeStudent = students.find((s) => s.id === activeId);

  // Default to the active student's class (or "all" if no class set)
  const [selectedKelas, setSelectedKelas] = useState<string>(() => {
    if (showClassFilter && activeStudent?.identitas.kelas?.trim())
      return activeStudent.identitas.kelas.trim();
    return "all";
  });

  // Sync filter when active student changes externally
  useEffect(() => {
    if (!showClassFilter) return;
    const kelas = activeStudent?.identitas.kelas?.trim() ?? "";
    if (kelas && kelas !== selectedKelas) {
      setSelectedKelas(kelas);
    }
  }, [activeId, showClassFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Students visible in the dropdown (filtered by class when active)
  const visibleStudents = useMemo(() => {
    if (!showClassFilter || selectedKelas === "all") return students;
    return students.filter((s) => (s.identitas.kelas?.trim() || "") === selectedKelas);
  }, [students, showClassFilter, selectedKelas]);

  const handleKelasChange = (kelas: string) => {
    setSelectedKelas(kelas);
    if (kelas !== "all") {
      const inClass = students.filter(
        (s) => (s.identitas.kelas?.trim() || "") === kelas,
      );
      if (inClass.length > 0 && !inClass.find((s) => s.id === activeId)) {
        setActive(inClass[0].id);
      }
    }
  };

  const onAdd = () => {
    // Use selected class (or profile default) when adding a new student
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

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Class filter row */}
      {showClassFilter && allKelas.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase leading-none tracking-wide text-muted-foreground">
            Filter Kelas
          </span>
          <Select value={selectedKelas} onValueChange={handleKelasChange}>
            <SelectTrigger
              className={cn("h-9", compact ? "w-[160px] sm:w-[220px]" : "w-[200px] sm:w-[240px]")}
            >
              <SelectValue placeholder="Semua Kelas" />
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

      {/* Student selector row */}
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          {label && (
            <span className="text-[10px] uppercase leading-none tracking-wide text-muted-foreground">
              {label}
            </span>
          )}
          <Select value={activeId ?? ""} onValueChange={(v) => setActive(v)}>
            <SelectTrigger
              className={cn("h-9", compact ? "w-[160px] sm:w-[220px]" : "w-[200px] sm:w-[240px]")}
            >
              <SelectValue placeholder="Pilih siswa…" />
            </SelectTrigger>
            <SelectContent>
              {visibleStudents.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {showClassFilter && selectedKelas !== "all"
                    ? `Belum ada siswa di kelas ${selectedKelas}`
                    : "Belum ada siswa"}
                </div>
              )}
              {visibleStudents.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.identitas.nama || "(tanpa nama)"}
                  {s.identitas.kelas ? ` — ${s.identitas.kelas}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
    </div>
  );
}
