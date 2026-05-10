import { useStudentStore } from "@/stores/studentStore";
import { useMemo } from "react";

export function useActiveStudent() {
  const activeId = useStudentStore((s) => s.activeId);
  const students = useStudentStore((s) => s.students);

  return useMemo(
    () => students.find((s) => s.id === activeId) ?? null,
    [activeId, students]
  );
}
