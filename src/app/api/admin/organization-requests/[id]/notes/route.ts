import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { enterApiLogContextFromRequest } from "@/lib/request-log-context";
import { logger } from "@/lib/logger-server";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { adminUpdateNotesSchema } from "@/lib/validators/organization-registration.validator";
import { updateOrganizationRegistrationAdminNotes } from "@/lib/organization/registration-db";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";

function isSessionAdmin(session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  const role = String(session?.user?.role || "").toLowerCase();
  const email = String(session?.user?.email || "").trim().toLowerCase();
  return role === "admin" || isConfiguredAdminEmail(email);
}

export async function PATCH(
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

    const parsed = adminUpdateNotesSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid notes payload.";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const updated = await updateOrganizationRegistrationAdminNotes(
      id,
      session.user.id,
      parsed.data.adminNotes || "",
    );

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update admin notes.";
    logger.error({ err: error instanceof Error ? error : undefined }, "[admin/organization-requests/[id]/notes] error");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
