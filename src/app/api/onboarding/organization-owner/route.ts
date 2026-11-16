import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerUserIdFromCookies } from "@/lib/auth-server";
import { getServerAuthSession } from "@/auth";
import { queryNeon, queryNeonOne } from "@/lib/neon-db";

async function isOrganizationOwner(userId: string) {
  const ownerRow = await queryNeonOne<{ id: string }>(
    `SELECT id
     FROM public.organizations
     WHERE owner_user_id = $1
     LIMIT 1`,
    [userId],
  );
  return Boolean(ownerRow?.id);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getServerAuthSession();
    const userId = session?.user?.id || (await getServerUserIdFromCookies(cookieStore, session));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ownerRow = await queryNeonOne<{
      id: string;
      organization_logo_url: string | null;
      username: string | null;
      owner_profile_setup_completed_at: string | null;
      owner_onboarding_team_step_completed_at: string | null;
    }>(
      `SELECT
        o.id,
        to_jsonb(p.*)->>'organization_logo_url' AS organization_logo_url,
        p.username,
        to_jsonb(p.*)->>'owner_profile_setup_completed_at' AS owner_profile_setup_completed_at,
        to_jsonb(p.*)->>'owner_onboarding_team_step_completed_at' AS owner_onboarding_team_step_completed_at
       FROM public.organizations o
       LEFT JOIN public.profiles p ON p.id = o.owner_user_id
       WHERE o.owner_user_id = $1
       LIMIT 1`,
      [userId],
    );

    if (!ownerRow) {
      return NextResponse.json(
        {
          data: {
            isOwner: false,
            hasOrganizationLogo: false,
            needsProfileSetup: false,
            teamStepCompleted: true,
            shouldShowOnboarding: false,
          },
        },
        { status: 200 },
      );
    }

    const hasOrganizationLogo = Boolean(String(ownerRow.organization_logo_url || "").trim());
    const hasCompletedMandatorySetup = Boolean(ownerRow.owner_profile_setup_completed_at);
    // Logo and profile photo are optional; onboarding closes once owner confirms mandatory setup has been completed on the dashboard.
    const needsProfileSetup = !hasCompletedMandatorySetup;
    const teamStepCompleted = Boolean(ownerRow.owner_onboarding_team_step_completed_at);
    return NextResponse.json(
      {
        data: {
          isOwner: true,
          hasOrganizationLogo,
          needsProfileSetup,
          teamStepCompleted,
          shouldShowOnboarding: !needsProfileSetup && !teamStepCompleted,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load onboarding state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const cookieStore = await cookies();
    const session = await getServerAuthSession();
    const userId = session?.user?.id || (await getServerUserIdFromCookies(cookieStore, session));
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const owner = await isOrganizationOwner(userId);
    if (!owner) {
      return NextResponse.json({ error: "Only organization owners can update onboarding state." }, { status: 403 });
    }

    await queryNeon(
      `UPDATE public.profiles
       SET owner_onboarding_team_step_completed_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [userId],
    );

    return NextResponse.json({ data: { teamStepCompleted: true } }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update onboarding state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
