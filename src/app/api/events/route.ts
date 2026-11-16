import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getServerAuthSession } from "@/auth";
import { getServerUserIdFromCookies } from "@/lib/auth-server";
import { queryNeon, queryNeonOne, queryNeonOneAsSystem } from "@/lib/neon-db";
import { getDefaultRegistrationFormConfig, normalizeRegistrationFormConfig } from "@/lib/registration-form";
import { sanitizeStoredCardFont } from "@/lib/card-fonts";
import { apiRouteErrorResponse, withApiTenantContext } from "@/lib/tenant/api-context";
import { logger } from "@/lib/logger-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPastEventDate(dateStr: string) {
  const parsed = new Date(`${dateStr}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bufferTime = new Date(today.getTime() - 48 * 60 * 60 * 1000);
  return parsed < bufferTime;
}

function getViewerAdminAccess(params: {
  viewerId: string;
  sessionUserId: string;
  sessionRole: string;
  sessionEmail: string;
}) {
  const { viewerId, sessionUserId, sessionRole, sessionEmail } = params;
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return {
    isAdminByRole: sessionUserId === viewerId && sessionRole === "admin",
    isAdminByEmail: Boolean(sessionUserId === viewerId && sessionEmail && adminEmails.includes(sessionEmail)),
  };
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    return await withApiTenantContext(cookieStore, async () => {
      const session = await getServerAuthSession();
      const viewerId = String(session?.user?.id || "").trim() || (await getServerUserIdFromCookies(cookieStore, session));
      if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const sessionRole = String(session?.user?.role || "").toLowerCase();
      const sessionEmail = String(session?.user?.email || "").toLowerCase().trim();

      const url = new URL(req.url);
      const rawOwner = url.searchParams.get("ownerId")?.trim();
      const ownerId = rawOwner && rawOwner !== "undefined" && rawOwner !== "null" && rawOwner.length > 0
        ? rawOwner
        : viewerId;
      const includeRoleStats = url.searchParams.get("includeRoleStats") === "true";

      const { isAdminByRole, isAdminByEmail } = getViewerAdminAccess({
        viewerId,
        sessionUserId: viewerId,
        sessionRole,
        sessionEmail,
      });
      let canView = ownerId === viewerId || isAdminByRole || isAdminByEmail;
      if (!canView) {
        const member = await queryNeonOne<{ id: string }>(
          `SELECT id
           FROM public.organization_members
           WHERE member_user_id = $1
             AND org_owner_user_id = $2
             AND status = 'active'
           LIMIT 1`,
          [viewerId, ownerId],
        );
        canView = Boolean(member?.id);
      }
      if (!canView) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

      const eventsQuery = queryNeon<{
        id: string;
        name: string;
        description: string;
        location: string;
        date: string;
        logo_url: string | null;
        short_id: string | null;
        attendee_count: string | number;
      }>(
        `SELECT e.id, e.name, e.description, e.location, e.date, e.logo_url, e.short_id, COUNT(a.id)::int AS attendee_count
         FROM public.events e
         LEFT JOIN public.attendees a ON a.event_id = e.id
         WHERE e.user_id = $1
         GROUP BY e.id
         ORDER BY MAX(e.created_at) DESC`,
        [ownerId],
      );

      const roleStatsQuery = includeRoleStats
        ? queryNeon<{ role: string; count: string | number }>(
          `SELECT a.role, COUNT(*)::int AS count
             FROM public.attendees a
             INNER JOIN public.events e ON e.id = a.event_id
             WHERE e.user_id = $1
               AND NULLIF(TRIM(a.role), '') IS NOT NULL
             GROUP BY a.role
             ORDER BY count DESC, a.role ASC
             LIMIT 5`,
          [ownerId],
        )
        : Promise.resolve([] as Array<{ role: string; count: string | number }>);

      const [rows, roleStats] = await Promise.all([eventsQuery, roleStatsQuery]);

      return NextResponse.json(
        {
          data: rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            location: row.location,
            date: row.date,
            logo_url: row.logo_url,
            shortId: row.short_id,
            attendeeCount: Number(row.attendee_count || 0),
          })),
          topRoles: roleStats.map((row) => ({
            role: row.role,
            count: Number(row.count || 0),
          })),
        },
        { status: 200 },
      );
    }, { allowAdminBypass: true });
  } catch (error: unknown) {
    return apiRouteErrorResponse(error, "Failed to load events.");
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const [session, authUserId] = await Promise.all([
      getServerAuthSession(),
      getServerUserIdFromCookies(cookieStore),
    ]);
    const viewerId = String(authUserId || session?.user?.id || "").trim();
    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      name,
      description = "",
      location,
      location_type = "onsite",
      date,
      time = "10:00",
      logo_url = "",
      ownerId,
      registration_form_config,
      card_color = "purple",
      card_font,
      horizontal_text_color = "",
      vertical_text_color = "",
      is_branding_finalized = false,
    } = body;

    const trimmedName = String(name || "").trim();
    const trimmedLocation = String(location || "").trim();
    const trimmedDate = String(date || "").trim();

    if (!trimmedName || !trimmedLocation || !trimmedDate) {
      return NextResponse.json(
        { error: "Missing required event fields (name, location, date)." },
        { status: 400 }
      );
    }

    if (isPastEventDate(trimmedDate)) {
      return NextResponse.json(
        { error: "Event date must be today or in the future." },
        { status: 400 }
      );
    }

    const rawOwner = ownerId ? String(ownerId).trim() : "";
    const targetUserId = rawOwner && rawOwner !== "undefined" && rawOwner !== "null" && rawOwner.length > 0
      ? rawOwner
      : viewerId;

    const MAX_RETRIES = 5;
    let row: { id: string; short_id: string } | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // 12-char unique hex string per iteration
      const safeShortId = crypto.randomBytes(6).toString("hex");

      try {
        row = await queryNeonOneAsSystem<{ id: string; short_id: string }>(
          `INSERT INTO public.events
           (name, description, location, location_type, date, time, logo_url, user_id, short_id,
            registration_form_config, card_color, card_font, horizontal_text_color, vertical_text_color, is_branding_finalized)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15)
           ON CONFLICT (short_id) DO NOTHING
           RETURNING id, short_id`,
          [
            trimmedName,
            String(description || "").trim().slice(0, 220),
            trimmedLocation,
            location_type === "webinar" ? "webinar" : "onsite",
            trimmedDate,
            String(time || "10:00").trim() || "10:00",
            String(logo_url || ""),
            targetUserId,
            safeShortId,
            JSON.stringify(normalizeRegistrationFormConfig(registration_form_config || getDefaultRegistrationFormConfig())),
            String(card_color || "purple").trim() || "purple",
            sanitizeStoredCardFont(card_font),
            String(horizontal_text_color || "").trim(),
            String(vertical_text_color || "").trim(),
            Boolean(is_branding_finalized ?? false),
          ],
        );

        if (row?.id) {
          logger.info(
            { eventId: row.id, shortId: row.short_id, attempt },
            "Event successfully created with unique short_id",
          );
          break;
        }
      } catch (insertError: unknown) {
        console.error(`[DB Insert Attempt ${attempt} Error]:`, insertError);

        const errObj = insertError as { code?: string; message?: string };
        const isUniqueConstraint =
          errObj?.code === "23505" ||
          errObj?.code === "P2002" ||
          errObj?.message?.includes("events_short_id_key") ||
          errObj?.message?.includes("short_id");

        if (isUniqueConstraint && attempt < MAX_RETRIES) {
          continue;
        }

        throw insertError;
      }
    }

    if (!row?.id) {
      return NextResponse.json(
        { error: "Failed to create event: could not generate unique short ID." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { id: row.id, shortId: row.short_id }, success: true },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[Events POST Error]:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}