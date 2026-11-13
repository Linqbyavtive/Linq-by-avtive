import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import {
  getAuthSessionPayloadByUserId,
  getAuthUserByEmail,
  registerUser,
} from "@/lib/auth-db";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";

export type AppAuthSession = {
  expires: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationName: string;
  };
};

export async function getServerAuthSession(): Promise<AppAuthSession | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const email = String(user.email || "").trim().toLowerCase();
    if (!email) return null;

    let authUser = await getAuthUserByEmail(email);
    let internalUserId = authUser?.user_id;

    if (!internalUserId) {
      // Just-in-time provisioning: ensure Supabase user exists in internal auth_users & profiles
      const username = String(
        user.user_metadata?.username ||
          user.user_metadata?.name ||
          email.split("@")[0] ||
          "user",
      )
        .trim()
        .toLowerCase();
      const orgName = String(
        user.user_metadata?.organizationName ||
          user.user_metadata?.organization_name ||
          "",
      ).trim();

      try {
        const registered = await registerUser({
          email,
          password: crypto.randomUUID(),
          username,
          organizationName: orgName,
        });
        internalUserId = registered.userId;
      } catch {
        authUser = await getAuthUserByEmail(email);
        internalUserId = authUser?.user_id;
      }
    }

    if (!internalUserId) return null;

    const payload = await getAuthSessionPayloadByUserId(internalUserId);
    if (!payload) return null;

    const role = isConfiguredAdminEmail(payload.email) ? "admin" : (payload.role || "user");
    return {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.username || payload.email,
        role,
        organizationName: payload.organizationName || "",
      },
    };
  } catch {
    return null;
  }
}

// Backwards compatibility export for any legacy references
export const neonAuth = {
  handler: () => ({
    GET: () => Response.json({ status: "disabled" }),
    POST: () => Response.json({ status: "disabled" }),
    PUT: () => Response.json({ status: "disabled" }),
    DELETE: () => Response.json({ status: "disabled" }),
    PATCH: () => Response.json({ status: "disabled" }),
  }),
};