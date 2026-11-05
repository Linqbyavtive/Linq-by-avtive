import { describe, expect, it, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { uniqueViolationError } from "../helpers/mock-db";

/**
 * Simulates idempotent insert with unique constraint — mirrors registration/event
 * creation patterns where duplicate concurrent submits must not corrupt data.
 */
class UniqueConstraintStore {
  private readonly keys = new Set<string>();

  async insertOnce(key: string, value: Record<string, unknown>) {
    if (this.keys.has(key)) {
      throw uniqueViolationError();
    }
    this.keys.add(key);
    return { id: crypto.randomUUID(), ...value };
  }

  size() {
    return this.keys.size;
  }
}

describe("concurrency — duplicate submission guard", () => {
  it("allows only one concurrent insert for the same unique key", async () => {
    const store = new UniqueConstraintStore();
    const key = "event:short_id:abc12345";

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        store.insertOnce(key, { name: "Concurrent Event", user_id: "owner-1" }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(9);
    expect(store.size()).toBe(1);
  });

  it("allows parallel inserts for distinct keys", async () => {
    const store = new UniqueConstraintStore();

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        store.insertOnce(`member:email:user${i}@example.com`, { email: `user${i}@example.com` }),
      ),
    );

    expect(results).toHaveLength(5);
    expect(store.size()).toBe(5);
  });
});

describe("concurrency — registration service unauthorized reviewer (mocked DB)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns empty list when reviewer lacks permission (no partial writes)", async () => {
    vi.doMock("@/lib/neon-db", () => ({
      queryNeonOne: vi.fn(async (sql: string) => {
        if (sql.includes("FROM public.events")) {
          return { id: "event-1", user_id: "owner-1" };
        }
        if (sql.includes("organization_members")) {
          return null;
        }
        return null;
      }),
      queryNeon: vi.fn(async () => []),
      insertRow: vi.fn(),
    }));

    vi.doMock("@/lib/services/registration-schema", () => ({
      ensureRegistrationRequestsSchema: vi.fn(async () => {}),
    }));

    const { listPendingRegistrationRequests } = await import("@/lib/services/registration.service");
    const { insertRow } = await import("@/lib/neon-db");

    const result = await listPendingRegistrationRequests({
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      reviewerUserId: "reviewer-1",
    });

    expect(result.requests).toEqual([]);
    expect(result.total).toBe(0);
    expect(vi.mocked(insertRow)).not.toHaveBeenCalled();
  });
});

describe("concurrency — parallel validation does not throw", () => {
  it("handles 50 parallel schema validations", async () => {
    const { registerBodySchema } = await import("@/lib/validators/auth.validator");
    const payloads = Array.from({ length: 50 }, (_, i) => ({
      email: `user${i}@example.com`,
      password: "SecurePass123!",
      username: `user_${i}`,
      organizationName: `Org ${i}`,
    }));

    const results = await Promise.all(
      payloads.map((p) => Promise.resolve(registerBodySchema.safeParse(p))),
    );

    expect(results.every((r) => r.success)).toBe(true);
  });
});
