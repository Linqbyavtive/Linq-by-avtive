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
    logger.warn({ stage: "csrf_validation", reason: csrf.reason }, "CSRF check failed for legacy login migration");
    return NextResponse.json(
      { error: csrf.reason || "CSRF validation failed." },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(req, legacyLoginMigrationBodySchema);
  if (!parsed.ok) {
    logger.warn({ stage: "body_validation" }, "Invalid request body for legacy login migration");
    return parsed.response;
  }

  const { email, password } = parsed.data;

  // Stage 1: Legacy account lookup & password verification
  let user;
  try {
    user = await verifyPassword(email, password);
  } catch (err: unknown) {
    logger.error(
      {
        stage: "legacy_password_verification",
        email,
        dbResult: "error",
        err: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      "Infrastructure failure during legacy password verification",
    );
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  if (!user) {
    logger.info(
      {
        stage: "legacy_password_verification",
        email,
        legacyAccountFound: false,
        legacyVerificationSucceeded: false,
      },
      "Legacy credential verification rejected invalid credentials",
    );
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  logger.info(
    {
      stage: "legacy_password_verification",
      email,
      userId: user.user_id,
      legacyAccountFound: true,
      legacyVerificationSucceeded: true,
    },
    "Legacy account credentials verified successfully in auth_users",
  );

  // Stage 2: Supabase Auth synchronization via server Admin API
  logger.info(
    {
      stage: "supabase_sync_attempt",
      email,
      userId: user.user_id,
      operation: "syncSupabaseAuthUser",
    },
    "Initiating Supabase Auth account synchronization",
  );

  let syncResult;
  try {
    syncResult = await syncSupabaseAuthUser({
      email,
      password,
      name: user.username || user.email,
      role: user.role || undefined,
      emailConfirm: true,
    });
  } catch (err: unknown) {
    logger.error(
      {
        stage: "supabase_sync_exception",
        email,
        userId: user.user_id,
        err: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      "Unexpected exception during Supabase Auth synchronization",
    );
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  if (!syncResult.success) {
    logger.error(
      {
        stage: "supabase_sync_failed",
        email,
        userId: user.user_id,
        error: syncResult.error,
        syncResult: "failed",
      },
      "Failed to sync user to Supabase Auth during legacy migration",
    );
    return NextResponse.json(
      { error: "Could not synchronize authentication credentials. Please try again shortly or contact support." },
      { status: 500 },
    );
  }

  logger.info(
    {
      stage: "supabase_sync_complete",
      email,
      userId: user.user_id,
      supabaseUserId: syncResult.userId,
      syncResult: "success",
    },
    "Supabase Auth user synchronized successfully",
  );

  // Stage 3: Link Supabase Auth user ID to local auth_users record
  if (syncResult.userId) {
    try {
      await linkAuthUserToNeonAuthUser(syncResult.userId, email);
      logger.info(
        {
          stage: "database_link",
          email,
          userId: user.user_id,
          supabaseUserId: syncResult.userId,
          dbResult: "linked",
        },
        "Linked Supabase Auth user ID to local auth_users record",
      );
    } catch (linkError) {
      logger.warn(
        {
          stage: "database_link",
          email,
          userId: user.user_id,
          supabaseUserId: syncResult.userId,
          dbResult: "link_failed",
          err: linkError instanceof Error ? linkError.message : String(linkError),
        },
        "Could not link Supabase Auth user ID to auth_users",
      );
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
