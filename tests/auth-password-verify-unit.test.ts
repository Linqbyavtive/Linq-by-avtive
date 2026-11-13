import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import argon2 from "argon2";

const mockQueryNeonOneAsSystem = vi.fn();
const mockQueryNeonAsSystem = vi.fn();

vi.mock("@/lib/neon-db", () => ({
  queryNeonOneAsSystem: (...args: unknown[]) => mockQueryNeonOneAsSystem(...args),
  queryNeonAsSystem: (...args: unknown[]) => mockQueryNeonAsSystem(...args),
}));

import {
  verifyPassword,
  AuthInfrastructureError,
  linkAuthUserToNeonAuthUser,
} from "@/lib/auth-db";

describe("verifyPassword & legacy password verification unit tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SUPERADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.SUPERADMIN_EMAIL;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_EMAILS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("verifies unpeppered Argon2 password successfully", async () => {
    const plainPassword = "SecretPassword123!";
    const hash = await argon2.hash(plainPassword);

    mockQueryNeonOneAsSystem.mockResolvedValueOnce({
      user_id: "user-uuid-1",
      email: "legacy@example.com",
      password_hash: hash,
      role: "user",
      username: "legacyuser",
      organization_name: "Acme",
    });

    const user = await verifyPassword("legacy@example.com", plainPassword);
    expect(user).not.toBeNull();
    expect(user?.user_id).toBe("user-uuid-1");
    expect(user?.username).toBe("legacyuser");
  });

  it("verifies peppered Argon2 password successfully when PASSWORD_PEPPER is set", async () => {
    const plainPassword = "SecretPassword123!";
    const pepper = "super-secret-pepper-string";
    process.env.PASSWORD_PEPPER = pepper;

    const hash = await argon2.hash(`${plainPassword}${pepper}`);

    mockQueryNeonOneAsSystem.mockResolvedValueOnce({
      user_id: "user-uuid-2",
      email: "peppered@example.com",
      password_hash: hash,
      role: "admin",
      username: "pepperuser",
      organization_name: "SecurityOrg",
    });

    const user = await verifyPassword("peppered@example.com", plainPassword);
    expect(user).not.toBeNull();
    expect(user?.user_id).toBe("user-uuid-2");
    expect(user?.role).toBe("admin");
  });

  it("verifies peppered password even if PASSWORD_PEPPER has quotes", async () => {
    const plainPassword = "SecretPassword123!";
    const cleanPepper = "some-clean-pepper";
    process.env.PASSWORD_PEPPER = `"${cleanPepper}"`;

    const hash = await argon2.hash(`${plainPassword}${cleanPepper}`);

    mockQueryNeonOneAsSystem.mockResolvedValueOnce({
      user_id: "user-uuid-3",
      email: "quoted@example.com",
      password_hash: hash,
      role: "user",
      username: "quoteduser",
    });

    const user = await verifyPassword("quoted@example.com", plainPassword);
    expect(user).not.toBeNull();
    expect(user?.user_id).toBe("user-uuid-3");
  });

  it("returns null on incorrect password without throwing", async () => {
    const hash = await argon2.hash("CorrectPassword123!");

    mockQueryNeonOneAsSystem.mockResolvedValueOnce({
      user_id: "user-uuid-4",
      email: "wrong@example.com",
      password_hash: hash,
      role: "user",
      username: "wronguser",
    });

    const user = await verifyPassword("wrong@example.com", "WrongPassword999!");
    expect(user).toBeNull();
  });

  it("returns null when user is not found in database", async () => {
    mockQueryNeonOneAsSystem.mockResolvedValueOnce(null);

    const user = await verifyPassword("missing@example.com", "Password123!");
    expect(user).toBeNull();
  });

  it("returns null when user exists but has no password_hash", async () => {
    mockQueryNeonOneAsSystem.mockResolvedValueOnce({
      user_id: "user-uuid-5",
      email: "nopass@example.com",
      password_hash: null,
      role: "user",
      username: "nopass",
    });

    const user = await verifyPassword("nopass@example.com", "Password123!");
    expect(user).toBeNull();
  });

  it("throws AuthInfrastructureError when database connection fails", async () => {
    mockQueryNeonOneAsSystem.mockRejectedValueOnce(new Error("Connection terminated unexpectedly"));

    await expect(verifyPassword("error@example.com", "Password123!")).rejects.toThrow(
      AuthInfrastructureError,
    );
  });

  it("linkAuthUserToNeonAuthUser updates neon_auth_user_id and backfills email_normalized", async () => {
    // 1. already linked check: returns null (not linked yet)
    mockQueryNeonOneAsSystem.mockResolvedValueOnce(null);
    // 2. find by email: returns existing user
    mockQueryNeonOneAsSystem.mockResolvedValueOnce({ user_id: "target-user-123" });
    // 3. update query
    mockQueryNeonAsSystem.mockResolvedValueOnce([]);

    const linkedId = await linkAuthUserToNeonAuthUser("sb-user-789", "User@Example.COM");
    expect(linkedId).toBe("target-user-123");

    expect(mockQueryNeonAsSystem).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE public.auth_users"),
      ["sb-user-789", "user@example.com", "target-user-123"],
    );
  });
});
