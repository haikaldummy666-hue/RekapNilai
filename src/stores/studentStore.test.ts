import { describe, expect, it } from "vitest";
import { SUBJECTS } from "@/data/subjects";
import {
  collectKelasList,
  filterStudentsByKelas,
  setStudentStoreTenant,
  useStudentStore,
} from "./studentStore";
import { nilaiFillSummary } from "@/utils/calculateUtils";

describe("studentStore class helpers", () => {
  it("collectKelasList returns unique trimmed sorted kelas", () => {
    setStudentStoreTenant("test-kelas-1");
    useStudentStore.setState({ students: [], activeId: null });
    useStudentStore.getState().addStudentsBulk([
      { nama: "A", kelas: "6.A" },
      { nama: "B", kelas: " 6.A " },
      { nama: "C", kelas: "6.B" },
      { nama: "D", kelas: "" },
    ]);

    const students = useStudentStore.getState().students;
    expect(collectKelasList(students)).toEqual(["6.A", "6.B"]);
  });

  it("filterStudentsByKelas filters only students in selected kelas", () => {
    setStudentStoreTenant("test-kelas-2");
    useStudentStore.setState({ students: [], activeId: null });
    useStudentStore.getState().addStudentsBulk([
      { nama: "A", kelas: "6.A" },
      { nama: "B", kelas: "6.B" },
      { nama: "C", kelas: "6.A" },
    ]);

    const students = useStudentStore.getState().students;
    const filtered = filterStudentsByKelas(students, "6.A");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((s) => (s.identitas.kelas || "").trim() === "6.A")).toBe(true);
  });
});

describe("studentStore nilai history isolation and status accuracy", () => {
  it("history changes apply only to the targeted student and status matches current nilai", () => {
    setStudentStoreTenant("test-history-1");
    useStudentStore.setState({ students: [], activeId: null });
    const st = useStudentStore.getState();
    const [id1, id2] = st.addStudentsBulk([{ nama: "A", kelas: "6.A" }, { nama: "B", kelas: "6.A" }]);

    const subject = SUBJECTS[0]!;
    st.updateKurmer(id1!, subject, "k5s1", 75);

    const s1 = useStudentStore.getState().students.find((s) => s.id === id1)!;
    const s2 = useStudentStore.getState().students.find((s) => s.id === id2)!;

    expect(s1.nilaiHistory.entries.length).toBe(1);
    expect(s2.nilaiHistory.entries.length).toBe(0);
    expect(s1.nilaiHistory.entries).not.toBe(s2.nilaiHistory.entries);

    const status1 = nilaiFillSummary(s1.nilai).status;
    const status2 = nilaiFillSummary(s2.nilai).status;
    expect(status1).toBe("in progress");
    expect(status2).toBe("not started");
  });
});

