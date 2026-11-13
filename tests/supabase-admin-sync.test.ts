import { describe, expect, it, vi, beforeEach } from "vitest";

const mockListUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUserById = vi.fn();
const mockGetUserById = vi.fn();

const mockClient = {
  auth: {
    admin: {
      listUsers: (...args: unknown[]) => mockListUsers(...args),
      createUser: (...args: unknown[]) => mockCreateUser(...args),
      updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      getUserById: (...args: unknown[]) => mockGetUserById(...args),
    },
  },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockClient,
}));

import {
  syncSupabaseAuthUser,
  findSupabaseUserByEmail,
  SupabaseAdminError,
  getSupabaseProjectHostDiagnostics,
} from "@/utils/supabase/admin";

describe("syncSupabaseAuthUser & findSupabaseUserByEmail", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "test-secret-key";
  });

  describe("findSupabaseUserByEmail", () => {
    it("finds user across pages", async () => {
      // 100 dummy users on page 1 so pagination continues to page 2
      const page1Users = Array.from({ length: 100 }, (_, i) => ({ id: `dummy-${i}`, email: `dummy${i}@example.com` }));
      mockListUsers
        .mockResolvedValueOnce({
          data: { users: page1Users },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { users: [{ id: "u2", email: "target@example.com" }] },
          error: null,
        });

      const user = await findSupabaseUserByEmail(mockClient as any, "target@example.com");
      expect(user).toMatchObject({ id: "u2", email: "target@example.com" });
    });

    it("returns null when user not found", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: { users: [] },
        error: null,
      });

      const user = await findSupabaseUserByEmail(mockClient as any, "missing@example.com");
      expect(user).toBeNull();
    });
    it("throws SupabaseAdminError when listUsers returns an API error", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid API key", status: 401 },
      });

      await expect(
        findSupabaseUserByEmail(mockClient as any, "err@example.com"),
      ).rejects.toThrow(SupabaseAdminError);
    });
  });

  describe("syncSupabaseAuthUser", () => {
    it("does NOT call createUser if listUsers fails with an error", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: null,
        error: { message: "Internal server error in Supabase", status: 500 },
      });

      const res = await syncSupabaseAuthUser({
        email: "lookupfail@example.com",
        password: "Password123!",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Supabase user lookup failed");
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("preserves leading and trailing spaces in passwords during user creation", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: { users: [] },
        error: null,
      });

      mockCreateUser.mockResolvedValueOnce({
        data: { user: { id: "spaced-user-id", email: "spaced@example.com" } },
        error: null,
      });

      const res = await syncSupabaseAuthUser({
        email: "spaced@example.com",
        password: "  Password With Spaces  ",
      });

      expect(res.success).toBe(true);
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: "spaced@example.com",
        password: "  Password With Spaces  ",
        email_confirm: true,
        user_metadata: undefined,
      });
    });
    it("creates a new user with confirmed email when they do not exist", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: { users: [] },
        error: null,
      });

      mockCreateUser.mockResolvedValueOnce({
        data: { user: { id: "new-user-id", email: "new@example.com" } },
        error: null,
      });

      const res = await syncSupabaseAuthUser({
        email: "new@example.com",
        password: "SecurePassword123!",
        name: "Newbie",
      });

      expect(res.success).toBe(true);
      expect(res.userId).toBe("new-user-id");
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "SecurePassword123!",
        email_confirm: true,
        user_metadata: { name: "Newbie" },
      });
    });

    it("updates existing user password and confirms email when they already exist", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: { users: [{ id: "existing-user-id", email: "existing@example.com" }] },
        error: null,
      });

      mockUpdateUserById.mockResolvedValueOnce({
        data: { user: { id: "existing-user-id" } },
        error: null,
      });

      const res = await syncSupabaseAuthUser({
        email: "existing@example.com",
        password: "UpdatedPassword123!",
        name: "Updated Name",
      });

      expect(res.success).toBe(true);
      expect(res.userId).toBe("existing-user-id");
      expect(mockUpdateUserById).toHaveBeenCalledWith("existing-user-id", {
        password: "UpdatedPassword123!",
        email_confirm: true,
        user_metadata: { name: "Updated Name" },
      });
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("handles race condition or 422 conflict by finding existing user and updating credentials", async () => {
      // 1. Initial listUsers finds nothing
      mockListUsers.mockResolvedValueOnce({
        data: { users: [] },
        error: null,
      });

      // 2. createUser returns 422 email_exists error
      mockCreateUser.mockResolvedValueOnce({
        data: null,
        error: {
          status: 422,
          code: "email_exists",
          message: "A user with this email address has already been registered",
        },
      });

      // 3. Fallback findSupabaseUserByEmail finds the existing user
      mockListUsers.mockResolvedValueOnce({
        data: { users: [{ id: "race-user-id", email: "conflict@example.com" }] },
        error: null,
      });

      // 4. updateUserById updates the user successfully
      mockUpdateUserById.mockResolvedValueOnce({
        data: { user: { id: "race-user-id" } },
        error: null,
      });

      const res = await syncSupabaseAuthUser({
        email: "conflict@example.com",
        password: "RacePassword123!",
        name: "Race User",
      });

      expect(res.success).toBe(true);
      expect(res.userId).toBe("race-user-id");
      expect(mockUpdateUserById).toHaveBeenCalledWith("race-user-id", {
        password: "RacePassword123!",
        email_confirm: true,
        user_metadata: { name: "Race User" },
      });
    });

    it("returns error when admin client is not configured", async () => {
      delete process.env.SUPABASE_SECRET_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_KEY;

      const res = await syncSupabaseAuthUser({
        email: "noadmin@example.com",
        password: "Password123!",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Supabase admin client not configured");
    });

    it("preserves unrelated existing user_metadata and app_metadata when updating user", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "existing-user-meta-id",
              email: "meta@example.com",
              user_metadata: { existing_custom_attr: "keep_me", avatar_url: "https://example.com/pic.png" },
              app_metadata: { existing_app_attr: "keep_app_me" },
            },
          ],
        },
        error: null,
      });

      mockUpdateUserById.mockResolvedValueOnce({
        data: {
          user: {
            id: "existing-user-meta-id",
            email_confirmed_at: "2026-11-13T10:00:00Z",
          },
        },
        error: null,
      });

      const res = await syncSupabaseAuthUser({
        email: "meta@example.com",
        password: "UpdatedPassword123!",
        name: "New Name",
        role: "admin",
      });

      expect(res.success).toBe(true);
      expect(mockUpdateUserById).toHaveBeenCalledWith(
        "existing-user-meta-id",
        expect.objectContaining({
          password: "UpdatedPassword123!",
          email_confirm: true,
          user_metadata: {
            existing_custom_attr: "keep_me",
            avatar_url: "https://example.com/pic.png",
            name: "New Name",
            role: "admin",
          },
          app_metadata: {
            existing_app_attr: "keep_app_me",
            role: "admin",
          },
        }),
      );
    });

    it("fails with descriptive error if Supabase Admin API returns non-null error on update", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: { users: [{ id: "existing-fail-id", email: "fail@example.com" }] },
        error: null,
      });

      mockUpdateUserById.mockResolvedValueOnce({
        data: null,
        error: { message: "Database connection failed in Supabase Auth", status: 500 },
      });

      const res = await syncSupabaseAuthUser({
        email: "fail@example.com",
        password: "Password123!",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Database connection failed in Supabase Auth");
    });

    it("fails with descriptive error if Supabase Admin API fails to confirm email", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: { users: [{ id: "existing-unconf-id", email: "unconf@example.com" }] },
        error: null,
      });

      mockUpdateUserById.mockResolvedValueOnce({
        data: {
          user: {
            id: "existing-unconf-id",
            email_confirmed_at: null,
          },
        },
        error: null,
      });

      const res = await syncSupabaseAuthUser({
        email: "unconf@example.com",
        password: "Password123!",
        emailConfirm: true,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("email confirmation timestamp was not set");
    });
  });

  describe("getSupabaseProjectHostDiagnostics", () => {
    it("reports consistency when NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL match", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://rolhwjcnkkrcxtyqicoj.supabase.co";
      process.env.SUPABASE_URL = "https://rolhwjcnkkrcxtyqicoj.supabase.co";

      const diag = getSupabaseProjectHostDiagnostics();
      expect(diag.publicHost).toBe("rolhwjcnkkrcxtyqicoj.supabase.co");
      expect(diag.serverHost).toBe("rolhwjcnkkrcxtyqicoj.supabase.co");
      expect(diag.isConsistent).toBe(true);
    });

    it("reports mismatch when NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL point to different projects", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://baprchzvczbbeowzfrga.supabase.co";
      process.env.SUPABASE_URL = "https://rolhwjcnkkrcxtyqicoj.supabase.co";

      const diag = getSupabaseProjectHostDiagnostics();
      expect(diag.publicHost).toBe("baprchzvczbbeowzfrga.supabase.co");
      expect(diag.serverHost).toBe("rolhwjcnkkrcxtyqicoj.supabase.co");
      expect(diag.isConsistent).toBe(false);
    });
  });
});
