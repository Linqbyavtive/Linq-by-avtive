import { describe, expect, it } from "vitest";
import { registerUser, verifyPassword } from "@/lib/auth-db";

const hasDatabase =
  process.env.RUN_DB_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!hasDatabase)("registerUser self-registration flow", () => {
  it("successfully registers a new user with their organization", async () => {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const testEmail = `test_signup_${randomSuffix}@example.com`;
    const testUsername = `user_${randomSuffix}`;
    const testOrg = `Org ${randomSuffix}`;
    const testPassword = "Password123!";

    const result = await registerUser({
      email: testEmail,
      password: testPassword,
      username: testUsername,
      organizationName: testOrg,
    });

    expect(result).toBeDefined();
    expect(result.email).toBe(testEmail.toLowerCase());
    expect(result.userId).toBeTruthy();

    const verified = await verifyPassword(testEmail, testPassword);
    expect(verified).not.toBeNull();
    expect(verified?.user_id).toBe(result.userId);
  }, 40000);

  it("handles idempotent re-registration or updates for the same email", async () => {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const testEmail = `test_idempotent_${randomSuffix}@example.com`;
    const testUsername = `idemp_${randomSuffix}`;
    const testOrg = `Idemp Org ${randomSuffix}`;
    const testPassword = "Password123!";

    const result1 = await registerUser({
      email: testEmail,
      password: testPassword,
      username: testUsername,
      organizationName: testOrg,
    });

    const result2 = await registerUser({
      email: testEmail,
      password: testPassword,
      username: testUsername,
      organizationName: testOrg,
      linkedin: "https://linkedin.com/in/test",
    });

    expect(result2.userId).toBe(result1.userId);
    expect(result2.email).toBe(testEmail.toLowerCase());
  }, 40000);
});
