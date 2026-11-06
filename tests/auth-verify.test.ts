import { describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/auth-db";

const hasDatabase =
  process.env.RUN_DB_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!hasDatabase)("auth database verifyPassword", () => {
  it("authenticates and bootstraps the superadmin successfully against Supabase", async () => {
    const email = process.env.SUPERADMIN_EMAIL || "syedbadshah00000@gmail.com";
    const password = process.env.SUPERADMIN_PASSWORD || "Syed@00000admin";
    const user = await verifyPassword(email, password);
    expect(user).not.toBeNull();
    expect(user?.email).toBe(email.toLowerCase());
  }, 15000);
});
