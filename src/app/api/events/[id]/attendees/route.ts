import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queryNeon, queryNeonOneAsSystem } from "@/lib/neon-db";
import { updateAttendeeForTenant } from "@/lib/db/tenant-mutations";
import { getServerAuthSession } from "@/auth";
import { decryptAttendeeSensitiveFields } from "@/lib/security/attendee-sensitive";
import { logSecurityEvent } from "@/lib/security/telemetry";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";
import { isValidUuid } from "@/lib/validation/uuid";
import { apiRouteErrorResponse, isApiUnauthorizedError, withApiTenantContext } from "@/lib/tenant/api-context";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    return withApiTenantContext(cookieStore, async () => {
      const { id } = await params;
      if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid event id." }, { status: 400 });

      // Reuse the single cached server auth session
      const session = await getServerAuthSession();
      const viewerUserId = String(session?.user?.id || "").trim();
      if (!viewerUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const role = String(session?.user?.role || "").toLowerCase();
      const isAdmin = role === "admin" || isConfiguredAdminEmail(session?.user?.email);

      const requestUrl = new URL(req.url);
      const impersonateId = requestUrl.searchParams.get("impersonate");
      const isExport = requestUrl.searchParams.get("export") === "true";
      const limitParam = requestUrl.searchParams.get("limit");
      const offsetParam = requestUrl.searchParams.get("offset");

      const event = await queryNeonOneAsSystem<{ user_id: string | null }>(
        `SELECT user_id FROM public.events WHERE id = $1`,
        [id],
      );
      const ownsEvent = Boolean(event && event.user_id === viewerUserId);
      const canPreviewAsOrg = Boolean(
        event && isAdmin && impersonateId && event.user_id === impersonateId,
      );

      let isOrgTeamViewer = false;
      if (event?.user_id) {
        const membership = await queryNeonOneAsSystem<{ id: string }>(
          `SELECT id
           FROM public.organization_members
           WHERE member_user_id = $1
             AND org_owner_user_id = $2
             AND status = 'active'
           LIMIT 1`,
          [viewerUserId, event.user_id],
        );
        isOrgTeamViewer = Boolean(membership?.id);
      }

      // Active organization team members can view attendees by default.
      // Edit/delete remains separately permission-gated in UI and other APIs.
      if (!event || (!ownsEvent && !canPreviewAsOrg && !isOrgTeamViewer)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Selective projection: only fetch fields required for rendering, security decryption, and card operations
      const columns = `
        id, name, role, company, card_email, card_email_lookup_tag,
        event_name, session_date, session_time, location, track,
        guest_category, year, linkedin, event_id, photo_url,
        card_preview_url, design_type, card_color, card_font,
        attended, attendance_code, custom_fields, created_at, updated_at
      `;

      let data: Array<Record<string, unknown>> = [];
      let paginationMeta: { total?: number; limit?: number; offset?: number; hasMore?: boolean } | undefined;

      if (limitParam && !isExport) {
        const limit = Math.min(Math.max((limitParam ? parseInt(limitParam, 10) : 50) || 50, 1), 500);
        const offset = Math.max((offsetParam ? parseInt(offsetParam, 10) : 0) || 0, 0);

        const [rows, countRes] = await Promise.all([
          queryNeon<Record<string, unknown>>(
            `SELECT ${columns} FROM public.attendees WHERE event_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
            [id, limit, offset],
          ),
          queryNeonOneAsSystem<{ count: string }>(
            `SELECT COUNT(*)::text as count FROM public.attendees WHERE event_id = $1`,
            [id],
          ),
        ]);

        data = rows || [];
        const total = parseInt(countRes?.count || "0", 10);
        paginationMeta = {
          total,
          limit,
          offset,
          hasMore: offset + data.length < total,
        };
      } else {
        data = (await queryNeon<Record<string, unknown>>(
          `SELECT ${columns} FROM public.attendees WHERE event_id = $1 ORDER BY created_at DESC`,
          [id],
        )) || [];
      }

      const decrypted: Array<Record<string, unknown>> = [];
      const patchPromises: Promise<unknown>[] = [];

      for (const row of data) {
        const { row: secure, migrationPatch } = decryptAttendeeSensitiveFields(row);
        if (Object.keys(migrationPatch).length > 0 && row.id) {
          patchPromises.push(
            updateAttendeeForTenant(
              row.id as string,
              String(event?.user_id || ""),
              migrationPatch,
              "id",
            ).catch((migrationError: unknown) => {
              const migrationMessage =
                migrationError instanceof Error ? migrationError.message : "Failed to persist attendee migration patch.";
              logSecurityEvent({
                event: "security.event_attendees.migration_write_failed",
                level: "error",
                actorId: viewerUserId,
                resourceId: String(row.id),
                details: { reason: migrationMessage },
              });
            }),
          );
        }
        decrypted.push(secure);
      }

      if (patchPromises.length > 0) {
        await Promise.all(patchPromises);
      }

      return NextResponse.json({
        data: decrypted,
        ...(paginationMeta ? { pagination: paginationMeta } : {}),
      });
    }, { allowAdminBypass: true });
  } catch (err) {
    if (isApiUnauthorizedError(err)) {
      return apiRouteErrorResponse(err, "Unauthorized");
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    logSecurityEvent({
      event: "security.event_attendees.fetch_failed",
      level: "error",
      details: { reason: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
