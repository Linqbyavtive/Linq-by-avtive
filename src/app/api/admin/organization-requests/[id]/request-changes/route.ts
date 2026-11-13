import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { enterApiLogContextFromRequest } from "@/lib/request-log-context";
import { logger } from "@/lib/logger-server";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { adminRequestChangesSchema } from "@/lib/validators/organization-registration.validator";
import { requestChangesOnOrganizationRegistration } from "@/lib/organization/registration-db";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";

function isSessionAdmin(session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  const role = String(session?.user?.role || "").toLowerCase();
  const email = String(session?.user?.email || "").trim().toLowerCase();
  return role === "admin" || isConfiguredAdminEmail(email);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await enterApiLogContextFromRequest(req);
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.ok) return NextResponse.json({ error: csrf.reason || "CSRF validation failed." }, { status: 403 });

    const session = await getServerAuthSession();
    if (!session?.user?.id || !isSessionAdmin(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id parameter is required." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = adminRequestChangesSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "changesRequestedNotes is required.";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const updated = await requestChangesOnOrganizationRegistration(
      id,
      session.user.id,
      parsed.data.changesRequestedNotes,
      parsed.data.adminNotes,
    );

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to request changes.";
    logger.error({ err: error instanceof Error ? error : undefined }, "[admin/organization-requests/[id]/request-changes] error");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
