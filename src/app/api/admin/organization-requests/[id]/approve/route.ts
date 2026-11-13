import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { enterApiLogContextFromRequest } from "@/lib/request-log-context";
import { logger } from "@/lib/logger-server";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { adminApproveRegistrationSchema } from "@/lib/validators/organization-registration.validator";
import { approveOrganizationRegistration } from "@/lib/organization/registration-db";
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

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional for approve
    }

    const parsed = adminApproveRegistrationSchema.safeParse(body);
    const adminNotes = parsed.success ? parsed.data.adminNotes : undefined;

    const result = await approveOrganizationRegistration(id, session.user.id, adminNotes);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to approve registration.";
    logger.error({ err: error instanceof Error ? error : undefined }, "[admin/organization-requests/[id]/approve] error");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
