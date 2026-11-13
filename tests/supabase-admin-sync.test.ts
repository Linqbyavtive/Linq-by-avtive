import { describe, expect, it, vi, beforeEach } from "vitest";

const mockListUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUserById = vi.fn();

const mockClient = {
  auth: {
    admin: {
      listUsers: (...args: unknown[]) => mockListUsers(...args),
      createUser: (...args: unknown[]) => mockCreateUser(...args),
      updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
    },
  },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockClient,
}));

import {
  syncSupabaseAuthUser,
  findSupabaseUserByEmail,
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
      expect(user).toEqual({ id: "u2", email: "target@example.com" });
    });

    it("returns null when user not found", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: { users: [] },
        error: null,
      });

      const user = await findSupabaseUserByEmail(mockClient as any, "missing@example.com");
      expect(user).toBeNull();
    });
  });

  describe("syncSupabaseAuthUser", () => {
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
  });
});
