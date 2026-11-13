import { describe, expect, it, vi, beforeEach } from "vitest";

const mockVerifyPassword = vi.fn();
const mockLinkAuthUserToNeonAuthUser = vi.fn();
const mockValidateCsrfOrigin = vi.fn();
const mockSyncSupabaseAuthUser = vi.fn();

vi.mock("@/lib/auth-db", () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
  linkAuthUserToNeonAuthUser: (...args: unknown[]) => mockLinkAuthUserToNeonAuthUser(...args),
}));

vi.mock("@/lib/security/csrf", () => ({
  validateCsrfOrigin: (...args: unknown[]) => mockValidateCsrfOrigin(...args),
}));

vi.mock("@/utils/supabase/admin", () => ({
  syncSupabaseAuthUser: (...args: unknown[]) => mockSyncSupabaseAuthUser(...args),
}));

import { POST } from "@/app/api/auth/migrate-legacy-login/route";

describe("POST /api/auth/migrate-legacy-login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateCsrfOrigin.mockReturnValue({ ok: true });
    mockVerifyPassword.mockResolvedValue(null);
    mockLinkAuthUserToNeonAuthUser.mockResolvedValue("user-123");
    mockSyncSupabaseAuthUser.mockResolvedValue({ success: true, userId: "sb-uid-123" });
  });

  it("rejects when CSRF validation fails", async () => {
    mockValidateCsrfOrigin.mockReturnValueOnce({ ok: false, reason: "CSRF token mismatch." });

    const req = new Request("http://localhost:3000/api/auth/migrate-legacy-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "Password123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("CSRF");
  });

  it("rejects malformed email", async () => {
    const req = new Request("http://localhost:3000/api/auth/migrate-legacy-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email", password: "Password123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid legacy password with 401", async () => {
    mockVerifyPassword.mockResolvedValueOnce(null);

    const req = new Request("http://localhost:3000/api/auth/migrate-legacy-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "WrongPassword123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Invalid email or password");
    expect(mockSyncSupabaseAuthUser).not.toHaveBeenCalled();
  });

  it("synchronizes user with Supabase Auth when legacy password matches", async () => {
    mockVerifyPassword.mockResolvedValueOnce({
      user_id: "user-123",
      email: "user@example.com",
      username: "alice",
    });

    mockSyncSupabaseAuthUser.mockResolvedValueOnce({
      success: true,
      userId: "supabase-uuid-999",
    });

    const req = new Request("http://localhost:3000/api/auth/migrate-legacy-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "ValidPassword123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.canMigrate).toBe(true);
    expect(body.data.migrated).toBe(true);
    expect(body.data.name).toBe("alice");

    expect(mockSyncSupabaseAuthUser).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "ValidPassword123!",
      name: "alice",
      emailConfirm: true,
    });

    expect(mockLinkAuthUserToNeonAuthUser).toHaveBeenCalledWith("supabase-uuid-999", "user@example.com");
  });

  it("returns 500 when Supabase Auth synchronization fails", async () => {
    mockVerifyPassword.mockResolvedValueOnce({
      user_id: "user-123",
      email: "user@example.com",
      username: "alice",
    });

    mockSyncSupabaseAuthUser.mockResolvedValueOnce({
      success: false,
      error: "Supabase service unavailable",
    });

    const req = new Request("http://localhost:3000/api/auth/migrate-legacy-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "ValidPassword123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Could not synchronize authentication credentials");
  });

  it("returns 503 when password verification encounters an infrastructure or database failure", async () => {
    mockVerifyPassword.mockRejectedValueOnce(new Error("Database connection terminated unexpectedly"));

    const req = new Request("http://localhost:3000/api/auth/migrate-legacy-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "Password123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Authentication service is temporarily unavailable");
    expect(mockSyncSupabaseAuthUser).not.toHaveBeenCalled();
  });

  it("returns 503 when Supabase synchronization throws an unexpected exception", async () => {
    mockVerifyPassword.mockResolvedValueOnce({
      user_id: "user-123",
      email: "user@example.com",
      username: "alice",
    });

    mockSyncSupabaseAuthUser.mockRejectedValueOnce(new Error("Supabase network timeout"));

    const req = new Request("http://localhost:3000/api/auth/migrate-legacy-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "ValidPassword123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Authentication service is temporarily unavailable");
  });

  it("preserves exact password with leading or trailing whitespace", async () => {
    const rawPassword = "  P@sswordWithSpaces!  ";
    mockVerifyPassword.mockResolvedValueOnce({
      user_id: "user-spaces",
      email: "spaces@example.com",
      username: "spacesuser",
    });

    mockSyncSupabaseAuthUser.mockResolvedValueOnce({
      success: true,
      userId: "sb-spaces-id",
    });

    const req = new Request("http://localhost:3000/api/auth/migrate-legacy-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "spaces@example.com", password: rawPassword }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockVerifyPassword).toHaveBeenCalledWith("spaces@example.com", rawPassword);
    expect(mockSyncSupabaseAuthUser).toHaveBeenCalledWith({
      email: "spaces@example.com",
      password: rawPassword,
      name: "spacesuser",
      emailConfirm: true,
    });
  });
});
