import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { validatePasswordPolicy } from "@/lib/security/password-policy";
import { createOrganizationOwnerByAdmin } from "@/lib/auth-db";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { sendOrganizationCreatedWelcomeEmail } from "@/lib/notifications/org-emails";
import { logger } from "@/lib/logger-server";
import { enterApiLogContextFromRequest } from "@/lib/request-log-context";
import { queryNeon } from "@/lib/neon-db";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";

function isSessionAdmin(session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  const role = String(session?.user?.role || "").toLowerCase();
  const email = String(session?.user?.email || "").trim().toLowerCase();
  return role === "admin" || isConfiguredAdminEmail(email);
}

export async function GET(req: Request) {
  await enterApiLogContextFromRequest(req);
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !isSessionAdmin(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const orgs = await queryNeon<{
      id: string;
      organization_name: string;
      organization_name_key: string;
      owner_user_id: string | null;
      organization_logo_url: string | null;
      created_at: string;
    }>(
      `SELECT id, organization_name, organization_name_key, owner_user_id, organization_logo_url, created_at
       FROM public.organizations
       ORDER BY created_at DESC`,
    );

    return NextResponse.json({ data: orgs });
  } catch (error: unknown) {
    logger.error({ err: error instanceof Error ? error : undefined }, "[admin/organizations] GET failed");
    return NextResponse.json({ error: "Failed to fetch organizations." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await enterApiLogContextFromRequest(req);
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.ok) return NextResponse.json({ error: csrf.reason || "CSRF validation failed." }, { status: 403 });
    const session = await getServerAuthSession();
    if (!session?.user?.id || !isSessionAdmin(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    let body: { organizationName?: string; email?: string; password?: string };
    try {
      body = (await req.json()) as { organizationName?: string; email?: string; password?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const organizationName = String(body.organizationName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!organizationName || !email || !password) {
      return NextResponse.json({ error: "Organization name, email, and password are required." }, { status: 400 });
    }
    if (organizationName.length < 2) {
      return NextResponse.json({ error: "Organization name must be at least 2 characters." }, { status: 400 });
    }
    if (organizationName.length > 120) {
      return NextResponse.json({ error: "Organization name is too long (max 120 characters)." }, { status: 400 });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }
    const passwordIssues = validatePasswordPolicy(password);
    if (passwordIssues.length > 0) {
      return NextResponse.json({ error: passwordIssues[0] }, { status: 400 });
    }

    try {
      const data = await createOrganizationOwnerByAdmin({ organizationName, email, password });

      try {
        const mail = await sendOrganizationCreatedWelcomeEmail({
          to: email,
          organizationName: data.organizationName,
          temporaryPassword: password,
        });
        if (!mail.queued) logger.warn({ error: mail.error }, "[admin/organizations] welcome email was not queued");
      } catch (e: unknown) {
        logger.error({ err: e instanceof Error ? e : undefined }, "[admin/organizations] welcome email failed");
      }

      return NextResponse.json({ data }, { status: 201 });
    } catch (bizError: unknown) {
      const rawMessage = bizError instanceof Error ? bizError.message : "Failed to create organization.";
      let message = rawMessage;
      let status = 400;

      if (
        rawMessage.includes("profiles_pkey") ||
        rawMessage.includes("auth_users_pkey") ||
        rawMessage.includes("auth_users_email_key") ||
        rawMessage.includes("already exists")
      ) {
        message = "An account with this email or user ID already exists.";
        status = 409;
      } else if (
        rawMessage.includes("organizations_organization_name_key") ||
        rawMessage.includes("already in use")
      ) {
        message = "Organization name is already in use. Please choose another name.";
        status = 409;
      } else if (rawMessage.includes("profiles_username_key")) {
        message = "Username is already taken. Please try another.";
        status = 409;
      } else if (rawMessage.includes("duplicate key") || rawMessage.includes("unique constraint")) {
        message = "An account or organization with these details already exists.";
        status = 409;
      } else if (rawMessage.includes("required") || rawMessage.includes("Invalid")) {
        status = 400;
      } else {
        status = 500;
      }

      if (status === 500) {
        logger.error({ err: bizError instanceof Error ? bizError : undefined }, "[admin/organizations] createOrganizationOwnerByAdmin error");
      } else {
        logger.warn({ rawMessage, message, status }, "[admin/organizations] creation rejected");
      }

      return NextResponse.json({ error: message }, { status });
    }
  } catch (error: unknown) {
    logger.error({ err: error instanceof Error ? error : undefined }, "[admin/organizations] unexpected handler error");
    const message = error instanceof Error ? error.message : "Failed to create organization.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
