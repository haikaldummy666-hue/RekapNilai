import { describe, expect, it } from "vitest";
import { emptyNilai } from "@/data/sampleData";
import { SUBJECTS } from "@/data/subjects";
import { nilaiFillSummary } from "./calculateUtils";

describe("nilaiFillSummary", () => {
  it("returns not started when all values are empty/default", () => {
    const nilai = emptyNilai();
    const res = nilaiFillSummary(nilai);
    expect(res.status).toBe("not started");
    expect(res.filled).toBe(0);
    expect(res.percent).toBe(0);
  });

  it("returns in progress when partially filled", () => {
    const nilai = emptyNilai();
    const s0 = SUBJECTS[0]!;
    nilai.kurmer[s0] = { ...nilai.kurmer[s0], k5s1: 80 };
    const res = nilaiFillSummary(nilai);
    expect(res.status).toBe("in progress");
    expect(res.filled).toBeGreaterThan(0);
    expect(res.percent).toBeGreaterThan(0);
    expect(res.percent).toBeLessThan(100);
  });

  it("returns completed when all fields are filled", () => {
    const nilai = emptyNilai();
    for (const s of SUBJECTS) {
      nilai.kurmer[s] = { k5s1: 80, k5s2: 80, k6s1: 80 };
      nilai.ujianTertulis[s] = 80;
      nilai.praktek[s] = 80;
    }
    nilai.peringkatKelas = 1;
    const res = nilaiFillSummary(nilai);
    expect(res.status).toBe("completed");
    expect(res.percent).toBe(100);
    expect(res.filled).toBe(res.total);
  });
});

