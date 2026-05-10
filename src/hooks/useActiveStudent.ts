import { useStudentStore } from "@/stores/studentStore";

export function useActiveStudent() {
  return useStudentStore((s) => s.students.find((x) => x.id === s.activeId) ?? null);
}
