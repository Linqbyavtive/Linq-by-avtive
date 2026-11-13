import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getServerUserIdFromCookies } from "@/lib/auth-server";
import { runWithTenantContextAsync, type TenantContext } from "@/lib/tenant/context";
import { buildTenantContextForUser } from "@/lib/tenant/resolve";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";

export class ApiUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "ApiUnauthorizedError";
  }
}

export function isApiUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiUnauthorizedError;
}

export function apiRouteErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  if (isApiUnauthorizedError(error)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status: 500 });
}

function isSessionAdmin(session: Awaited<ReturnType<typeof getServerAuthSession>>): boolean {
  const role = String(session?.user?.role || "").toLowerCase();
  const email = String(session?.user?.email || "").trim().toLowerCase();
  return role === "admin" || isConfiguredAdminEmail(email);
}

export async function resolveTenantContextFromCookies(
  cookieStore: ReadonlyRequestCookies,
  options?: { allowAdminBypass?: boolean },
): Promise<TenantContext | null> {
  const userId = await getServerUserIdFromCookies(cookieStore);
  if (!userId) return null;

  const session = await getServerAuthSession();
  const bypassRls = Boolean(options?.allowAdminBypass && isSessionAdmin(session));
  return buildTenantContextForUser(userId, { bypassRls });
}

export async function withApiTenantContext<T>(
  cookieStore: ReadonlyRequestCookies,
  fn: () => Promise<T>,
  options?: { allowAdminBypass?: boolean },
): Promise<T> {
  const context = await resolveTenantContextFromCookies(cookieStore, options);
  if (!context) {
    throw new ApiUnauthorizedError();
  }
  return runWithTenantContextAsync(context, fn);
}
