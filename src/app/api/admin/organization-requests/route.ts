import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { enterApiLogContextFromRequest } from "@/lib/request-log-context";
import { logger } from "@/lib/logger-server";
import { listOrganizationRegistrationRequests } from "@/lib/organization/registration-db";
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const result = await listOrganizationRegistrationRequests({
      status,
      search,
      limit,
      offset,
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    logger.error({ err: error instanceof Error ? error : undefined }, "[admin/organization-requests] GET list failed");
    return NextResponse.json({ error: "Failed to fetch organization requests." }, { status: 500 });
  }
}
