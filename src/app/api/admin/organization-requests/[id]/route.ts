import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { enterApiLogContextFromRequest } from "@/lib/request-log-context";
import { logger } from "@/lib/logger-server";
import { getOrganizationRegistrationById } from "@/lib/organization/registration-db";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";

function isSessionAdmin(session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  const role = String(session?.user?.role || "").toLowerCase();
  const email = String(session?.user?.email || "").trim().toLowerCase();
  return role === "admin" || isConfiguredAdminEmail(email);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await enterApiLogContextFromRequest(req);
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !isSessionAdmin(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id parameter is required." }, { status: 400 });
    }

    const registration = await getOrganizationRegistrationById(id);
    if (!registration) {
      return NextResponse.json({ error: "Organization registration request not found." }, { status: 404 });
    }

    return NextResponse.json({ data: registration });
  } catch (error: unknown) {
    logger.error({ err: error instanceof Error ? error : undefined }, "[admin/organization-requests/[id]] GET error");
    return NextResponse.json({ error: "Failed to fetch organization request." }, { status: 500 });
  }
}
