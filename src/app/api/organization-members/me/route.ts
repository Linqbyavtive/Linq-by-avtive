import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queryNeon, queryNeonOne } from "@/lib/neon-db";
import { updateTenantRows } from "@/lib/db/tenant-mutations";
import { getServerUserIdFromCookies } from "@/lib/auth-server";
import { getServerAuthSession } from "@/auth";
import { syncOrgMemberAccessGrantsFromTemplate } from "@/lib/organization/sync-org-member-access-grants";
import { logger } from "@/lib/logger-server";
import { enterServerLogContext } from "@/lib/request-log-context";

export async function GET() {
  await enterServerLogContext();
  try {
    const cookieStore = await cookies();
    const session = await getServerAuthSession();
    const userId = session?.user?.id || (await getServerUserIdFromCookies(cookieStore, session));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userEmail = String(session?.user?.email || "").toLowerCase().trim();

    // 1. Try lookup by UUID first
    let data = await queryNeonOne<{
      id: string;
      org_owner_user_id: string;
      role_label: string;
      status: string;
      member_user_id: string | null;
      member_email: string | null;
    }>(
      `SELECT id, org_owner_user_id, role_label, status, member_user_id, member_email
       FROM public.organization_members
       WHERE member_user_id = $1
         AND status = 'active'
       LIMIT 1`,
      [userId],
    );

    // 2. If not found, try lookup by Email (for pre-invites)
    if (!data && userEmail) {
      const emailMatch = await queryNeonOne<{
        id: string;
        org_owner_user_id: string;
        role_label: string;
        status: string;
        member_user_id: string | null;
        member_email: string | null;
      }>(
        `SELECT id, org_owner_user_id, role_label, status, member_user_id, member_email
         FROM public.organization_members
         WHERE member_email = $1
           AND status = 'active'
         LIMIT 1`,
        [userEmail],
      );
      
      if (emailMatch) {
        data = emailMatch;
        // Lazy link: update the UUID if it's missing
        if (!emailMatch.member_user_id) {
          await updateTenantRows(
            "organization_members",
            { member_user_id: userId },
            { id: emailMatch.id },
            emailMatch.org_owner_user_id,
            "id",
          );
          try {
            await syncOrgMemberAccessGrantsFromTemplate(emailMatch.org_owner_user_id, userId, emailMatch.role_label);
          } catch (e: unknown) {
            logger.error({ err: e instanceof Error ? e : undefined }, "[organization-members/me] grant sync after lazy-link failed");
          }
        }
      }
    }

    if (data?.org_owner_user_id) {
      // Member capabilities are sourced from actual active grants, not role template defaults.
      const grants = await queryNeon<{ permission: string }>(
        `SELECT g.permission
         FROM public.access_grants g
         LEFT JOIN public.events e
           ON e.id = g.event_id
         WHERE g.grantee_user_id = $1
           AND g.status = 'active'
           AND (
             e.user_id = $2
             OR g.granted_by_user_id = $2
           )`,
        [userId, data.org_owner_user_id],
      );
      const permissions = Array.from(
        new Set(grants.map((row) => row.permission)),
      );
      return NextResponse.json({ data: { ...data, permissions } }, { status: 200 });
    }

    return NextResponse.json({ data: data || null }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load membership.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
