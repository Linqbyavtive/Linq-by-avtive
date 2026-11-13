import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { queryNeonOneAsSystem } from "@/lib/neon-db";

let adminClient: SupabaseClient | null = null;
let lastSupabaseUrl = "";
let lastSupabaseKey = "";

export function getSupabaseAdminClient(): SupabaseClient | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";

  if (!supabaseUrl || !supabaseSecretKey) {
    return null;
  }

  if (!adminClient || lastSupabaseUrl !== supabaseUrl || lastSupabaseKey !== supabaseSecretKey) {
    adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    lastSupabaseUrl = supabaseUrl;
    lastSupabaseKey = supabaseSecretKey;
  }

  return adminClient;
}

export type SyncSupabaseAuthUserParams = {
  email: string;
  password?: string;
  name?: string;
  role?: string;
  emailConfirm?: boolean;
};

export type SyncSupabaseAuthUserResult = {
  success: boolean;
  userId?: string;
  error?: string;
};

export type FindSupabaseUserResult = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export class SupabaseAdminError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "SupabaseAdminError";
  }
}

export function getSupabaseProjectHostDiagnostics(): {
  publicHost: string | null;
  serverHost: string | null;
  isConsistent: boolean;
} {
  let publicHost: string | null = null;
  let serverHost: string | null = null;
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      publicHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    }
  } catch {}
  try {
    const srv = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (srv) {
      serverHost = new URL(srv).hostname;
    }
  } catch {}

  const isConsistent = !publicHost || !serverHost || publicHost === serverHost;
  return { publicHost, serverHost, isConsistent };
}

export async function findSupabaseUserByEmail(
  supabaseAdmin: SupabaseClient,
  email: string,
): Promise<FindSupabaseUserResult | null> {
  const targetEmail = email.toLowerCase().trim();

  // Fast path 1: Check public.auth_users for a candidate linked Supabase user id
  // Note: auth_users.neon_auth_user_id is treated strictly as a candidate link and verified against Supabase Admin API.
  try {
    const linked = await queryNeonOneAsSystem<{ neon_auth_user_id: string }>(
      `SELECT neon_auth_user_id
       FROM public.auth_users
       WHERE (email_normalized = $1 OR LOWER(email) = $1)
         AND neon_auth_user_id IS NOT NULL
       LIMIT 1`,
      [targetEmail],
    );
    if (linked?.neon_auth_user_id && typeof supabaseAdmin.auth.admin.getUserById === "function") {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(linked.neon_auth_user_id);
      if (error) {
        if (error.status === 401 || error.status === 403) {
          throw new SupabaseAdminError(
            error.message || "Supabase Admin API unauthorized.",
            error.status,
            (error as unknown as { code?: string }).code,
          );
        }
        // If 404 or other not-found error, the historical ID no longer exists in this Supabase project; continue to listUsers
      } else if (data?.user?.id) {
        const candidateEmail = data.user.email?.toLowerCase().trim();
        if (!candidateEmail || candidateEmail === targetEmail) {
          return {
            id: data.user.id,
            email: data.user.email,
            user_metadata: (data.user.user_metadata as Record<string, unknown>) || {},
            app_metadata: (data.user.app_metadata as Record<string, unknown>) || {},
          };
        }
      }
    }
  } catch (dbErr) {
    if (dbErr instanceof SupabaseAdminError) throw dbErr;
    // Database query failed or table not found; proceed to direct Supabase Admin API listUsers
  }

  // Standard path: Paginated lookup directly via GoTrue Admin API listUsers
  let page = 1;
  const perPage = 100;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new SupabaseAdminError(
        error.message || "Failed to list Supabase users from Admin API.",
        error.status,
        (error as unknown as { code?: string }).code,
      );
    }
    if (!data?.users || data.users.length === 0) {
      return null;
    }
    const match = data.users.find(
      (u) => u.email?.toLowerCase().trim() === targetEmail,
    );
    if (match) {
      return {
        id: match.id,
        email: match.email,
        user_metadata: (match.user_metadata as Record<string, unknown>) || {},
        app_metadata: (match.app_metadata as Record<string, unknown>) || {},
      };
    }
    if (data.users.length < perPage) {
      return null;
    }
    page++;
  }
  return null;
}

export async function syncSupabaseAuthUser(
  params: SyncSupabaseAuthUserParams,
): Promise<SyncSupabaseAuthUserResult> {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      success: false,
      error: "Supabase admin client not configured. Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const normalizedEmail = params.email.toLowerCase().trim();
  const emailConfirm = params.emailConfirm ?? true;

  try {
    // 1. Check if the user already exists in Supabase Auth
    let existing;
    try {
      existing = await findSupabaseUserByEmail(supabaseAdmin, normalizedEmail);
    } catch (lookupErr) {
      const errMsg = lookupErr instanceof Error ? lookupErr.message : String(lookupErr);
      return {
        success: false,
        error: `Supabase user lookup failed: ${errMsg}`,
      };
    }

    if (existing?.id) {
      // User exists: update password and confirm email, preserving existing user_metadata and app_metadata
      const mergedUserMetadata: Record<string, unknown> = {
        ...(existing.user_metadata || {}),
        ...(params.name ? { name: params.name } : {}),
        ...(params.role ? { role: params.role } : {}),
      };
      const mergedAppMetadata: Record<string, unknown> = {
        ...(existing.app_metadata || {}),
        ...(params.role ? { role: params.role } : {}),
      };

      const updatePayload: {
        password?: string;
        email_confirm?: boolean;
        user_metadata?: Record<string, unknown>;
        app_metadata?: Record<string, unknown>;
      } = {
        email_confirm: emailConfirm,
      };
      if (params.password) updatePayload.password = params.password;
      if (Object.keys(mergedUserMetadata).length > 0) {
        updatePayload.user_metadata = mergedUserMetadata;
      }
      if (Object.keys(mergedAppMetadata).length > 0) {
        updatePayload.app_metadata = mergedAppMetadata;
      }

      const { data: updateData, error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(existing.id, updatePayload);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      if (
        emailConfirm &&
        updateData?.user &&
        "email_confirmed_at" in updateData.user &&
        !updateData.user.email_confirmed_at
      ) {
        return {
          success: false,
          error: "Supabase Admin API updated user but email confirmation timestamp was not set.",
        };
      }

      return {
        success: true,
        userId: updateData?.user?.id || existing.id,
      };
    }

    // 2. User is confirmed absent: create with confirmed email (bypasses SMTP)
    const { data: createData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: params.password,
        email_confirm: emailConfirm,
        user_metadata: (params.name || params.role)
          ? {
            ...(params.name ? { name: params.name } : {}),
            ...(params.role ? { role: params.role } : {}),
          }
          : undefined,
        app_metadata: params.role ? { role: params.role } : undefined,
      });

    if (createError) {
      // Handle edge-case race condition where user was created concurrently
      const isAlready =
        createError.message?.toLowerCase().includes("already") ||
        createError.message?.toLowerCase().includes("exists") ||
        (createError as unknown as { code?: string }).code === "email_exists" ||
        createError.status === 422;

      if (isAlready) {
        try {
          const raceExisting = await findSupabaseUserByEmail(supabaseAdmin, normalizedEmail);
          if (raceExisting?.id) {
            const mergedUserMetadata: Record<string, unknown> = {
              ...(raceExisting.user_metadata || {}),
              ...(params.name ? { name: params.name } : {}),
              ...(params.role ? { role: params.role } : {}),
            };
            const mergedAppMetadata: Record<string, unknown> = {
              ...(raceExisting.app_metadata || {}),
              ...(params.role ? { role: params.role } : {}),
            };

            const updatePayload: {
              password?: string;
              email_confirm?: boolean;
              user_metadata?: Record<string, unknown>;
              app_metadata?: Record<string, unknown>;
            } = {
              email_confirm: emailConfirm,
            };
            if (params.password) updatePayload.password = params.password;
            if (Object.keys(mergedUserMetadata).length > 0) {
              updatePayload.user_metadata = mergedUserMetadata;
            }
            if (Object.keys(mergedAppMetadata).length > 0) {
              updatePayload.app_metadata = mergedAppMetadata;
            }

            const { data: raceUpdate, error: raceErr } =
              await supabaseAdmin.auth.admin.updateUserById(raceExisting.id, updatePayload);
            if (!raceErr && (raceUpdate?.user?.id || raceExisting.id)) {
              if (
                emailConfirm &&
                raceUpdate?.user &&
                "email_confirmed_at" in raceUpdate.user &&
                !raceUpdate.user.email_confirmed_at
              ) {
                return {
                  success: false,
                  error: "Supabase Admin API updated user but email confirmation timestamp was not set.",
                };
              }
              return { success: true, userId: raceUpdate?.user?.id || raceExisting.id };
            }
          }
        } catch {
          // Fall through to error return below
        }
      }

      return { success: false, error: createError.message };
    }

    if (
      emailConfirm &&
      createData?.user &&
      "email_confirmed_at" in createData.user &&
      !createData.user.email_confirmed_at
    ) {
      return {
        success: false,
        error: "Supabase Admin API created user but email confirmation timestamp was not set.",
      };
    }

    return {
      success: true,
      userId: createData?.user?.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Supabase user sync error.";
    return { success: false, error: message };
  }
}


