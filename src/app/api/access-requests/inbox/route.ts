import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queryNeon } from "@/lib/neon-db";
import { getServerUserIdFromCookies } from "@/lib/auth-server";
import { getServerAuthSession } from "@/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getServerAuthSession();
    const ownerId = session?.user?.id || (await getServerUserIdFromCookies(cookieStore, session));
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requests = await queryNeon<{
      id: string;
      event_id: string | null;
      requester_user_id: string;
      requested_action: string;
      note: string | null;
      status: string;
      created_at: string;
      requester_email: string;
      event_name: string;
    }>(
      `SELECT 
         ar.id, 
         ar.event_id, 
         ar.requester_user_id, 
         ar.requested_action, 
         ar.note, 
         ar.status, 
         ar.created_at,
         COALESCE(au.email, 'unknown') AS requester_email,
         COALESCE(e.name, 'Organization Workspace') AS event_name
       FROM public.access_requests ar
       LEFT JOIN public.auth_users au ON au.user_id = ar.requester_user_id
       LEFT JOIN public.events e ON e.id = ar.event_id
       WHERE ar.owner_user_id = $1
         AND ar.status = 'pending'
       ORDER BY ar.created_at DESC
       LIMIT 50`,
      [ownerId],
    );

    return NextResponse.json({ data: requests }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load inbox.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
