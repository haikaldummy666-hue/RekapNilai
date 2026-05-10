import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  getSupabase: () => null,
}));
import {
  DEFAULT_ADMIN,
  DEFAULT_LOGO_DATA_URL,
  resolveMadrasahLogo,
  useAuthStore,
} from "./authStore";

describe("madrasah logo fallback", () => {
  it("uses default logo when profile has no logoDataUrl", () => {
    expect(resolveMadrasahLogo({ namaMadrasah: "X", alamat: "", kontak: "" })).toBe(
      DEFAULT_LOGO_DATA_URL,
    );
  });

  it("uses uploaded logo when logoDataUrl is present", () => {
    const url = "data:image/png;base64,AAA";
    expect(
      resolveMadrasahLogo({ namaMadrasah: "X", alamat: "", kontak: "", logoDataUrl: url }),
    ).toBe(url);
  });
});

describe("profile update fields", () => {
  it("returns FORBIDDEN when Supabase is not configured", async () => {
    useAuthStore.setState({ currentUser: null, session: null });
    const res = await useAuthStore.getState().updateMyProfile({
      namaKepalaMadrasah: "H. Ahmad",
      kelas: "6.A",
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("FORBIDDEN");
  });
});

describe("default admin credentials", () => {
  it("can login using DEFAULT_ADMIN", async () => {
    useAuthStore.setState({ currentUser: null, session: null });
    await useAuthStore.getState().seedDefaultAdmin();
    const res = await useAuthStore.getState().login(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("NO_SUPABASE");
  });
});
