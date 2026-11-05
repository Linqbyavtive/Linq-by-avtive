import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRequestPasswordResetCode = vi.fn();
const mockVerifyPasswordResetCode = vi.fn();
const mockCompletePasswordReset = vi.fn();
const mockEnqueueEmail = vi.fn().mockResolvedValue({ queued: true, id: "msg_123" });
const mockSendBrandedEmail = vi.fn().mockResolvedValue({ sent: true });

vi.mock("@/auth", () => ({
  neonAuth: {
    handler: () => ({
      GET: vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
      POST: vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    }),
    requestPasswordReset: vi.fn().mockResolvedValue({ ok: true }),
    resetPassword: vi.fn().mockResolvedValue({ data: { ok: true } }),
  },
}));

vi.mock("@/lib/auth-db", () => ({
  verifyPassword: vi.fn(),
  registerUser: vi.fn(),
  getAuthSessionPayloadByUserId: vi.fn(),
}));

vi.mock("@/lib/auth/password-reset", () => ({
  requestPasswordResetCode: (...args: unknown[]) => mockRequestPasswordResetCode(...args),
  verifyPasswordResetCode: (...args: unknown[]) => mockVerifyPasswordResetCode(...args),
  completePasswordReset: (...args: unknown[]) => mockCompletePasswordReset(...args),
}));

vi.mock("@/lib/notifications/email-outbox", () => ({
  enqueueBrandedTransactionalEmail: (...args: unknown[]) => mockEnqueueEmail(...args),
}));

vi.mock("@/lib/notifications/branded-email", () => ({
  sendBrandedTransactionalEmail: (...args: unknown[]) => mockSendBrandedEmail(...args),
}));

import { POST as authPostHandler, GET as authGetHandler } from "@/app/api/auth/[...path]/route";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as verifyResetCodeHandler } from "@/app/api/auth/verify-reset-code/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session-token";

describe("Forgot Password, Code Verification and Reset Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sign-out endpoint via POST clears the AUTH_COOKIE_NAME with maxAge 0 and path /", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST",
    });
    const res = await authPostHandler(req, {
      params: Promise.resolve({ path: ["sign-out"] }),
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(AUTH_COOKIE_NAME);
    expect(setCookie.toLowerCase()).toContain("max-age=0");
    expect(setCookie.toLowerCase()).toContain("path=/");
  });

  it("sign-out endpoint via GET also clears the AUTH_COOKIE_NAME with maxAge 0 and path /", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-out", {
      method: "GET",
    });
    const res = await authGetHandler(req, {
      params: Promise.resolve({ path: ["sign-out"] }),
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(AUTH_COOKIE_NAME);
    expect(setCookie.toLowerCase()).toContain("max-age=0");
    expect(setCookie.toLowerCase()).toContain("path=/");
  });

  it.skip("sends password reset 6-digit code when the email belongs to a registered user (legacy OTP flow - superseded by Supabase link recovery)", async () => {
    mockRequestPasswordResetCode.mockResolvedValueOnce({
      success: true,
      code: "123456",
      cooldownRemaining: 60,
    });

    const req = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "registered@example.com" }),
    });

    const res = await forgotPasswordHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      data: {
        ok: true,
        email: "registered@example.com",
        cooldownSeconds: 60,
      },
    });

    expect(mockRequestPasswordResetCode).toHaveBeenCalledWith("registered@example.com");
  });

  it.skip("returns 404 with exact message when user is not registered (legacy OTP flow - superseded by Supabase link recovery)", async () => {
    mockRequestPasswordResetCode.mockResolvedValueOnce({
      success: false,
      error: "User not registered. Please check your email or sign up.",
    });

    const req = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "unknown@example.com" }),
    });

    const res = await forgotPasswordHandler(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe("User not registered. Please check your email or sign up.");
    expect(mockRequestPasswordResetCode).toHaveBeenCalledWith("unknown@example.com");
  });

  it.skip("enforces cooldown when code requested too soon (legacy OTP flow - superseded by Supabase link recovery)", async () => {
    mockRequestPasswordResetCode.mockResolvedValueOnce({
      success: false,
      cooldownRemaining: 45,
      error: "Please wait 45 seconds before requesting a new code.",
    });

    const req = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "registered@example.com" }),
    });

    const res = await forgotPasswordHandler(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.cooldownSeconds).toBe(45);
    expect(body.error).toContain("45 seconds");
  });

  it("successfully verifies 6-digit code and returns a resetToken", async () => {
    mockVerifyPasswordResetCode.mockResolvedValueOnce({
      success: true,
      resetToken: "mock_session_token_1234567890abcdef",
    });

    const req = new Request("http://localhost:3000/api/auth/verify-reset-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "registered@example.com",
        code: "654321",
      }),
    });

    const res = await verifyResetCodeHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.resetToken).toBe("mock_session_token_1234567890abcdef");
    expect(mockVerifyPasswordResetCode).toHaveBeenCalledWith("registered@example.com", "654321");
  });

  it("rejects invalid or expired verification codes with 400", async () => {
    mockVerifyPasswordResetCode.mockResolvedValueOnce({
      success: false,
      error: "Invalid verification code. 4 attempts remaining.",
    });

    const req = new Request("http://localhost:3000/api/auth/verify-reset-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "registered@example.com",
        code: "000000",
      }),
    });

    const res = await verifyResetCodeHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("Invalid verification code");
  });

  it.skip("completes password reset and updates password via resetToken (legacy OTP flow - superseded by Supabase link recovery)", async () => {
    mockCompletePasswordReset.mockResolvedValueOnce({
      success: true,
    });

    const req = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "mock_session_token_1234567890abcdef",
        password: "NewSecurePassword123!",
      }),
    });

    const res = await resetPasswordHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.ok).toBe(true);
    expect(mockCompletePasswordReset).toHaveBeenCalledWith(
      "mock_session_token_1234567890abcdef",
      "NewSecurePassword123!",
    );
  });
});
