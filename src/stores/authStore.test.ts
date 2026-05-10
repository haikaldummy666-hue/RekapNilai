import { describe, expect, it } from "vitest";
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
  it("persists kepala madrasah and kelas for current user", () => {
    useAuthStore.setState({
      users: [
        {
          id: "m1",
          role: "madrasah",
          status: "active",
          email: "m1@test.local",
          passwordHash: "x",
          profile: { namaMadrasah: "Madrasah", alamat: "", kontak: "" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      session: {
        userId: "m1",
        token: "t",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      },
      audit: [],
    });

    const res = useAuthStore.getState().updateMyProfile({
      namaKepalaMadrasah: "H. Ahmad",
      kelas: "6.A",
    });
    expect(res.ok).toBe(true);
    const u = useAuthStore.getState().getCurrentUser();
    expect(u?.profile.namaKepalaMadrasah).toBe("H. Ahmad");
    expect(u?.profile.kelas).toBe("6.A");
  });
});

describe("default admin credentials", () => {
  it("can login using DEFAULT_ADMIN", async () => {
    useAuthStore.setState({ users: [], session: null, audit: [] });
    await useAuthStore.getState().seedDefaultAdmin();
    const res = await useAuthStore.getState().login(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
    expect(res.ok).toBe(true);
  });
});
