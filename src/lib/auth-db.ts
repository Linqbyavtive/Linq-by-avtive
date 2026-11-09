import crypto from "node:crypto";
import { logger } from "@/lib/logger-server";
import { queryNeonAsSystem, queryNeonOneAsSystem } from "@/lib/neon-db";
import { normalizeOrganizationName, toOrganizationKey } from "@/lib/organization/normalize";

export type AuthUserRecord = {
  user_id: string;
  email: string;
  /** Present for credential login; null for Clerk-linked-only rows once provisioning supports them */
  password_hash: string | null;
  role: string | null;
  username: string | null;
  organization_name: string | null;
};

let superAdminEnsured = false;
let argon2ModulePromise: Promise<typeof import("argon2")> | null = null;

/** Lowercase trimmed email for indexed auth_users lookups. */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
};

function getArgon2() {
  if (!argon2ModulePromise) {
    argon2ModulePromise = import("argon2");
  }
  return argon2ModulePromise;
}

export async function ensureAuthSchema() {
  // Schema is owned exclusively by Prisma migrations. Retained as a no-op while
  // legacy call sites are removed, but it must never mutate production at request time.
  return;
}

function normalizeBootstrapUsername(email: string) {
  const base = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "") || "superadmin";
  return base.slice(0, 30) || "superadmin";
}

async function ensureBootstrapSuperAdmin() {
  if (superAdminEnsured) return;
  try {
    const superAdminPassword = String(process.env.SUPERADMIN_PASSWORD || "");
    const adminPassword = String(process.env.ADMIN_PASSWORD || superAdminPassword);
    if (!superAdminPassword && !adminPassword) return;

    await ensureAuthSchema();

    const rawAdminEmails = [
      process.env.SUPERADMIN_EMAIL,
      process.env.ADMIN_EMAIL,
      ...(process.env.ADMIN_EMAILS || "").split(","),
      process.env.NEXT_PUBLIC_ADMIN_EMAIL,
      ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(","),
    ];

    const adminEmails = Array.from(
      new Set(
        rawAdminEmails
          .map((e) => String(e || "").trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    if (adminEmails.length === 0) return;

    const organizationName = normalizeOrganizationName(
      String(process.env.SUPERADMIN_ORGANIZATION_NAME || "Platform Admin"),
    );
    const organizationKey = toOrganizationKey(organizationName);
    const argon2 = await getArgon2();

    const superAdminEmail = String(process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();

    for (const email of adminEmails) {
      const pwd = email === superAdminEmail ? superAdminPassword : adminPassword;
      if (!pwd) continue;
      const passwordHash = await argon2.hash(pwd, ARGON2_OPTIONS);

      const requestedUsername = normalizeBootstrapUsername(
        email === superAdminEmail
          ? String(process.env.SUPERADMIN_USERNAME || email)
          : email,
      );

      const existingAuth = await queryNeonOneAsSystem<{ user_id: string }>(
        `SELECT user_id
         FROM public.auth_users
         WHERE email_normalized = $1 OR LOWER(email) = $1
         LIMIT 1`,
        [email],
      );

      let userId = existingAuth?.user_id || "";
      if (!userId) userId = crypto.randomUUID();

      const usernameTakenByOther = await queryNeonOneAsSystem<{ id: string }>(
        `SELECT id
         FROM public.profiles
         WHERE username = $1
           AND id <> $2
         LIMIT 1`,
        [requestedUsername, userId],
      );
      const username = usernameTakenByOther?.id
        ? `${requestedUsername}_${userId.replace(/-/g, "").slice(0, 8)}`
        : requestedUsername;

      await queryNeonAsSystem(
        `INSERT INTO public.profiles (id, username, organization_name, organization_name_key, role, created_at)
         VALUES ($1, $2, $3, $4, 'admin', now())
         ON CONFLICT (id) DO UPDATE
         SET role = 'admin',
             username = EXCLUDED.username,
             organization_name = EXCLUDED.organization_name,
             organization_name_key = EXCLUDED.organization_name_key`,
        [userId, username, organizationName, organizationKey || null],
      );

      await queryNeonAsSystem(
        `INSERT INTO public.auth_users (user_id, email, email_normalized, password_hash, created_at, updated_at)
         VALUES ($1, $2, $2, $3, now(), now())
         ON CONFLICT (user_id) DO UPDATE
         SET email = EXCLUDED.email,
             email_normalized = EXCLUDED.email_normalized,
             password_hash = EXCLUDED.password_hash,
             updated_at = now()`,
        [userId, email, passwordHash],
      );

      if (organizationKey) {
        await queryNeonAsSystem(
          `INSERT INTO public.organizations (organization_name, organization_name_key, owner_user_id, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())
           ON CONFLICT (organization_name_key)
           DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, organization_name = EXCLUDED.organization_name, updated_at = now()`,
          [organizationName, organizationKey, userId],
        );
      }
    }

    superAdminEnsured = true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown bootstrap error";
    logger.error({ err: error instanceof Error ? error : undefined, message }, "SUPERADMIN bootstrap failed");
    superAdminEnsured = true;
  }
}

export class AuthInfrastructureError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = "AuthInfrastructureError";
  }
}

export async function getAuthUserByEmail(email: string): Promise<AuthUserRecord | null> {
  await ensureAuthSchema();
  await ensureBootstrapSuperAdmin();
  const normalizedEmail = normalizeAuthEmail(email);
  if (!normalizedEmail) return null;

  return queryNeonOneAsSystem<AuthUserRecord>(
    `SELECT au.user_id,
            au.email,
            au.password_hash,
            COALESCE(p.role::text, 'user') AS role,
            COALESCE(p.username, au.email) AS username,
            p.organization_name
     FROM public.auth_users au
     LEFT JOIN public.profiles p ON p.id = au.user_id
     WHERE au.email_normalized = $1 OR LOWER(au.email) = $1
     LIMIT 1`,
    [normalizedEmail],
  );
}

export async function verifyPassword(email: string, password: string): Promise<AuthUserRecord | null> {
  let user: AuthUserRecord | null;
  try {
    user = await getAuthUserByEmail(email);
  } catch (dbErr) {
    throw new AuthInfrastructureError(
      `Database query failed during user lookup: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`,
      dbErr,
    );
  }

  if (!user || !user.password_hash) return null;

  let argon2: typeof import("argon2");
  try {
    argon2 = await getArgon2();
  } catch (modErr) {
    argon2ModulePromise = null;
    throw new AuthInfrastructureError(
      `Argon2 cryptographic runtime unavailable: ${modErr instanceof Error ? modErr.message : String(modErr)}`,
      modErr,
    );
  }

  const rawPepper = process.env.PASSWORD_PEPPER || "";
  const cleanPepper = rawPepper.replace(/^["']|["']$/g, "").trim();

  // 1. Direct unpeppered verification
  try {
    const ok = await argon2.verify(user.password_hash, password);
    if (ok) return user;
  } catch {
    // Hash format mismatch or non-argon2
  }

  // 2. Peppered verification (raw pepper)
  if (rawPepper) {
    try {
      const okPeppered = await argon2.verify(user.password_hash, `${password}${rawPepper}`);
      if (okPeppered) return user;
    } catch {
      // Hash format mismatch
    }
  }

  // 3. Clean pepper verification (trimmed/unquoted)
  if (cleanPepper && cleanPepper !== rawPepper) {
    try {
      const okClean = await argon2.verify(user.password_hash, `${password}${cleanPepper}`);
      if (okClean) return user;
    } catch {
      // Hash format mismatch
    }
  }

  return null;
}

export async function getInternalUserIdByClerkUserId(clerkUserId: string): Promise<string | null> {
  await ensureAuthSchema();
  const row = await queryNeonOneAsSystem<{ user_id: string }>(
    `SELECT user_id FROM public.auth_users WHERE clerk_user_id = $1 LIMIT 1`,
    [clerkUserId],
  );
  return row?.user_id ?? null;
}

/**
 * Resolve Clerk subject → existing auth_users.user_id by clerk_user_id or verified primary email.
 * Links clerk_user_id on first successful email match.
 */
export async function linkAuthUserToClerkUser(clerkUserId: string, email: string): Promise<string | null> {
  await ensureAuthSchema();
  const normalizedEmail = normalizeAuthEmail(email);
  if (!normalizedEmail) return null;

  const already = await getInternalUserIdByClerkUserId(clerkUserId);
  if (already) return already;

  const byEmail = await queryNeonOneAsSystem<{ user_id: string }>(
    `SELECT user_id FROM public.auth_users WHERE email_normalized = $1 OR LOWER(email) = $1 LIMIT 1`,
    [normalizedEmail],
  );
  if (!byEmail?.user_id) return null;

  await queryNeonAsSystem(
    `UPDATE public.auth_users SET clerk_user_id = $1, updated_at = now() WHERE user_id = $2`,
    [clerkUserId, byEmail.user_id],
  );
  return byEmail.user_id;
}

export async function getAuthSessionPayloadByUserId(userId: string): Promise<{
  userId: string;
  email: string;
  username: string | null;
  role: string;
  organizationName: string | null;
} | null> {
  await ensureAuthSchema();
  const row = await queryNeonOneAsSystem<{
    userId: string;
    email: string;
    username: string | null;
    role: string | null;
    organizationName: string | null;
  }>(
    `SELECT au.user_id AS "userId",
            au.email,
            COALESCE(p.username, au.email) AS username,
            COALESCE(p.role::text, 'user') AS role,
            p.organization_name AS "organizationName"
     FROM public.auth_users au
     LEFT JOIN public.profiles p ON p.id = au.user_id
     WHERE au.user_id = $1
     LIMIT 1`,
    [userId],
  );
  if (!row) return null;
  return {
    userId: row.userId,
    email: row.email,
    username: row.username,
    role: row.role || "user",
    organizationName: row.organizationName,
  };
}

export async function getInternalUserIdByNeonAuthUserId(neonAuthUserId: string): Promise<string | null> {
  await ensureAuthSchema();
  const row = await queryNeonOneAsSystem<{ user_id: string }>(
    `SELECT user_id FROM public.auth_users WHERE neon_auth_user_id = $1 LIMIT 1`,
    [neonAuthUserId],
  );
  return row?.user_id ?? null;
}

export async function linkAuthUserToNeonAuthUser(neonAuthUserId: string, email: string): Promise<string | null> {
  await ensureAuthSchema();
  const normalizedEmail = normalizeAuthEmail(email);
  if (!neonAuthUserId || !normalizedEmail) return null;

  const already = await getInternalUserIdByNeonAuthUserId(neonAuthUserId);
  if (already) return already;

  const byEmail = await queryNeonOneAsSystem<{ user_id: string }>(
    `SELECT user_id FROM public.auth_users WHERE email_normalized = $1 OR LOWER(email) = $1 LIMIT 1`,
    [normalizedEmail],
  );
  if (!byEmail?.user_id) return null;

  await queryNeonAsSystem(
    `UPDATE public.auth_users
     SET neon_auth_user_id = $1,
         email_normalized = COALESCE(email_normalized, $2),
         updated_at = now()
     WHERE user_id = $3`,
    [neonAuthUserId, normalizedEmail, byEmail.user_id],
  );
  return byEmail.user_id;
}

export async function registerUser(input: {
  email: string;
  password: string;
  username: string;
  organizationName: string;
  organizationLogoUrl?: string;
  linkedin?: string;
  neonAuthUserId?: string;
}): Promise<{ userId: string; email: string; role: string }> {
  await ensureAuthSchema();
  const email = normalizeAuthEmail(input.email);
  const username = input.username.trim().toLowerCase();
  const organizationName = normalizeOrganizationName(input.organizationName);
  const organizationKey = toOrganizationKey(organizationName);
  const organizationLogoUrl = String(input.organizationLogoUrl || "").trim();
  const linkedin = String(input.linkedin || "").trim();

  const existingEmail = await queryNeonOneAsSystem<{ user_id: string }>(
    `SELECT user_id FROM public.auth_users WHERE email_normalized = $1 OR LOWER(email) = $1 LIMIT 1`,
    [email],
  );

  const existingUsername = await queryNeonOneAsSystem<{ id: string }>(
    `SELECT id FROM public.profiles WHERE username = $1 LIMIT 1`,
    [username],
  );

  let userId: string;
  let passwordHash: string | null = null;
  if (input.password) {
    const argon2 = await getArgon2();
    passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);
  }

  if (existingEmail?.user_id) {
    userId = existingEmail.user_id;
    if (existingUsername?.id && existingUsername.id !== userId) {
      throw new Error("Username already exists.");
    }

    await queryNeonAsSystem(
      `UPDATE public.profiles
       SET username = COALESCE($1, username),
           organization_name = COALESCE($2, organization_name),
           organization_name_key = COALESCE($3, organization_name_key),
           updated_at = now()
       WHERE id = $4`,
      [username || null, organizationName || null, organizationKey || null, userId],
    );

    if (passwordHash || input.neonAuthUserId) {
      await queryNeonAsSystem(
        `UPDATE public.auth_users
         SET password_hash = COALESCE($1, password_hash),
             neon_auth_user_id = COALESCE($2, neon_auth_user_id),
             updated_at = now()
         WHERE user_id = $3`,
        [passwordHash, input.neonAuthUserId || null, userId],
      );
    }
  } else {
    if (existingUsername?.id) {
      throw new Error("Username already exists.");
    }

    userId = crypto.randomUUID();

    await queryNeonAsSystem(
      `INSERT INTO public.profiles (id, username, organization_name, organization_name_key, role, created_at)
       VALUES ($1, $2, $3, $4, 'user', now())
       ON CONFLICT (id) DO UPDATE
       SET username = EXCLUDED.username,
           organization_name = EXCLUDED.organization_name,
           organization_name_key = EXCLUDED.organization_name_key`,
      [userId, username, organizationName, organizationKey],
    );

    await queryNeonAsSystem(
      `INSERT INTO public.auth_users (user_id, email, email_normalized, password_hash, neon_auth_user_id, created_at, updated_at)
       VALUES ($1, $2, $2, $3, $4, now(), now())
       ON CONFLICT (user_id) DO UPDATE
       SET email = EXCLUDED.email,
           email_normalized = EXCLUDED.email_normalized,
           password_hash = COALESCE(EXCLUDED.password_hash, auth_users.password_hash),
           neon_auth_user_id = COALESCE(EXCLUDED.neon_auth_user_id, auth_users.neon_auth_user_id),
           updated_at = now()`,
      [userId, email, passwordHash, input.neonAuthUserId || null],
    );
  }

  if (organizationKey) {
    await queryNeonAsSystem(
      `INSERT INTO public.organizations (organization_name, organization_name_key, owner_user_id, organization_logo_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now())
       ON CONFLICT (organization_name_key) DO UPDATE
       SET organization_name = EXCLUDED.organization_name,
           owner_user_id = COALESCE(public.organizations.owner_user_id, EXCLUDED.owner_user_id),
           organization_logo_url = COALESCE(public.organizations.organization_logo_url, EXCLUDED.organization_logo_url),
           updated_at = now()`,
      [organizationName, organizationKey, userId, organizationLogoUrl || null],
    );
  }

  // Optional column support: persist uploaded organization logo if schema has organization_logo_url.
  if (organizationLogoUrl) {
    try {
      await queryNeonAsSystem(
        `UPDATE public.profiles
         SET organization_logo_url = $1, updated_at = now()
         WHERE id = $2`,
        [organizationLogoUrl, userId],
      );
    } catch {
      try {
        await queryNeonAsSystem(
          `UPDATE public.profiles SET organization_logo_url = $1 WHERE id = $2`,
          [organizationLogoUrl, userId],
        );
      } catch {
        logger.warn("[registerUser] organization_logo_url not persisted; check profiles schema/columns.");
      }
    }
  }

  if (linkedin) {
    await queryNeonAsSystem(
      `UPDATE public.profiles SET updated_at = now() WHERE id = $1`,
      [userId],
    );
  }

  return { userId, email, role: "user" };
}

export async function createOrganizationOwnerByAdmin(input: {
  organizationName: string;
  email: string;
  password: string;
}): Promise<{ userId: string; email: string; organizationName: string }> {
  await ensureAuthSchema();
  await ensureBootstrapSuperAdmin();

  const email = normalizeAuthEmail(input.email);
  if (!email) throw new Error("Email is required.");
  const existingEmail = await queryNeonOneAsSystem<{ user_id: string }>(
    `SELECT user_id FROM public.auth_users WHERE email_normalized = $1 OR LOWER(email) = $1 LIMIT 1`,
    [email],
  );
  if (existingEmail?.user_id) {
    throw new Error("An account with this email already exists.");
  }

  const organizationName = normalizeOrganizationName(input.organizationName);
  if (!organizationName) {
    throw new Error("Organization name is required.");
  }
  const organizationKey = toOrganizationKey(organizationName);
  if (!organizationKey) {
    throw new Error("Invalid organization name.");
  }

  const existingOrg = await queryNeonOneAsSystem<{ id: string }>(
    `SELECT id FROM public.organizations WHERE organization_name_key = $1 OR LOWER(organization_name) = $2 LIMIT 1`,
    [organizationKey, organizationName],
  );
  if (existingOrg?.id) {
    throw new Error("Organization name is already in use.");
  }

  const userId = crypto.randomUUID();
  const argon2 = await getArgon2();
  const hash = await argon2.hash(input.password, ARGON2_OPTIONS);
  const requestedBaseUsername =
    (email.split("@")[0] || "user").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 18) || "user";
  let pendingUsername = `${requestedBaseUsername}_${userId.replace(/-/g, "").slice(0, 8)}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existingUsername = await queryNeonOneAsSystem<{ id: string }>(
      `SELECT id FROM public.profiles WHERE username = $1 LIMIT 1`,
      [pendingUsername],
    );
    if (!existingUsername?.id) break;
    pendingUsername = `${requestedBaseUsername}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  }

  await queryNeonAsSystem(
    `INSERT INTO public.profiles (id, username, organization_name, organization_name_key, role, created_at)
     VALUES ($1, $2, $3, $4, 'user', now())
     ON CONFLICT (id) DO UPDATE
     SET username = EXCLUDED.username,
         organization_name = EXCLUDED.organization_name,
         organization_name_key = EXCLUDED.organization_name_key,
         role = COALESCE(public.profiles.role, 'user'),
         updated_at = now()`,
    [userId, pendingUsername, organizationName, organizationKey],
  );

  await queryNeonAsSystem(
    `INSERT INTO public.auth_users (user_id, email, email_normalized, password_hash, created_at, updated_at)
     VALUES ($1, $2, $2, $3, now(), now())
     ON CONFLICT (user_id) DO UPDATE
     SET email = EXCLUDED.email,
         email_normalized = EXCLUDED.email_normalized,
         password_hash = EXCLUDED.password_hash,
         updated_at = now()`,
    [userId, email, hash],
  );

  await queryNeonAsSystem(
    `INSERT INTO public.organizations (organization_name, organization_name_key, owner_user_id, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now())
     ON CONFLICT (organization_name_key) DO UPDATE
     SET organization_name = EXCLUDED.organization_name,
         owner_user_id = EXCLUDED.owner_user_id,
         updated_at = now()`,
    [organizationName, organizationKey, userId],
  );

  return { userId, email, organizationName };
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  await ensureAuthSchema();
  await ensureBootstrapSuperAdmin();
  const normalized = normalizeAuthEmail(email);
  if (!normalized) return null;

  const user = await queryNeonOneAsSystem<{ user_id: string }>(
    `SELECT user_id FROM public.auth_users WHERE email_normalized = $1 OR LOWER(email) = $1 LIMIT 1`,
    [normalized],
  );
  if (!user?.user_id) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString();

  await queryNeonAsSystem(
    `UPDATE public.auth_users
     SET reset_token_hash = $1, reset_token_expires_at = $2, updated_at = now()
     WHERE user_id = $3`,
    [tokenHash, expires, user.user_id],
  );

  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  await ensureAuthSchema();
  const tokenHash = sha256(token);
  const row = await queryNeonOneAsSystem<{ user_id: string }>(
    `SELECT user_id
     FROM public.auth_users
     WHERE reset_token_hash = $1
       AND reset_token_expires_at IS NOT NULL
       AND reset_token_expires_at > now()
     LIMIT 1`,
    [tokenHash],
  );
  if (!row?.user_id) return false;

  const argon2 = await getArgon2();
  const hash = await argon2.hash(newPassword, ARGON2_OPTIONS);
  await queryNeonAsSystem(
    `UPDATE public.auth_users
     SET password_hash = $1,
         reset_token_hash = NULL,
         reset_token_expires_at = NULL,
         updated_at = now()
     WHERE user_id = $2`,
    [hash, row.user_id],
  );
  return true;
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  await ensureAuthSchema();
  await ensureBootstrapSuperAdmin();

  const user = await queryNeonOneAsSystem<{ user_id: string; password_hash: string | null }>(
    `SELECT user_id, password_hash
     FROM public.auth_users
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );

  if (!user) {
    return { success: false, error: "User account not found." };
  }

  const argon2 = await getArgon2();
  const pepper = process.env.PASSWORD_PEPPER || "";

  if (user.password_hash) {
    let isValid = false;
    try {
      isValid = await argon2.verify(user.password_hash, currentPassword);
    } catch {
      // Hash format mismatch
    }

    if (!isValid && pepper) {
      try {
        isValid = await argon2.verify(user.password_hash, `${currentPassword}${pepper}`);
      } catch {
        // Hash format mismatch
      }
    }

    if (!isValid) {
      return { success: false, error: "Current password is incorrect." };
    }
  }

  const newHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

  await queryNeonAsSystem(
    `UPDATE public.auth_users
     SET password_hash = $1,
         updated_at = now()
     WHERE user_id = $2`,
    [newHash, userId],
  );

  return { success: true };
}

export async function updateUserPasswordDirectly(
  identifier: string,
  newPassword: string,
): Promise<boolean> {
  await ensureAuthSchema();
  const normalized = normalizeAuthEmail(identifier);
  const argon2 = await getArgon2();
  const pepper = process.env.PASSWORD_PEPPER || "";
  const hash = await argon2.hash(
    pepper ? `${newPassword}${pepper}` : newPassword,
    ARGON2_OPTIONS,
  );
  await queryNeonAsSystem(
    `UPDATE public.auth_users
     SET password_hash = $1,
         reset_token_hash = NULL,
         reset_token_expires_at = NULL,
         updated_at = now()
     WHERE user_id = $2 OR email_normalized = $3 OR LOWER(email) = $3`,
    [hash, identifier, normalized],
  );
  return true;
}

