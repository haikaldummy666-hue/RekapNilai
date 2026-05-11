import { describe, expect, it } from "vitest";
import { setStudentStoreTenant, useStudentStore } from "@/stores/studentStore";
import { setAppStateTenant, useAppStateStore } from "@/stores/appStateStore";
import { applyPayload, buildLocalPayload } from "./appStateSync";
import type { UserAppStatePayload } from "./userAppStateApi";

describe("appStateSync", () => {
  it("buildLocalPayload captures studentStore + appState", () => {
    setStudentStoreTenant("sync-local");
    setAppStateTenant("sync-local");
    useStudentStore.setState({ students: [], activeId: null });
    const id = useStudentStore.getState().addStudent({ nama: "A", kelas: "6.A" });
    useAppStateStore.getState().setLastVisited({ pathname: "/identitas", search: "", hash: "" });

    const payload = buildLocalPayload();
    expect(payload.schemaVersion).toBe(1);
    expect(Array.isArray(payload.studentStore.students)).toBe(true);
    expect(payload.studentStore.activeId).toBe(id);
    expect((payload.appState as any).version).toBe(1);
  });

  it("applyPayload merges students and applies appState", () => {
    setStudentStoreTenant("sync-merge");
    setAppStateTenant("sync-merge");
    useStudentStore.setState({ students: [], activeId: null });
    const id1 = useStudentStore.getState().addStudent({ nama: "A", kelas: "6.A" });
    const s1 = useStudentStore.getState().students.find((s) => s.id === id1)!;
    const s2 = {
      ...s1,
      id: "student-b",
      identitas: { ...s1.identitas, nama: "B" },
      updatedAt: new Date().toISOString(),
    };

    const remote: UserAppStatePayload = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      studentStore: { students: [s1, s2] as any, activeId: "student-b" },
      appState: {
        version: 1,
        routes: { "/siswa": { ui: { page: 2 } } },
        updatedAt: new Date().toISOString(),
        sync: {},
      },
    };

    applyPayload(remote);
    expect(useStudentStore.getState().students).toHaveLength(2);
    expect(useStudentStore.getState().activeId).toBe("student-b");
    expect((useAppStateStore.getState().state.routes["/siswa"]?.ui as any)?.page).toBe(2);
  });
});

