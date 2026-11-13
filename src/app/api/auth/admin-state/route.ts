import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { queryNeonOneAsSystem } from "@/lib/neon-db";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    const userId = String(session?.user?.id || "").trim();
    if (!userId) return NextResponse.json({ data: { isAdmin: false, pendingRequestsCount: 0 } }, { status: 200 });

    const role = String(session?.user?.role || "").toLowerCase();
    const email = String(session?.user?.email || "").toLowerCase().trim();
    const isAdmin = role === "admin" || isConfiguredAdminEmail(email);

    let pendingRequestsCount = 0;
    if (isAdmin) {
      try {
        const pendingRow = await queryNeonOneAsSystem<{ count: string | number }>(
          `SELECT COUNT(*)::int AS count FROM public.organization_registration_requests WHERE status IN ('PENDING', 'UNDER_REVIEW')`,
        );
        pendingRequestsCount = Number(pendingRow?.count || 0);
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({ data: { isAdmin, pendingRequestsCount } }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve admin state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
