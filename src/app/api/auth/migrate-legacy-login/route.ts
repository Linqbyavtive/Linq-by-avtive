import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, linkAuthUserToNeonAuthUser } from "@/lib/auth-db";
import { parseJsonBody } from "@/lib/middlewares/validateRequest";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { syncSupabaseAuthUser } from "@/utils/supabase/admin";
import { logger } from "@/lib/logger-server";

const legacyLoginMigrationBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  const csrf = validateCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json(
      { error: csrf.reason || "CSRF validation failed." },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(req, legacyLoginMigrationBodySchema);
  if (!parsed.ok) return parsed.response;

  const user = await verifyPassword(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // User credentials verified in auth_users.
  // Synchronize the account into Supabase Auth directly via the server Admin API.
  // This bypasses client-side SMTP confirmation limitations and sets email_confirm: true immediately.
  const syncResult = await syncSupabaseAuthUser({
    email: parsed.data.email,
    password: parsed.data.password,
    name: user.username || user.email,
    emailConfirm: true,
  });

  if (!syncResult.success) {
    logger.error(
      { email: parsed.data.email, error: syncResult.error },
      "Failed to sync user to Supabase Auth during legacy migration",
    );
    return NextResponse.json(
      { error: "Could not synchronize authentication credentials. Please try again or reset your password." },
      { status: 500 },
    );
  }

  if (syncResult.userId) {
    try {
      await linkAuthUserToNeonAuthUser(syncResult.userId, parsed.data.email);
    } catch (linkError) {
      logger.warn({ err: linkError }, "Could not link Supabase Auth user ID to auth_users");
    }
  }

  return NextResponse.json({
    data: {
      canMigrate: true,
      migrated: true,
      name: user.username || user.email,
    },
  });
}
