import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();

vi.mock("@/utils/supabase/middleware", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  classifyApiRoute: vi.fn(),
  clientIp: vi.fn().mockReturnValue("127.0.0.1"),
  getRateLimiters: vi.fn().mockReturnValue(null),
  rateLimitKey: vi.fn(),
}));

import proxyMiddleware from "@/proxy";

describe("Supabase Authentication & Dashboard Routing Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows access to root '/' as public landing page without redirecting to login", async () => {
    const req = new NextRequest("http://localhost:3000/");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).not.toBe(307);
    const location = res.headers.get("location");
    expect(location).toBeNull();
  });

  it("allows access to '/login' and preserves valid authentication cookies across navigation", async () => {
    const req = new NextRequest("http://localhost:3000/login", {
      headers: {
        cookie: "sb-auth-token=valid_supabase_token",
      },
    });
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).not.toBe(307);
    const location = res.headers.get("location");
    expect(location).toBeNull();

    // Valid cookies must NOT be cleared on /login
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie.toLowerCase()).not.toContain("max-age=0");
  });

  it("blocks unauthenticated users from viewing the dashboard and redirects them to '/login'", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth session missing"),
    });

    const req = new NextRequest("http://localhost:3000/dashboard");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/login");
  });

  it("blocks unauthenticated users from viewing nested dashboard routes (e.g. /dashboard/events) and redirects to '/login'", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth session missing"),
    });

    const req = new NextRequest("http://localhost:3000/dashboard/events/evt_123");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/login");
  });

  it("blocks unauthenticated users from viewing protected admin routes and redirects to '/login'", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth session missing"),
    });

    const req = new NextRequest("http://localhost:3000/admin");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/login");
  });

  it("blocks unauthenticated users from viewing protected cards/new and redirects to '/login'", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth session missing"),
    });

    const req = new NextRequest("http://localhost:3000/cards/new");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/login");
  });

  it("blocks unauthenticated users from viewing protected events and redirects to '/login'", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth session missing"),
    });

    const req = new NextRequest("http://localhost:3000/events");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/login");
  });

  it("allows authenticated Supabase users to view the dashboard after authentication", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user_active_789",
          email: "user@example.com",
          app_metadata: { role: "user" },
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/dashboard");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).toBe(200);
    const location = res.headers.get("location");
    expect(location).toBeNull();
  });

  it("allows authenticated Supabase users to view nested dashboard routes after authentication", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user_active_789",
          email: "user@example.com",
          app_metadata: { role: "user" },
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/dashboard/events/evt_123");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).toBe(200);
    const location = res.headers.get("location");
    expect(location).toBeNull();
  });

  it("allows authenticated Supabase users to move forward into /cards/new after putting credentials", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user_active_789",
          email: "user@example.com",
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/cards/new");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).toBe(200);
    const location = res.headers.get("location");
    expect(location).toBeNull();
  });

  it("redirects admin users visiting /dashboard to /admin", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "admin_user_001",
          email: "admin@example.com",
          app_metadata: { role: "admin" },
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/dashboard");
    const res = await (proxyMiddleware as any)(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/admin");
  });

  it("allows public signup and organization register pages for non-registered users", async () => {
    const signupReq = new NextRequest("http://localhost:3000/signup");
    const signupRes = await (proxyMiddleware as any)(signupReq);
    expect(signupRes.status).toBe(200);

    const orgReq = new NextRequest("http://localhost:3000/organization/register");
    const orgRes = await (proxyMiddleware as any)(orgReq);
    expect(orgRes.status).toBe(200);
  });
});
