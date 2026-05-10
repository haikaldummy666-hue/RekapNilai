import { Plus, Trash2 } from "lucide-react";
import { useStudentStore } from "@/stores/studentStore";
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
  className,
}: {
  label?: string;
  compact?: boolean;
  showRemove?: boolean;
  className?: string;
}) {
  const students = useStudentStore((s) => s.students);
  const activeId = useStudentStore((s) => s.activeId);
  const setActive = useStudentStore((s) => s.setActive);
  const addStudent = useStudentStore((s) => s.addStudent);
  const removeStudent = useStudentStore((s) => s.removeStudent);

  const onAdd = () => {
    const id = addStudent({ nama: `Siswa ${students.length + 1}` });
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
    <div className={cn("flex items-end gap-2", className)}>
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
            {students.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Belum ada siswa</div>
            )}
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.identitas.nama || "(tanpa nama)"}
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
  );
}
