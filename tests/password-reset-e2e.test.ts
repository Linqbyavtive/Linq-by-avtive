import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  neonAuth: {
    resetPassword: vi.fn().mockResolvedValue({ data: { ok: true } }),
  },
}));

import { registerUser, verifyPassword } from "@/lib/auth-db";
import {
  requestPasswordResetCode,
  verifyPasswordResetCode,
  completePasswordReset,
} from "@/lib/auth/password-reset";

const hasDatabase =
  process.env.RUN_DB_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!hasDatabase)("Password Reset End-to-End Flow", () => {
  it("executes the entire flow: registration, request code, verify code, password reset, and login with new password", async () => {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const testEmail = `pwd_reset_test_${randomSuffix}@example.com`;
    const testUsername = `user_reset_${randomSuffix}`;
    const testOrg = `Reset Org ${randomSuffix}`;
    const initialPassword = "InitialPassword123!";
    const newPassword = "NewSecurePassword456!";

    // 1. Create a registered test user
    const user = await registerUser({
      email: testEmail,
      password: initialPassword,
      username: testUsername,
      organizationName: testOrg,
    });
    expect(user.userId).toBeTruthy();

    // Verify initial login works
    const initialAuth = await verifyPassword(testEmail, initialPassword);
    expect(initialAuth).not.toBeNull();
    expect(initialAuth?.user_id).toBe(user.userId);

    // 2. Unregistered user check
    const nonUserResult = await requestPasswordResetCode(`nonexistent_${randomSuffix}@example.com`);
    expect(nonUserResult.success).toBe(false);
    expect(nonUserResult.error).toBe("User not registered. Please check your email or sign up.");

    // 3. Request 6-digit reset code for registered user
    const resetCodeResult = await requestPasswordResetCode(testEmail);
    expect(resetCodeResult.success).toBe(true);
    expect(resetCodeResult.code).toBeDefined();
    expect(resetCodeResult.code).toMatch(/^\d{6}$/);

    const code = resetCodeResult.code!;

    // 4. Test invalid code verification
    const invalidVerifyResult = await verifyPasswordResetCode(testEmail, "000000");
    expect(invalidVerifyResult.success).toBe(false);
    expect(invalidVerifyResult.error).toContain("Invalid verification code");

    // 5. Test valid code verification
    const validVerifyResult = await verifyPasswordResetCode(testEmail, code);
    expect(validVerifyResult.success).toBe(true);
    expect(validVerifyResult.resetToken).toBeDefined();

    const resetToken = validVerifyResult.resetToken!;

    // 6. Test code reuse prevention (same code cannot be used twice)
    const reusedCodeResult = await verifyPasswordResetCode(testEmail, code);
    expect(reusedCodeResult.success).toBe(false);
    expect(reusedCodeResult.error).toContain("No active verification code");

    // 7. Test password policy validation during reset
    const weakResetResult = await completePasswordReset(resetToken, "short");
    expect(weakResetResult.success).toBe(false);
    expect(weakResetResult.error).toContain("Password must be at least 12 characters");

    // 8. Test successful password reset with valid token
    const successResetResult = await completePasswordReset(resetToken, newPassword);
    expect(successResetResult.success).toBe(true);

    // 9. Test token reuse prevention (same reset token cannot be used twice)
    const reusedTokenResult = await completePasswordReset(resetToken, "AnotherNewPassword123!");
    expect(reusedTokenResult.success).toBe(false);
    expect(reusedTokenResult.error).toContain("Invalid or expired reset session");

    // 10. Login with new password must succeed
    const newAuth = await verifyPassword(testEmail, newPassword);
    expect(newAuth).not.toBeNull();
    expect(newAuth?.user_id).toBe(user.userId);

    // 11. Login with old password must fail
    const oldAuth = await verifyPassword(testEmail, initialPassword);
    expect(oldAuth).toBeNull();
  }, 45000);
});
