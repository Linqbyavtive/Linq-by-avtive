import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRegisterUser = vi.fn();
const mockSyncSupabaseAuthUser = vi.fn();

vi.mock("@/lib/auth-db", () => ({
  registerUser: (...args: unknown[]) => mockRegisterUser(...args),
}));

vi.mock("@/utils/supabase/admin", () => ({
  syncSupabaseAuthUser: (...args: unknown[]) => mockSyncSupabaseAuthUser(...args),
}));

import { POST } from "@/app/api/auth/register-invited/route";

describe("POST /api/auth/register-invited", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails with 500 when Supabase Auth synchronization fails", async () => {
    mockSyncSupabaseAuthUser.mockResolvedValueOnce({
      success: false,
      error: "Supabase service unavailable",
    });

    const req = new Request("http://localhost:3000/api/auth/register-invited", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invited@example.com",
        password: "ValidPassword123!",
        username: "inviteduser",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Supabase");
    expect(mockRegisterUser).not.toHaveBeenCalled();
  });

  it("succeeds when Supabase Auth synchronization succeeds", async () => {
    mockSyncSupabaseAuthUser.mockResolvedValueOnce({
      success: true,
      userId: "supabase-invited-uid",
    });
    mockRegisterUser.mockResolvedValueOnce({
      userId: "internal-uid-123",
      username: "inviteduser",
      email: "invited@example.com",
    });

    const req = new Request("http://localhost:3000/api/auth/register-invited", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invited@example.com",
        password: "ValidPassword123!",
        username: "inviteduser",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.userId).toBe("internal-uid-123");
    expect(mockRegisterUser).toHaveBeenCalledWith({
      email: "invited@example.com",
      password: "ValidPassword123!",
      username: "inviteduser",
      organizationName: "",
      neonAuthUserId: "supabase-invited-uid",
    });
  });
});

