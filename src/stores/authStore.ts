import { create } from "zustand";
import { getSupabase } from "@/lib/supabaseClient";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "madrasah";
export type UserStatus = "active" | "pending" | "disabled";

export type MadrasahProfile = {
  namaMadrasah: string;
  alamat: string;
  kontak: string;
  logoDataUrl?: string;
  logoFileName?: string;
  namaKepalaMadrasah?: string;
  kelas?: string;
};

export type AuthUser = {
  id: string;
  role: UserRole;
  status: UserStatus;
  email: string;
  profile: MadrasahProfile;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

// Shape from madrasah_profiles table
type DbProfile = {
  id: string;
  role: UserRole;
  status: UserStatus;
  email: string;
  nama_madrasah: string;
  alamat: string;
  kontak: string;
  logo_url: string | null;
  kepala_madrasah: string | null;
  kelas_format: string | null;
  created_at: string;
  updated_at: string;
};

function dbProfileToAuthUser(p: DbProfile, emailFallback?: string): AuthUser {
  return {
    id: p.id,
    role: p.role,
    status: p.status,
    email: p.email || emailFallback || "",
    profile: {
      namaMadrasah: p.nama_madrasah,
      alamat: p.alamat,
      kontak: p.kontak,
      logoDataUrl: p.logo_url ?? undefined,
      namaKepalaMadrasah: p.kepala_madrasah ?? undefined,
      kelas: p.kelas_format ?? undefined,
    },
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export const DEFAULT_LOGO_DATA_URL =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22c55e"/>
      <stop offset="1" stop-color="#14b8a6"/>
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="224" height="224" rx="48" fill="url(#g)"/>
  <path d="M64 108c0-22.091 17.909-40 40-40h48c22.091 0 40 17.909 40 40v40c0 22.091-17.909 40-40 40h-48c-22.091 0-40-17.909-40-40v-40z" fill="rgba(0,0,0,0.15)"/>
  <text x="128" y="148" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system" font-size="64" font-weight="800" fill="#ffffff">MI</text>
</svg>`,
  );

export function resolveMadrasahLogo(profile?: MadrasahProfile | null): string {
  const v = profile?.logoDataUrl;
  return v && v.trim().length > 0 ? v : DEFAULT_LOGO_DATA_URL;
}

type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "PENDING" | "DISABLED" | "NO_SUPABASE" };

type RegisterResult =
  | { ok: true }
  | { ok: false; reason: "EMAIL_EXISTS" | "NO_SUPABASE" | "ERROR"; message?: string };

type ApproveResult =
  | { ok: true }
  | { ok: false; reason: "FORBIDDEN" | "NOT_FOUND" | "ERROR" };

type UpsertResult =
  | { ok: true; user?: AuthUser }
  | { ok: false; reason: "FORBIDDEN" | "NOT_FOUND" | "ERROR" | "EMAIL_EXISTS"; message?: string };

interface AuthState {
  currentUser: AuthUser | null;
  session: Session | null;

  // Getters
  getCurrentUser: () => AuthUser | null;
  getDisplayIdentity: () => string;

  // Internal setters
  _setUser: (user: AuthUser | null) => void;
  _setSession: (session: Session | null) => void;

  // Auth actions
  initSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  registerMadrasah: (input: {
    namaMadrasah: string;
    email: string;
    password: string;
    alamat?: string;
    kontak?: string;
    logoDataUrl?: string;
  }) => Promise<RegisterResult>;

  // Admin actions
  fetchPendingUsers: () => Promise<AuthUser[]>;
  fetchAllMadrasah: () => Promise<AuthUser[]>;
  approveMadrasah: (userId: string) => Promise<ApproveResult>;
  disableUser: (userId: string) => Promise<UpsertResult>;
  adminCreateMadrasah: (input: {
    namaMadrasah: string;
    email: string;
    password: string;
    alamat?: string;
    kontak?: string;
  }) => Promise<UpsertResult>;

  // Profile
  updateMyProfile: (patch: Partial<MadrasahProfile>) => Promise<UpsertResult>;
  seedDefaultAdmin: () => Promise<void>;
}

export const DEFAULT_ADMIN = {
  email:
    (import.meta.env.VITE_DEFAULT_ADMIN_EMAIL as string | undefined) ?? "adminhaikal@rekap.data",
  password:
    (import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD as string | undefined) ??
    "haikalrekapnilai60707295",
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  session: null,

  getCurrentUser: () => get().currentUser,

  getDisplayIdentity: () => {
    const u = get().currentUser;
    if (!u) return "—";
    if (u.role === "admin") return "Admin";
    return u.profile.namaMadrasah || "Madrasah";
  },

  _setUser: (user) => set({ currentUser: user }),
  _setSession: (session) => set({ session }),

  // Initialize session on app load
  initSession: async () => {
    const sb = getSupabase();
    if (!sb) return;

    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      set({ currentUser: null, session: null });
      return;
    }

    set({ session });

    // Fetch profile from DB
    const { data: profile } = await sb
      .from("madrasah_profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      const user = dbProfileToAuthUser(profile as DbProfile, session.user.email ?? "");
      set({ currentUser: user });
    }

    // Listen to auth changes
    sb.auth.onAuthStateChange(async (event, newSession) => {
      set({ session: newSession });
      if (!newSession) {
        set({ currentUser: null });
        return;
      }
      const { data: p } = await sb
        .from("madrasah_profiles")
        .select("*")
        .eq("id", newSession.user.id)
        .single();
      if (p) {
        set({ currentUser: dbProfileToAuthUser(p as DbProfile, newSession.user.email) });
      }
    });
  },

  login: async (email, password) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, reason: "NO_SUPABASE" };

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { ok: false, reason: "INVALID_CREDENTIALS" };
    }

    // Get profile to check status
    const { data: profile } = await sb
      .from("madrasah_profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (!profile) return { ok: false, reason: "INVALID_CREDENTIALS" };

    const p = profile as DbProfile;
    if (p.status === "pending") {
      await sb.auth.signOut();
      return { ok: false, reason: "PENDING" };
    }
    if (p.status === "disabled") {
      await sb.auth.signOut();
      return { ok: false, reason: "DISABLED" };
    }

    const user = dbProfileToAuthUser(p, data.user.email ?? email);
    set({ currentUser: user, session: data.session });
    return { ok: true, user };
  },

  logout: async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    set({ currentUser: null, session: null });
  },

  registerMadrasah: async (input) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, reason: "NO_SUPABASE" };

    const { data, error } = await sb.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          nama_madrasah: input.namaMadrasah,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("email")) {
        return { ok: false, reason: "EMAIL_EXISTS" };
      }
      return { ok: false, reason: "ERROR", message: error.message };
    }

    if (!data.user) return { ok: false, reason: "ERROR", message: "Gagal mendaftar" };

    // Update profile with extra data (trigger creates it, we patch it)
    await sb
      .from("madrasah_profiles")
      .update({
        email: input.email.toLowerCase().trim(),
        nama_madrasah: input.namaMadrasah.trim(),
        alamat: input.alamat?.trim() ?? "",
        kontak: input.kontak?.trim() ?? "",
        logo_url: input.logoDataUrl ?? null,
        status: "pending",
        role: "madrasah",
      })
      .eq("id", data.user.id);

    // Sign out immediately — must wait for admin approval
    await sb.auth.signOut();
    return { ok: true };
  },

  fetchPendingUsers: async () => {
    const sb = getSupabase();
    if (!sb) return [];

    const { data } = await sb
      .from("madrasah_profiles")
      .select("*")
      .eq("status", "pending")
      .eq("role", "madrasah")
      .order("created_at", { ascending: true });

    if (!data) return [];

    // Get emails from auth.users via admin API — not available with anon key
    // We'll store email in madrasah_profiles instead — use a workaround
    return (data as DbProfile[]).map((p) =>
      dbProfileToAuthUser(p, p.id), // id as placeholder for email
    );
  },

  fetchAllMadrasah: async () => {
    const sb = getSupabase();
    if (!sb) return [];

    const { data } = await sb
      .from("madrasah_profiles")
      .select("*")
      .eq("role", "madrasah")
      .order("created_at", { ascending: false });

    if (!data) return [];
    return (data as DbProfile[]).map((p) => dbProfileToAuthUser(p, p.id));
  },

  approveMadrasah: async (userId) => {
    const sb = getSupabase();
    const admin = get().currentUser;
    if (!sb || !admin || admin.role !== "admin") return { ok: false, reason: "FORBIDDEN" };

    const { error } = await sb
      .from("madrasah_profiles")
      .update({ status: "active" })
      .eq("id", userId);

    if (error) return { ok: false, reason: "ERROR" };
    return { ok: true };
  },

  disableUser: async (userId) => {
    const sb = getSupabase();
    const admin = get().currentUser;
    if (!sb || !admin || admin.role !== "admin") return { ok: false, reason: "FORBIDDEN" };

    const { error } = await sb
      .from("madrasah_profiles")
      .update({ status: "disabled" })
      .eq("id", userId);

    if (error) return { ok: false, reason: "ERROR" };
    return { ok: true };
  },

  adminCreateMadrasah: async (input) => {
    const sb = getSupabase();
    const admin = get().currentUser;
    if (!sb || !admin || admin.role !== "admin") return { ok: false, reason: "FORBIDDEN" };

    const { data, error } = await sb.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { nama_madrasah: input.namaMadrasah } },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return { ok: false, reason: "EMAIL_EXISTS" };
      }
      return { ok: false, reason: "ERROR", message: error.message };
    }
    if (!data.user) return { ok: false, reason: "ERROR", message: "Gagal membuat akun" };

    await sb
      .from("madrasah_profiles")
      .update({
        nama_madrasah: input.namaMadrasah.trim(),
        alamat: input.alamat?.trim() ?? "",
        kontak: input.kontak?.trim() ?? "",
        status: "active",
        role: "madrasah",
      })
      .eq("id", data.user.id);

    return { ok: true };
  },

  updateMyProfile: async (patch) => {
    const sb = getSupabase();
    const user = get().currentUser;
    if (!sb || !user) return { ok: false, reason: "FORBIDDEN" };

    const update: Partial<DbProfile> = {};
    if (patch.namaMadrasah !== undefined) update.nama_madrasah = patch.namaMadrasah.trim();
    if (patch.alamat !== undefined) update.alamat = patch.alamat.trim();
    if (patch.kontak !== undefined) update.kontak = patch.kontak.trim();
    if (patch.logoDataUrl !== undefined) update.logo_url = patch.logoDataUrl;
    if (patch.namaKepalaMadrasah !== undefined) update.kepala_madrasah = patch.namaKepalaMadrasah.trim();
    if (patch.kelas !== undefined) update.kelas_format = patch.kelas.trim();

    const { error } = await sb
      .from("madrasah_profiles")
      .update(update)
      .eq("id", user.id);

    if (error) return { ok: false, reason: "ERROR", message: error.message };

    // Refresh current user
    const { data: newProfile } = await sb
      .from("madrasah_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (newProfile) {
      set({ currentUser: dbProfileToAuthUser(newProfile as DbProfile, user.email) });
    }

    return { ok: true };
  },

  // For Supabase, admin seeding is done via Supabase Dashboard
  // This is a no-op kept for interface compatibility
  seedDefaultAdmin: async () => {},
}));
