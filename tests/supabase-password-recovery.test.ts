import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase Server Client for auth callback
const mockExchangeCodeForSession = vi.fn();
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}));

// Mock @supabase/supabase-js for reset-password route handler
const mockGetUser = vi.fn();
const mockUpdateUserById = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      admin: {
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      },
    },
  })),
}));

// Mock auth-db directly
const mockUpdateUserPasswordDirectly = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/auth-db", () => ({
  updateUserPasswordDirectly: (...args: unknown[]) => mockUpdateUserPasswordDirectly(...args),
  normalizeAuthEmail: (email: string) => email.trim().toLowerCase(),
}));

import { GET as authCallbackHandler } from "@/app/auth/callback/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import proxy from "@/proxy";

describe("Supabase Password Recovery Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://mock-test.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "mock_secret_key_123456789";
  });

  describe("1. Auth Callback Route Handler (/auth/callback)", () => {
    it("successfully exchanges recovery code for session and redirects to /reset-password", async () => {
      mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

      const req = new Request("http://localhost:3000/auth/callback?code=mock_recovery_code_123");
      const res = await authCallbackHandler(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe("http://localhost:3000/reset-password");
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("mock_recovery_code_123");
    });

    it("respects next redirect destination if provided in query parameters", async () => {
      mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

      const req = new Request("http://localhost:3000/auth/callback?code=mock_recovery_code_123&next=/custom-reset");
      const res = await authCallbackHandler(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe("http://localhost:3000/custom-reset");
    });

    it("redirects to /reset-password with error when exchange fails", async () => {
      mockExchangeCodeForSession.mockResolvedValueOnce({
        error: { message: "Auth code has expired or is invalid" },
      });

      const req = new Request("http://localhost:3000/auth/callback?code=expired_code");
      const res = await authCallbackHandler(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/reset-password?error=");
      expect(location).toContain("Auth%20code%20has%20expired%20or%20is%20invalid");
    });

    it("redirects to /reset-password with error when Supabase sends error_description parameter", async () => {
      const req = new Request(
        "http://localhost:3000/auth/callback?error=access_denied&error_description=Email%20link%20is%20invalid%20or%20has%20expired",
      );
      const res = await authCallbackHandler(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/reset-password?error=");
      expect(location).toContain("Email%20link%20is%20invalid%20or%20has%20expired");
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });
  });

  describe("2. Password Reset API (/api/auth/reset-password)", () => {
    it("updates password when verified recovery session is active", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "user_12345",
            email: "verified@example.com",
          },
        },
        error: null,
      });

      mockUpdateUserById.mockResolvedValueOnce({
        data: { user: { id: "user_12345" } },
        error: null,
      });

      const req = new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer recovery_token_123",
        },
        body: JSON.stringify({
          password: "SecurePassword123!",
        }),
      });

      const res = await resetPasswordHandler(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.ok).toBe(true);
      expect(mockUpdateUserById).toHaveBeenCalledWith("user_12345", { password: "SecurePassword123!" });
      expect(mockUpdateUserPasswordDirectly).toHaveBeenCalledWith("verified@example.com", "SecurePassword123!");
    });

    it("rejects password update when recovery session is missing or expired", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Auth session missing" },
      });

      const req = new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "SecurePassword123!",
        }),
      });

      const res = await resetPasswordHandler(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Invalid or expired reset session");
    });

    it("enforces password policy requiring at least 12 characters, uppercase, and symbols", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "user_12345",
            email: "verified@example.com",
          },
        },
        error: null,
      });

      const req = new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer recovery_token_123",
        },
        body: JSON.stringify({
          password: "short",
        }),
      });

      const res = await resetPasswordHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Password must be at least 12 characters.");
      expect(mockUpdateUserById).not.toHaveBeenCalled();
    });
  });

  describe("3. Proxy Public Access for Auth Recovery Routes", () => {
    it("allows direct public access to /auth/callback", async () => {
      const req = new NextRequest("http://localhost:3000/auth/callback?code=test");
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows direct public access to /forgot-password", async () => {
      const req = new NextRequest("http://localhost:3000/forgot-password");
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows direct public access to /reset-password", async () => {
      const req = new NextRequest("http://localhost:3000/reset-password");
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  });
});
