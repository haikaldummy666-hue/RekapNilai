import { SUBJECTS, type Subject } from "@/data/subjects";
import type { NilaiSiswa } from "@/types/student.types";

function mkRecord<T>(fn: (s: Subject, i: number) => T): Record<Subject, T> {
  const o = {} as Record<Subject, T>;
  SUBJECTS.forEach((s, i) => (o[s] = fn(s, i)));
  return o;
}

export function emptyNilai(): NilaiSiswa {
  return {
    kurmer: mkRecord(() => ({ k5s1: 0, k5s2: 0, k6s1: 0 })),
    praktek: mkRecord(() => 0),
    ujianTertulis: mkRecord(() => 0),
    peringkatKelas: undefined,
  };
}
