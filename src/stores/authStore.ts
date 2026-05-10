import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  passwordHash: string;
  profile: MadrasahProfile;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

export type AuthSession = {
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

export type AuditAction =
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "AUTH_REGISTER_MADRASAH"
  | "ADMIN_CREATE_MADRASAH"
  | "ADMIN_APPROVE_MADRASAH"
  | "ADMIN_DISABLE_USER"
  | "PROFILE_UPDATE";

export type AuditLog = {
  id: string;
  at: string;
  actorId?: string;
  action: AuditAction;
  targetId?: string;
  meta?: Record<string, unknown>;
};

type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "PENDING" | "DISABLED" };

type RegisterResult = { ok: true; user: AuthUser } | { ok: false; reason: "EMAIL_EXISTS" };

type UpsertResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "EMAIL_EXISTS" | "FORBIDDEN" | "NOT_FOUND" };

type ApproveResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "FORBIDDEN" | "NOT_FOUND" };

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string) {
  const anyCrypto = crypto as unknown as {
    subtle?: SubtleCrypto;
    hash?: (alg: string, data: string) => string;
  };
  if (anyCrypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await anyCrypto.subtle.digest("SHA-256", data);
    return toHex(new Uint8Array(digest));
  }
  if (typeof anyCrypto.hash === "function") {
    return anyCrypto.hash("sha256", input);
  }
  throw new Error("Crypto tidak tersedia untuk hashing password");
}

async function hashPassword(email: string, password: string) {
  const e = normalizeEmail(email);
  const p = password;
  return sha256Hex(`rekap-nilai-mi:v1:${e}:${p}`);
}

export async function hashPasswordLocal(email: string, password: string) {
  return hashPassword(email, password);
}

function defaultAdminUser(): AuthUser {
  const createdAt = nowIso();
  return {
    id: "admin",
    role: "admin",
    status: "active",
    email: DEFAULT_ADMIN.email,
    passwordHash: "",
    profile: { namaMadrasah: "Admin", alamat: "", kontak: "" },
    createdAt,
    updatedAt: createdAt,
  };
}

function ensureAdminSeed(users: AuthUser[]): AuthUser[] {
  if (users.some((u) => u.role === "admin")) return users;
  return [...users, defaultAdminUser()];
}

function touchUser(u: AuthUser, patch: Partial<AuthUser>): AuthUser {
  return { ...u, ...patch, updatedAt: nowIso() };
}

function safeStorage(): Storage {
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

  if (typeof window === "undefined") return memoryStorage;
  return window.localStorage;
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

interface AuthState {
  users: AuthUser[];
  session: AuthSession | null;
  audit: AuditLog[];

  getCurrentUser: () => AuthUser | null;
  getDisplayIdentity: () => string;
  seedDefaultAdmin: () => Promise<void>;

  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;

  registerMadrasah: (input: {
    namaMadrasah: string;
    email: string;
    password: string;
    alamat?: string;
    kontak?: string;
    logoDataUrl?: string;
  }) => Promise<RegisterResult>;

  adminCreateMadrasah: (input: {
    namaMadrasah: string;
    email: string;
    password: string;
    alamat?: string;
    kontak?: string;
    logoDataUrl?: string;
  }) => Promise<UpsertResult>;

  approveMadrasah: (userId: string) => ApproveResult;
  disableUser: (userId: string) => UpsertResult;

  updateMyProfile: (patch: Partial<MadrasahProfile>) => UpsertResult;
}

export const DEFAULT_ADMIN = {
  email:
    (import.meta.env.VITE_DEFAULT_ADMIN_EMAIL as string | undefined) ?? "adminhaikal@rekap.data",
  password:
    (import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD as string | undefined) ??
    "haikalrekapnilai60707295",
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: ensureAdminSeed([]),
      session: null,
      audit: [],

      getCurrentUser: () => {
        const { session, users } = get();
        if (!session) return null;
        return users.find((u) => u.id === session.userId) ?? null;
      },

      getDisplayIdentity: () => {
        const u = get().getCurrentUser();
        if (!u) return "—";
        if (u.role === "admin") return "Admin";
        return u.profile.namaMadrasah || "Madrasah";
      },

      seedDefaultAdmin: async () => {
        const { users } = get();
        const nextUsers = ensureAdminSeed(users);
        const admin = nextUsers.find((u) => u.role === "admin")!;
        const shouldPatchEmail =
          normalizeEmail(admin.email) !== normalizeEmail(DEFAULT_ADMIN.email);
        const desiredPasswordHash = await hashPassword(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
        const shouldPatchPassword = admin.passwordHash !== desiredPasswordHash;
        let finalUsers = nextUsers;
        if (shouldPatchEmail || shouldPatchPassword) {
          const patched = touchUser(admin, {
            email: DEFAULT_ADMIN.email,
            passwordHash: desiredPasswordHash,
          });
          finalUsers = nextUsers.map((u) => (u.id === patched.id ? patched : u));
        }
        if (finalUsers !== users) set({ users: finalUsers });
      },

      login: async (email, password) => {
        const e = normalizeEmail(email);
        const { users } = get();
        const user = users.find((u) => normalizeEmail(u.email) === e);
        if (!user) return { ok: false, reason: "INVALID_CREDENTIALS" };
        if (user.status === "pending") return { ok: false, reason: "PENDING" };
        if (user.status === "disabled") return { ok: false, reason: "DISABLED" };

        const passwordHash = await hashPassword(user.email, password);
        if (passwordHash !== user.passwordHash) return { ok: false, reason: "INVALID_CREDENTIALS" };

        const createdAt = nowIso();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
        const session: AuthSession = {
          userId: user.id,
          token: crypto.randomUUID(),
          createdAt,
          expiresAt,
        };

        set((st) => ({
          session,
          users: st.users.map((u) =>
            u.id === user.id ? touchUser(u, { lastLoginAt: createdAt }) : u,
          ),
          audit: [
            { id: crypto.randomUUID(), at: createdAt, actorId: user.id, action: "AUTH_LOGIN" },
            ...st.audit,
          ].slice(0, 500),
        }));

        return { ok: true, user: get().getCurrentUser()! };
      },

      logout: () => {
        const u = get().getCurrentUser();
        const at = nowIso();
        set((st) => ({
          session: null,
          audit: [
            { id: crypto.randomUUID(), at, actorId: u?.id, action: "AUTH_LOGOUT" },
            ...st.audit,
          ].slice(0, 500),
        }));
      },

      registerMadrasah: async (input) => {
        const email = normalizeEmail(input.email);
        const { users } = get();
        if (users.some((u) => normalizeEmail(u.email) === email)) {
          return { ok: false, reason: "EMAIL_EXISTS" };
        }

        const createdAt = nowIso();
        const passwordHash = await hashPassword(email, input.password);
        const user: AuthUser = {
          id: crypto.randomUUID(),
          role: "madrasah",
          status: "pending",
          email,
          passwordHash,
          profile: {
            namaMadrasah: input.namaMadrasah.trim(),
            alamat: input.alamat?.trim() ?? "",
            kontak: input.kontak?.trim() ?? "",
            logoDataUrl: input.logoDataUrl,
          },
          createdAt,
          updatedAt: createdAt,
        };

        set((st) => ({
          users: ensureAdminSeed([...st.users, user]),
          audit: [
            {
              id: crypto.randomUUID(),
              at: createdAt,
              actorId: user.id,
              action: "AUTH_REGISTER_MADRASAH",
              targetId: user.id,
              meta: { email: user.email, namaMadrasah: user.profile.namaMadrasah },
            },
            ...st.audit,
          ].slice(0, 500),
        }));

        return { ok: true, user };
      },

      adminCreateMadrasah: async (input) => {
        const admin = get().getCurrentUser();
        if (!admin || admin.role !== "admin") return { ok: false, reason: "FORBIDDEN" };

        const email = normalizeEmail(input.email);
        const { users } = get();
        if (users.some((u) => normalizeEmail(u.email) === email)) {
          return { ok: false, reason: "EMAIL_EXISTS" };
        }

        const createdAt = nowIso();
        const passwordHash = await hashPassword(email, input.password);
        const user: AuthUser = {
          id: crypto.randomUUID(),
          role: "madrasah",
          status: "active",
          email,
          passwordHash,
          profile: {
            namaMadrasah: input.namaMadrasah.trim(),
            alamat: input.alamat?.trim() ?? "",
            kontak: input.kontak?.trim() ?? "",
            logoDataUrl: input.logoDataUrl,
          },
          createdAt,
          updatedAt: createdAt,
        };

        set((st) => ({
          users: ensureAdminSeed([...st.users, user]),
          audit: [
            {
              id: crypto.randomUUID(),
              at: createdAt,
              actorId: admin.id,
              action: "ADMIN_CREATE_MADRASAH",
              targetId: user.id,
              meta: { email: user.email, namaMadrasah: user.profile.namaMadrasah },
            },
            ...st.audit,
          ].slice(0, 500),
        }));

        return { ok: true, user };
      },

      approveMadrasah: (userId) => {
        const admin = get().getCurrentUser();
        if (!admin || admin.role !== "admin") return { ok: false, reason: "FORBIDDEN" };

        const { users } = get();
        const user = users.find((u) => u.id === userId);
        if (!user) return { ok: false, reason: "NOT_FOUND" };

        const at = nowIso();
        const patched = touchUser(user, { status: "active" });
        set((st) => ({
          users: st.users.map((u) => (u.id === userId ? patched : u)),
          audit: [
            {
              id: crypto.randomUUID(),
              at,
              actorId: admin.id,
              action: "ADMIN_APPROVE_MADRASAH",
              targetId: userId,
              meta: { email: user.email, namaMadrasah: user.profile.namaMadrasah },
            },
            ...st.audit,
          ].slice(0, 500),
        }));

        return { ok: true, user: patched };
      },

      disableUser: (userId) => {
        const admin = get().getCurrentUser();
        if (!admin || admin.role !== "admin") return { ok: false, reason: "FORBIDDEN" };

        const { users, session } = get();
        const user = users.find((u) => u.id === userId);
        if (!user) return { ok: false, reason: "NOT_FOUND" };

        const at = nowIso();
        const patched = touchUser(user, { status: "disabled" });
        set((st) => ({
          users: st.users.map((u) => (u.id === userId ? patched : u)),
          session: session?.userId === userId ? null : session,
          audit: [
            {
              id: crypto.randomUUID(),
              at,
              actorId: admin.id,
              action: "ADMIN_DISABLE_USER",
              targetId: userId,
              meta: { email: user.email },
            },
            ...st.audit,
          ].slice(0, 500),
        }));

        return { ok: true, user: patched };
      },

      updateMyProfile: (patch) => {
        const user = get().getCurrentUser();
        if (!user) return { ok: false, reason: "FORBIDDEN" };

        const at = nowIso();
        const nextProfile: MadrasahProfile = {
          ...user.profile,
          ...patch,
          namaMadrasah: (patch.namaMadrasah ?? user.profile.namaMadrasah).trim(),
          alamat: (patch.alamat ?? user.profile.alamat).trim(),
          kontak: (patch.kontak ?? user.profile.kontak).trim(),
          namaKepalaMadrasah: (patch.namaKepalaMadrasah ?? user.profile.namaKepalaMadrasah)?.trim(),
          kelas: (patch.kelas ?? user.profile.kelas)?.trim(),
          logoFileName: (patch.logoFileName ?? user.profile.logoFileName)?.trim(),
        };
        const patched = touchUser(user, { profile: nextProfile });
        set((st) => ({
          users: st.users.map((u) => (u.id === user.id ? patched : u)),
          audit: [
            {
              id: crypto.randomUUID(),
              at,
              actorId: user.id,
              action: "PROFILE_UPDATE",
              targetId: user.id,
              meta: { namaMadrasah: nextProfile.namaMadrasah },
            },
            ...st.audit,
          ].slice(0, 500),
        }));

        return { ok: true, user: patched };
      },
    }),
    {
      name: "rekap-auth-v1",
      version: 1,
      storage: createJSONStorage(() => safeStorage()),
      migrate: (persistedState) => {
        const st = persistedState as Partial<AuthState> | undefined;
        const users = Array.isArray(st?.users) ? (st!.users as AuthUser[]) : [];
        const audit = Array.isArray(st?.audit) ? (st!.audit as AuditLog[]) : [];
        const session = (st?.session ?? null) as AuthSession | null;

        const nextUsers = ensureAdminSeed(
          users.filter((u) => u && typeof u === "object" && typeof (u as AuthUser).id === "string"),
        );

        const now = Date.now();
        const validSession =
          session &&
          typeof session.expiresAt === "string" &&
          Date.parse(session.expiresAt) > now &&
          nextUsers.some((u) => u.id === session.userId && u.status === "active");

        return {
          users: nextUsers,
          audit: audit.slice(0, 500),
          session: validSession ? session : null,
        } as AuthState;
      },
      partialize: (st) => ({
        users: st.users,
        session: st.session,
        audit: st.audit,
      }),
    },
  ),
);
