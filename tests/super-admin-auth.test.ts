import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockQueryNeonOneAsSystem = vi.fn();
const mockQueryNeonAsSystem = vi.fn();
const mockSyncSupabaseAuthUser = vi.fn();

vi.mock("@/lib/neon-db", () => ({
  queryNeonOneAsSystem: (...args: unknown[]) => mockQueryNeonOneAsSystem(...args),
  queryNeonAsSystem: (...args: unknown[]) => mockQueryNeonAsSystem(...args),
}));

vi.mock("@/utils/supabase/admin", () => ({
  syncSupabaseAuthUser: (...args: unknown[]) => mockSyncSupabaseAuthUser(...args),
  getSupabaseAdminClient: vi.fn(),
  findSupabaseUserByEmail: vi.fn(),
}));

import {
  getConfiguredAdminEmails,
  getSuperAdminEmail,
  isConfiguredAdminEmail,
  isSuperAdminEmail,
} from "@/lib/auth/admin-emails";
import {
  ensureBootstrapSuperAdmin,
  resetBootstrapSuperAdminStateForTesting,
} from "@/lib/auth-db";

describe("Super Admin & Authoritative Admin Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    resetBootstrapSuperAdminStateForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetBootstrapSuperAdminStateForTesting();
  });

  describe("Admin Email Resolution (admin-emails.ts)", () => {
    it("correctly combines SUPERADMIN_EMAIL, ADMIN_EMAIL, and ADMIN_EMAILS without dropping any", () => {
      process.env.SUPERADMIN_EMAIL = "super@example.com";
      process.env.ADMIN_EMAIL = "admin1@example.com";
      process.env.ADMIN_EMAILS = "admin2@example.com, admin3@example.com, SUPER@example.com";

      const emails = getConfiguredAdminEmails();
      expect(emails).toEqual([
        "super@example.com",
        "admin1@example.com",
        "admin2@example.com",
        "admin3@example.com",
      ]);

      expect(isConfiguredAdminEmail("super@example.com")).toBe(true);
      expect(isConfiguredAdminEmail("SUPER@EXAMPLE.COM")).toBe(true);
      expect(isConfiguredAdminEmail("admin1@example.com")).toBe(true);
      expect(isConfiguredAdminEmail("admin2@example.com")).toBe(true);
      expect(isConfiguredAdminEmail("admin3@example.com")).toBe(true);
      expect(isConfiguredAdminEmail("regular@example.com")).toBe(false);
      expect(isConfiguredAdminEmail("")).toBe(false);
      expect(isConfiguredAdminEmail(null)).toBe(false);

      expect(isSuperAdminEmail("super@example.com")).toBe(true);
      expect(isSuperAdminEmail("admin1@example.com")).toBe(false);
    });

    it("does not ignore ADMIN_EMAIL when ADMIN_EMAILS is also set", () => {
      process.env.SUPERADMIN_EMAIL = "";
      process.env.ADMIN_EMAIL = "solo@example.com";
      process.env.ADMIN_EMAILS = "other@example.com";

      const emails = getConfiguredAdminEmails();
      expect(emails).toContain("solo@example.com");
      expect(emails).toContain("other@example.com");
    });
  });

  describe("Super Admin Bootstrap (ensureBootstrapSuperAdmin)", () => {
    it("provisions new Super Admin when account does not exist in DB", async () => {
      process.env.SUPERADMIN_EMAIL = "super@example.com";
      process.env.SUPERADMIN_PASSWORD = "SuperSecretPassword123!";
      process.env.SUPERADMIN_USERNAME = "super";
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_EMAILS;

      mockQueryNeonOneAsSystem
        .mockResolvedValueOnce(null) // existingAuth -> not found
        .mockResolvedValueOnce(null); // usernameTakenByOther -> false

      mockSyncSupabaseAuthUser.mockResolvedValueOnce({
        success: true,
        userId: "sb-superadmin-uuid",
      });

      await ensureBootstrapSuperAdmin();

      // Verify profile creation with role admin
      expect(mockQueryNeonAsSystem).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO public.profiles"),
        expect.arrayContaining(["platform admin"]),
      );

      // Verify auth_users insertion
      expect(mockQueryNeonAsSystem).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO public.auth_users"),
        expect.arrayContaining(["super@example.com"]),
      );

      // Verify Supabase Auth synchronization with role admin and email_confirm: true
      expect(mockSyncSupabaseAuthUser).toHaveBeenCalledWith({
        email: "super@example.com",
        password: "SuperSecretPassword123!",
        name: "super",
        role: "admin",
        emailConfirm: true,
      });

      // Verify linking neon_auth_user_id in DB
      expect(mockQueryNeonAsSystem).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE public.auth_users"),
        expect.arrayContaining(["sb-superadmin-uuid"]),
      );
    });

    it("preserves existing password_hash if already set in auth_users", async () => {
      process.env.SUPERADMIN_EMAIL = "super@example.com";
      process.env.SUPERADMIN_PASSWORD = "NewPassword123!";
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_EMAILS;

      mockQueryNeonOneAsSystem
        .mockResolvedValueOnce({
          user_id: "existing-uuid-1",
          password_hash: "$argon2id$v=19$m=19456,t=2,p=1$alreadyexistinghash",
          neon_auth_user_id: null,
        })
        .mockResolvedValueOnce(null); // username check

      mockSyncSupabaseAuthUser.mockResolvedValueOnce({
        success: true,
        userId: "sb-superadmin-uuid",
      });

      await ensureBootstrapSuperAdmin();

      // Does NOT call INSERT INTO public.auth_users
      const insertAuthCalls = mockQueryNeonAsSystem.mock.calls.filter((c) =>
        String(c[0]).includes("INSERT INTO public.auth_users"),
      );
      expect(insertAuthCalls).toHaveLength(0);

      // Does NOT call UPDATE public.auth_users SET password_hash
      const updateHashCalls = mockQueryNeonAsSystem.mock.calls.filter((c) =>
        String(c[0]).includes("SET password_hash"),
      );
      expect(updateHashCalls).toHaveLength(0);
    });

    it("safely retries on transient database failure and does not cache failure", async () => {
      process.env.SUPERADMIN_EMAIL = "super@example.com";
      process.env.SUPERADMIN_PASSWORD = "Password123!";

      mockQueryNeonOneAsSystem.mockRejectedValueOnce(
        new Error("Connection pool timeout"),
      );

      // First run fails with DB error
      await expect(ensureBootstrapSuperAdmin()).rejects.toThrow("Connection pool timeout");

      // Second run succeeds because failure was not permanently cached
      mockQueryNeonOneAsSystem
        .mockResolvedValueOnce({ user_id: "uid", password_hash: "hash", neon_auth_user_id: "sb" })
        .mockResolvedValueOnce(null);
      mockSyncSupabaseAuthUser.mockResolvedValueOnce({ success: true, userId: "sb" });

      await expect(ensureBootstrapSuperAdmin()).resolves.toBeUndefined();
    });

    it("deduplicates concurrent in-flight bootstrap calls", async () => {
      process.env.SUPERADMIN_EMAIL = "super@example.com";
      process.env.SUPERADMIN_PASSWORD = "Password123!";

      mockQueryNeonOneAsSystem
        .mockResolvedValue({ user_id: "uid", password_hash: "hash", neon_auth_user_id: "sb" });
      mockSyncSupabaseAuthUser.mockResolvedValue({ success: true, userId: "sb" });

      // Run multiple concurrent calls
      const [r1, r2, r3] = await Promise.all([
        ensureBootstrapSuperAdmin(),
        ensureBootstrapSuperAdmin(),
        ensureBootstrapSuperAdmin(),
      ]);

      expect(r1).toBeUndefined();
      expect(r2).toBeUndefined();
      expect(r3).toBeUndefined();
    });
  });
});

