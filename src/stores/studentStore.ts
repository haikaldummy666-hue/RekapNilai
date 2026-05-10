/**
 * Store utama: daftar siswa + siswa aktif.
 * Persist via Zustand `persist` ke localStorage.
 *
 * Catatan migrasi: shape data didesain agar mudah dipindah ke Supabase/
 * Firebase nanti — cukup ganti adapter persist tanpa ubah komponen.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Identitas, NilaiSiswa, Student } from "@/types/student.types";
import type { NilaiHistoryEntry } from "@/types/nilai.types";
import { emptyNilai, sampleStudent } from "@/data/sampleData";
import type { Subject } from "@/data/subjects";

const memoryStorage = (() => {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
  return storage;
})();

function safeStorage(): Storage {
  if (typeof window === "undefined") return memoryStorage;
  return window.localStorage;
}

export type StudentStoreSnapshot = {
  version: 2;
  exportedAt: string;
  students: Student[];
  activeId: string | null;
};

interface StudentState {
  students: Student[];
  activeId: string | null;

  // selectors
  getActive: () => Student | null;

  // CRUD
  addStudent: (identitas?: Partial<Identitas>) => string;
  addStudentsBulk: (identitasList: Partial<Identitas>[]) => string[];
  removeStudent: (id: string) => void;
  setActive: (id: string) => void;

  // updates
  updateIdentitas: (id: string, patch: Partial<Identitas>) => void;
  updateKurmer: (
    id: string,
    subject: Subject,
    field: "k5s1" | "k5s2" | "k6s1",
    value: number,
  ) => void;
  updatePraktek: (id: string, subject: Subject, value: number) => void;
  updateUjianTertulis: (id: string, subject: Subject, value: number) => void;
  applyUjianKelasBulk: (
    updates: Array<{
      id: string;
      ujianTertulis?: Partial<Record<Subject, number>>;
      praktek?: Partial<Record<Subject, number>>;
    }>,
  ) => { updated: number; skipped: number };
  updatePeringkat: (id: string, value: number | undefined) => void;
  setNilai: (id: string, nilai: NilaiSiswa) => void;

  // utilities
  loadSample: () => void;
  resetActive: () => void;
  resetAll: () => void;
  exportSnapshot: () => StudentStoreSnapshot;
  importSnapshot: (
    snapshot: unknown,
    mode?: "replace" | "merge",
  ) => { added: number; updated: number; skipped: number };
}

const defaultIdentitas: Identitas = {
  nisn: "",
  noUjian: "",
  nama: "Siswa Baru",
  jenisKelamin: "L",
  tempatLahir: "",
  tanggalLahir: "",
  namaAyah: "",
  namaIbu: "",
  kelas: "",
};

function newStudent(identitas?: Partial<Identitas>): Student {
  return {
    id: crypto.randomUUID(),
    identitas: { ...defaultIdentitas, ...identitas },
    nilai: emptyNilai(),
    nilaiHistory: { entries: [] },
    updatedAt: new Date().toISOString(),
  };
}

function touch(s: Student): Student {
  return { ...s, updatedAt: new Date().toISOString() };
}

function addHistoryEntry(
  s: Student,
  entry: Omit<NilaiHistoryEntry, "timestamp">
): Student {
  return {
    ...s,
    nilaiHistory: {
      entries: [
        ...s.nilaiHistory.entries,
        { ...entry, timestamp: new Date().toISOString() },
      ],
    },
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeIdentitas(raw: unknown): Identitas | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const jenisKelamin = r.jenisKelamin === "P" ? "P" : "L";
  return {
    nisn: typeof r.nisn === "string" ? r.nisn : "",
    noUjian: typeof r.noUjian === "string" ? r.noUjian : "",
    nama: typeof r.nama === "string" ? r.nama : "Siswa Baru",
    jenisKelamin,
    tempatLahir: typeof r.tempatLahir === "string" ? r.tempatLahir : "",
    tanggalLahir: typeof r.tanggalLahir === "string" ? r.tanggalLahir : "",
    namaAyah: typeof r.namaAyah === "string" ? r.namaAyah : "",
    namaIbu: typeof r.namaIbu === "string" ? r.namaIbu : "",
    kelas: typeof r.kelas === "string" ? r.kelas : "",
  };
}

function sanitizeNilai(raw: unknown): NilaiSiswa {
  const base = emptyNilai();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const kurmer = (typeof r.kurmer === "object" && r.kurmer ? r.kurmer : {}) as Record<
    string,
    unknown
  >;
  const praktek = (typeof r.praktek === "object" && r.praktek ? r.praktek : {}) as Record<
    string,
    unknown
  >;
  const ujianTertulis = (
    typeof r.ujianTertulis === "object" && r.ujianTertulis ? r.ujianTertulis : {}
  ) as Record<string, unknown>;

  const out: NilaiSiswa = {
    kurmer: base.kurmer,
    praktek: base.praktek,
    ujianTertulis: base.ujianTertulis,
    peringkatKelas:
      typeof r.peringkatKelas === "number" && Number.isFinite(r.peringkatKelas)
        ? r.peringkatKelas
        : undefined,
  };

  (Object.keys(base.kurmer) as Subject[]).forEach((s) => {
    const row = kurmer[s] as Record<string, unknown> | undefined;
    out.kurmer[s] = {
      k5s1: typeof row?.k5s1 === "number" ? row.k5s1 : 0,
      k5s2: typeof row?.k5s2 === "number" ? row.k5s2 : 0,
      k6s1: typeof row?.k6s1 === "number" ? row.k6s1 : 0,
    };
    out.praktek[s] = typeof praktek[s] === "number" ? (praktek[s] as number) : 0;
    out.ujianTertulis[s] = typeof ujianTertulis[s] === "number" ? (ujianTertulis[s] as number) : 0;
  });

  return out;
}

function sanitizeStudent(raw: unknown): Student | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : "";
  if (!id) return null;
  const identitas = sanitizeIdentitas(r.identitas);
  if (!identitas) return null;
  const nilai = sanitizeNilai(r.nilai);
  const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString();
  
  // Sanitize nilaiHistory
  let nilaiHistory = { entries: [] as NilaiHistoryEntry[] };
  if (
    typeof r.nilaiHistory === "object" &&
    r.nilaiHistory &&
    Array.isArray((r.nilaiHistory as any).entries)
  ) {
    const entries = (r.nilaiHistory as any).entries;
    nilaiHistory.entries = entries.filter((e: any) => {
      return (
        typeof e.timestamp === "string" &&
        typeof e.type === "string" &&
        (e.type === "kurmer" || e.type === "praktek" || e.type === "ujianTertulis" || e.type === "peringkat")
      );
    });
  }
  
  return { id, identitas, nilai, nilaiHistory, updatedAt };
}

function isSnapshot(raw: unknown): raw is StudentStoreSnapshot {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return r.version === 2 && Array.isArray(r.students);
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set, get) => ({
      students: [],
      activeId: null,

      getActive: () => {
        const { students, activeId } = get();
        return students.find((s) => s.id === activeId) ?? null;
      },

      addStudent: (identitas) => {
        const s = newStudent(identitas);
        set((st) => ({ students: [...st.students, s], activeId: s.id }));
        return s.id;
      },

      addStudentsBulk: (identitasList) => {
        const created = identitasList.map((identitas) => newStudent(identitas));
        set((st) => ({
          students: [...st.students, ...created],
          activeId: created[created.length - 1]?.id ?? st.activeId,
        }));
        return created.map((s) => s.id);
      },

      removeStudent: (id) =>
        set((st) => {
          const students = st.students.filter((s) => s.id !== id);
          const activeId = st.activeId === id ? (students[0]?.id ?? null) : st.activeId;
          return { students, activeId };
        }),

      setActive: (id) => set({ activeId: id }),

      updateIdentitas: (id, patch) =>
        set((st) => ({
          students: st.students.map((s) =>
            s.id === id ? touch({ ...s, identitas: { ...s.identitas, ...patch } }) : s,
          ),
        })),

      updateKurmer: (id, subject, field, value) =>
        set((st) => ({
          students: st.students.map((s) => {
            if (s.id !== id) return s;
            const oldValue = s.nilai.kurmer[subject][field];
            if (oldValue === value) return s; // No change
            const row = { ...s.nilai.kurmer[subject], [field]: value };
            return addHistoryEntry(
              touch({
                ...s,
                nilai: { ...s.nilai, kurmer: { ...s.nilai.kurmer, [subject]: row } },
              }),
              {
                type: "kurmer",
                subject,
                field,
                oldValue,
                newValue: value,
              }
            );
          }),
        })),

      updatePraktek: (id, subject, value) =>
        set((st) => ({
          students: st.students.map((s) => {
            if (s.id !== id) return s;
            const oldValue = s.nilai.praktek[subject];
            if (oldValue === value) return s; // No change
            return addHistoryEntry(
              touch({
                ...s,
                nilai: {
                  ...s.nilai,
                  praktek: { ...s.nilai.praktek, [subject]: value },
                },
              }),
              {
                type: "praktek",
                subject,
                oldValue,
                newValue: value,
              }
            );
          }),
        })),

      updateUjianTertulis: (id, subject, value) =>
        set((st) => ({
          students: st.students.map((s) => {
            if (s.id !== id) return s;
            const oldValue = s.nilai.ujianTertulis[subject];
            if (oldValue === value) return s; // No change
            return addHistoryEntry(
              touch({
                ...s,
                nilai: {
                  ...s.nilai,
                  ujianTertulis: { ...s.nilai.ujianTertulis, [subject]: value },
                },
              }),
              {
                type: "ujianTertulis",
                subject,
                oldValue,
                newValue: value,
              }
            );
          }),
        })),

      applyUjianKelasBulk: (updates) => {
        const byId = new Map(updates.map((u) => [u.id, u] as const));
        let updated = 0;
        let skipped = 0;
        set((st) => ({
          students: st.students.map((s) => {
            const upd = byId.get(s.id);
            if (!upd) return s;
            const nextUjian = upd.ujianTertulis
              ? { ...s.nilai.ujianTertulis, ...upd.ujianTertulis }
              : s.nilai.ujianTertulis;
            const nextPraktek = upd.praktek
              ? { ...s.nilai.praktek, ...upd.praktek }
              : s.nilai.praktek;
            const changed = nextUjian !== s.nilai.ujianTertulis || nextPraktek !== s.nilai.praktek;
            if (!changed) {
              skipped++;
              return s;
            }
            updated++;
            let result = touch({
              ...s,
              nilai: { ...s.nilai, ujianTertulis: nextUjian, praktek: nextPraktek },
            });
            
            // Add history entries for changed values
            if (upd.ujianTertulis) {
              Object.entries(upd.ujianTertulis).forEach(([subject, newValue]) => {
                if (newValue !== undefined) {
                  const oldValue = s.nilai.ujianTertulis[subject as Subject];
                  if (oldValue !== newValue) {
                    result = addHistoryEntry(result, {
                      type: "ujianTertulis",
                      subject: subject as Subject,
                      oldValue,
                      newValue,
                    });
                  }
                }
              });
            }
            
            if (upd.praktek) {
              Object.entries(upd.praktek).forEach(([subject, newValue]) => {
                if (newValue !== undefined) {
                  const oldValue = s.nilai.praktek[subject as Subject];
                  if (oldValue !== newValue) {
                    result = addHistoryEntry(result, {
                      type: "praktek",
                      subject: subject as Subject,
                      oldValue,
                      newValue,
                    });
                  }
                }
              });
            }
            
            return result;
          }),
        }));
        return { updated, skipped };
      },

      updatePeringkat: (id, value) =>
        set((st) => ({
          students: st.students.map((s) => {
            if (s.id !== id) return s;
            const oldValue = s.nilai.peringkatKelas;
            if (oldValue === value) return s; // No change
            return addHistoryEntry(
              touch({ ...s, nilai: { ...s.nilai, peringkatKelas: value } }),
              {
                type: "peringkat",
                oldValue,
                newValue: value,
              }
            );
          }),
        })),

      setNilai: (id, nilai) =>
        set((st) => ({
          students: st.students.map((s) => {
            if (s.id !== id) return s;
            
            let result: Student = { ...s, nilai };
            const oldNilai = s.nilai;
            
            // Track kurmer changes
            Object.entries(nilai.kurmer).forEach(([subject, newRow]) => {
              const oldRow = oldNilai.kurmer[subject as Subject];
              (["k5s1", "k5s2", "k6s1"] as const).forEach((field) => {
                if (oldRow[field] !== newRow[field]) {
                  result = addHistoryEntry(result, {
                    type: "kurmer",
                    subject: subject as Subject,
                    field,
                    oldValue: oldRow[field],
                    newValue: newRow[field],
                  });
                }
              });
            });
            
            // Track praktek changes
            Object.entries(nilai.praktek).forEach(([subject, newValue]) => {
              const oldValue = oldNilai.praktek[subject as Subject];
              if (oldValue !== newValue) {
                result = addHistoryEntry(result, {
                  type: "praktek",
                  subject: subject as Subject,
                  oldValue,
                  newValue,
                });
              }
            });
            
            // Track ujianTertulis changes
            Object.entries(nilai.ujianTertulis).forEach(([subject, newValue]) => {
              const oldValue = oldNilai.ujianTertulis[subject as Subject];
              if (oldValue !== newValue) {
                result = addHistoryEntry(result, {
                  type: "ujianTertulis",
                  subject: subject as Subject,
                  oldValue,
                  newValue,
                });
              }
            });
            
            // Track peringkat changes
            if (oldNilai.peringkatKelas !== nilai.peringkatKelas) {
              result = addHistoryEntry(result, {
                type: "peringkat",
                oldValue: oldNilai.peringkatKelas,
                newValue: nilai.peringkatKelas,
              });
            }
            
            return touch(result);
          }),
        })),

      loadSample: () => {
        const s = sampleStudent();
        set((st) => ({ students: [...st.students, s], activeId: s.id }));
      },

      resetActive: () =>
        set((st) => ({
          students: st.students.map((s) => {
            if (s.id !== st.activeId) return s;
            
            let result = touch({ ...s, nilai: emptyNilai(), nilaiHistory: { entries: [] } });
            return result;
          }),
        })),

      resetAll: () => set({ students: [], activeId: null }),

      exportSnapshot: () => {
        const { students, activeId } = get();
        return {
          version: 2,
          exportedAt: new Date().toISOString(),
          students,
          activeId,
        };
      },

      importSnapshot: (snapshot, mode = "replace") => {
        if (!isSnapshot(snapshot)) return { added: 0, updated: 0, skipped: 0 };

        const incoming = snapshot.students.map(sanitizeStudent).filter(Boolean) as Student[];
        if (mode === "replace") {
          set({
            students: incoming,
            activeId: incoming.some((s) => s.id === snapshot.activeId)
              ? snapshot.activeId
              : (incoming[0]?.id ?? null),
          });
          return { added: incoming.length, updated: 0, skipped: 0 };
        }

        const current = get().students;
        const byId = new Map(current.map((s) => [s.id, s] as const));
        let added = 0;
        let updated = 0;
        let skipped = 0;

        for (const s of incoming) {
          const prev = byId.get(s.id);
          if (!prev) {
            byId.set(s.id, s);
            added++;
            continue;
          }
          const prevTime = Date.parse(prev.updatedAt);
          const nextTime = Date.parse(s.updatedAt);
          if (Number.isFinite(prevTime) && Number.isFinite(nextTime) && nextTime < prevTime) {
            skipped++;
            continue;
          }
          byId.set(s.id, s);
          updated++;
        }

        const merged = Array.from(byId.values());
        const activeId = merged.some((s) => s.id === snapshot.activeId)
          ? snapshot.activeId
          : (get().activeId ?? merged[0]?.id ?? null);
        set({ students: merged, activeId });
        return { added, updated, skipped };
      },
    }),
    {
      name: "rekap-nilai-mi-v1",
      version: 2,
      storage: createJSONStorage(() => safeStorage()),
      migrate: (persistedState) => {
        const st = persistedState as Partial<StudentState> | undefined;
        const students = Array.isArray(st?.students)
          ? st!.students.map(sanitizeStudent).filter(Boolean)
          : [];
        const activeId =
          typeof st?.activeId === "string" && students.some((s) => s.id === st.activeId)
            ? st.activeId
            : null;
        return { students, activeId } as StudentState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.students.length === 0) {
          // Manually create a new student instead of calling addStudent() to avoid re-triggering rehydration
          const freshStudent = newStudent();
          state.students.push(freshStudent);
          state.activeId = freshStudent.id;
          return;
        }
        if (!state.activeId) {
          state.activeId = state.students[0]!.id;
        }
      },
    },
  ),
);

export function setStudentStoreTenant(tenantKey: string) {
  const key = tenantKey.trim() ? tenantKey.trim() : "public";
  const name = `rekap-nilai-mi-v1:${key}`;
  useStudentStore.setState({ students: [], activeId: null });
  useStudentStore.persist.setOptions({ name });
  useStudentStore.persist.rehydrate();
}
