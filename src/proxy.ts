import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseMiddlewareClient } from "@/utils/supabase/middleware";
import { classifyApiRoute, clientIp, getRateLimiters, rateLimitKey } from "@/lib/rate-limit";

const isProtectedRoute =
  /^\/(dashboard|admin|events)(\/.*)?$|^\/cards(\/.*)?$|^\/organization(?!\/(register|status))(\/.*)?$|^\/invite(\/.*)?$/;
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isSameOriginMutation(request: NextRequest) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  try {
    if (origin) return new URL(origin).origin === expectedOrigin;
    if (referer) return new URL(referer).origin === expectedOrigin;
  } catch {
    return false;
  }

  return false;
}

export default async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("x-request-id", requestId);

  const withRequestId = (response: NextResponse) => {
    response.headers.set("x-request-id", requestId);
    return response;
  };

  if (pathname.startsWith("/api/")) {
    if (
      unsafeMethods.has(request.method) &&
      !pathname.startsWith("/api/auth/") &&
      !isSameOriginMutation(request)
    ) {
      return new NextResponse(JSON.stringify({ error: "Invalid request origin." }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "x-request-id": requestId,
        },
      });
    }

    const limiters = getRateLimiters();
    if (limiters) {
      const ip = clientIp(request);
      const tier = classifyApiRoute(pathname, request.method);
      const limiter = limiters[tier];
      const { success, reset, limit, remaining } = await limiter.limit(rateLimitKey(tier, ip));
      if (!success) {
        const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return new NextResponse(JSON.stringify({ error: "Too many requests. Please try again later." }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(Math.max(0, remaining)),
            "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
            "x-request-id": requestId,
          },
        });
      }
      const res = NextResponse.next({ request: { headers: reqHeaders } });
      res.headers.set("X-RateLimit-Limit", String(limit));
      res.headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
      res.headers.set("X-RateLimit-Reset", String(Math.ceil(reset / 1000)));
      res.headers.set("x-request-id", requestId);
      return res;
    }
    const res = NextResponse.next({ request: { headers: reqHeaders } });
    res.headers.set("x-request-id", requestId);
    return res;
  }

  // 2. Allow everyone to access public authentication pages (login, signup, forgot password, reset password, auth callbacks)
  // Preserve valid Supabase sessions across navigation and refreshes — never clear valid cookies on /login.
  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/")
  ) {
    return withRequestId(NextResponse.next({ request: { headers: reqHeaders } }));
  }

  // Allow public attendee shared badges (e.g. ?share=true or token-gated) to render
  const isPublicSharedCard =
    /^\/cards\/[0-9a-fA-F-]+$/.test(pathname) &&
    (url.searchParams.has("share") || url.searchParams.has("token"));

  const isProtected = isProtectedRoute.test(pathname) && !isPublicSharedCard;

  // Fast path: bypass auth parsing for public routes (e.g. /organization/register, /organization/status, public shared card)
  if (!isProtected) {
    return withRequestId(NextResponse.next({ request: { headers: reqHeaders } }));
  }

  // 3. Protect all dashboard and private routes using Supabase Auth exclusively
  const response = NextResponse.next({ request: { headers: reqHeaders } });
  let user: { id: string; email?: string; app_metadata?: Record<string, any>; user_metadata?: Record<string, any> } | null = null;

  try {
    const supabase = createSupabaseMiddlewareClient(request, response);
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    }
  } catch {
    user = null;
  }

  // If user is not authenticated with Supabase Auth, redirect to /login
  if (!user) {
    const redirectRes = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c);
    });
    return withRequestId(redirectRes);
  }

  // Role resolution: check admin status
  const userEmail = String(user.email || "").toLowerCase().trim();
  const userRole = String(user.app_metadata?.role || user.user_metadata?.role || "").toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminUser = userRole === "admin" || Boolean(userEmail && adminEmails.includes(userEmail));

  // Redirect admin users visiting /dashboard to /admin unless impersonating
  if (pathname.startsWith("/dashboard") && isAdminUser && !url.searchParams.get("impersonate")) {
    const adminRedirect = NextResponse.redirect(new URL("/admin", request.url));
    response.cookies.getAll().forEach((c) => {
      adminRedirect.cookies.set(c);
    });
    return withRequestId(adminRedirect);
  }

  return withRequestId(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
