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
  emailConfirm?: boolean;
};

export type SyncSupabaseAuthUserResult = {
  success: boolean;
  userId?: string;
  error?: string;
};

export async function findSupabaseUserByEmail(
  supabaseAdmin: SupabaseClient,
  email: string,
): Promise<{ id: string; email?: string } | null> {
  const targetEmail = email.toLowerCase().trim();

  // Fast path 1: Check public.auth_users for an already linked Supabase user id
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
      if (!error && data?.user?.id) {
        return { id: data.user.id, email: data.user.email };
      }
    }
  } catch {
    // Database query failed or table not found; proceed to direct auth schema / GoTrue
  }

  // Fast path 2: Direct lookup in auth.users table in Supabase Postgres schema
  try {
    const authUser = await queryNeonOneAsSystem<{ id: string; email: string }>(
      `SELECT id, email
       FROM auth.users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [targetEmail],
    );
    if (authUser?.id) {
      return { id: authUser.id, email: authUser.email };
    }
  } catch {
    // auth.users not accessible or non-postgres environment; proceed to listUsers API
  }

  // Standard path: Paginated lookup via GoTrue Admin API listUsers
  let page = 1;
  const perPage = 100;
  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;
    const match = data.users.find(
      (u) => u.email?.toLowerCase().trim() === targetEmail,
    );
    if (match) return match;
    if (data.users.length < perPage) break;
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
    const existing = await findSupabaseUserByEmail(supabaseAdmin, normalizedEmail);

    if (existing?.id) {
      // User exists: update password and confirm email
      const updatePayload: {
        password?: string;
        email_confirm?: boolean;
        user_metadata?: { name?: string };
      } = {
        email_confirm: emailConfirm,
      };
      if (params.password) updatePayload.password = params.password;
      if (params.name) updatePayload.user_metadata = { name: params.name };

      const { data: updateData, error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(existing.id, updatePayload);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return {
        success: true,
        userId: updateData?.user?.id || existing.id,
      };
    }

    // 2. User does not exist: create with confirmed email (bypasses SMTP)
    const { data: createData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: params.password,
        email_confirm: emailConfirm,
        user_metadata: params.name ? { name: params.name } : undefined,
      });

    if (createError) {
      // Handle edge-case race condition where user was created concurrently
      const isAlready =
        createError.message?.toLowerCase().includes("already") ||
        createError.message?.toLowerCase().includes("exists") ||
        (createError as unknown as { code?: string }).code === "email_exists" ||
        createError.status === 422;

      if (isAlready) {
        const raceExisting = await findSupabaseUserByEmail(supabaseAdmin, normalizedEmail);
        if (raceExisting?.id) {
          const updatePayload: {
            password?: string;
            email_confirm?: boolean;
            user_metadata?: { name?: string };
          } = {
            email_confirm: emailConfirm,
          };
          if (params.password) updatePayload.password = params.password;
          if (params.name) updatePayload.user_metadata = { name: params.name };

          const { data: raceUpdate, error: raceErr } =
            await supabaseAdmin.auth.admin.updateUserById(raceExisting.id, updatePayload);
          if (!raceErr && (raceUpdate?.user?.id || raceExisting.id)) {
            return { success: true, userId: raceUpdate?.user?.id || raceExisting.id };
          }
        }
      }

      return { success: false, error: createError.message };
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


