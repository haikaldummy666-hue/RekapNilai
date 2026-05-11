import { describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  it("runs once with latest args after wait", () => {
    vi.useFakeTimers();
    const calls: Array<[number, string]> = [];
    const fn = (a: number, b: string) => calls.push([a, b]);
    const d = debounce(fn, 1000);

    d(1, "a");
    d(2, "b");
    expect(calls).toHaveLength(0);

    vi.advanceTimersByTime(999);
    expect(calls).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(calls).toEqual([[2, "b"]]);
    vi.useRealTimers();
  });

  it("respects maxWait even under continuous calls", () => {
    vi.useFakeTimers();
    const calls: number[] = [];
    const fn = (v: number) => calls.push(v);
    const d = debounce(fn, 1000, 30_000);

    let t = 0;
    while (t < 35_000) {
      d(t);
      vi.advanceTimersByTime(500);
      t += 500;
    }

    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0]).toBeGreaterThanOrEqual(0);
    vi.useRealTimers();
  });
});

