import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queryNeonOne } from "@/lib/neon-db";
import { getServerUserIdFromCookies } from "@/lib/auth-server";
import { getServerAuthSession } from "@/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getServerAuthSession();
    const userId = session?.user?.id || (await getServerUserIdFromCookies(cookieStore, session));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgRow = await queryNeonOne<{
      id: string;
      organization_name: string;
      organization_name_key: string;
    }>(
      `SELECT id, organization_name, organization_name_key
       FROM public.organizations
       WHERE owner_user_id = $1
       LIMIT 1`,
      [userId],
    );

    return NextResponse.json(
      {
        data: {
          isOwner: Boolean(orgRow?.id),
          organization: orgRow || null,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to check owner state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
