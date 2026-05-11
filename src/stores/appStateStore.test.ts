import { describe, expect, it } from "vitest";
import { setAppStateTenant, useAppStateStore } from "./appStateStore";

describe("appStateStore tenant isolation", () => {
  it("isolates persisted state by tenant key", async () => {
    await setAppStateTenant("u1");
    useAppStateStore.getState().setLastVisited({ pathname: "/identitas", search: "?a=1", hash: "" });
    const u1Last = useAppStateStore.getState().state.lastVisited;
    expect(u1Last?.pathname).toBe("/identitas");

    await setAppStateTenant("u2");
    const u2LastBefore = useAppStateStore.getState().state.lastVisited;
    expect(u2LastBefore).toBeUndefined();
    useAppStateStore.getState().setLastVisited({ pathname: "/siswa", search: "?q=x", hash: "" });
    const u2Last = useAppStateStore.getState().state.lastVisited;
    expect(u2Last?.pathname).toBe("/siswa");

    await setAppStateTenant("u1");
    const u1LastAgain = useAppStateStore.getState().state.lastVisited;
    expect(u1LastAgain?.pathname).toBe("/identitas");
  });
});
