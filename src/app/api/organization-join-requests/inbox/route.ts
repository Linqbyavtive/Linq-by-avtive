import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queryNeon } from "@/lib/neon-db";
import { getServerUserIdFromCookies } from "@/lib/auth-server";
import { getServerAuthSession } from "@/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getServerAuthSession();
    const userId = session?.user?.id || (await getServerUserIdFromCookies(cookieStore, session));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await queryNeon<{
      id: string;
      requester_user_id: string;
      requested_org_name: string;
      status: string;
      created_at: string;
      requester_email: string;
    }>(
      `SELECT 
         ojr.id, 
         ojr.requester_user_id, 
         ojr.requested_org_name, 
         ojr.status, 
         ojr.created_at,
         COALESCE(au.email, 'unknown') AS requester_email
       FROM public.organization_join_requests ojr
       LEFT JOIN public.auth_users au ON au.user_id = ojr.requester_user_id
       WHERE ojr.owner_user_id = $1
         AND ojr.status = 'pending'
       ORDER BY ojr.created_at DESC`,
      [userId],
    );

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load join request inbox.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
