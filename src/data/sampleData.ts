import { SUBJECTS, type Subject } from "@/data/subjects";
import type { NilaiSiswa, Student } from "@/types/student.types";

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

const BASE = [85, 88, 86, 84, 82, 87, 89, 83, 86, 90, 88, 84, 86];

export function sampleNilai(): NilaiSiswa {
  return {
    kurmer: mkRecord((_s, i) => ({
      k5s1: BASE[i] - 2,
      k5s2: BASE[i] - 1,
      k6s1: BASE[i] + 1,
    })),
    praktek: mkRecord((_s, i) => BASE[i] + 2),
    ujianTertulis: mkRecord((_s, i) => BASE[i]),
    peringkatKelas: 3,
  };
}

export function sampleStudent(): Student {
  return {
    id: crypto.randomUUID(),
    identitas: {
      nisn: "0123456789",
      noUjian: "06-001-001",
      nama: "Ahmad Fauzan Hakim",
      jenisKelamin: "L",
      tempatLahir: "Sukabumi",
      tanggalLahir: "2014-03-22",
      namaAyah: "H. Muhammad Hakim",
      namaIbu: "Hj. Siti Aminah",
      kelas: "6.A",
    },
    nilai: sampleNilai(),
    nilaiHistory: { entries: [] },
    updatedAt: new Date().toISOString(),
  };
}
