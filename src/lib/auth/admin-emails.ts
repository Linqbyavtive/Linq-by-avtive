/**
 * Shared, authoritative server-side administrator email resolver.
 *
 * Combines server-side environment configurations:
 * - SUPERADMIN_EMAIL
 * - ADMIN_EMAIL
 * - ADMIN_EMAILS (comma-separated list)
 *
 * All emails are normalized (trimmed and lowercase).
 * Excludes client-side NEXT_PUBLIC_* variables to ensure privileged security.
 */

export function getSuperAdminEmail(): string | null {
  const email = (process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
  return email || null;
}

export function getConfiguredAdminEmails(): string[] {
  const superAdmin = (process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
  const singleAdmin = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const multiAdmins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const combined = new Set<string>();
  if (superAdmin) combined.add(superAdmin);
  if (singleAdmin) combined.add(singleAdmin);
  for (const email of multiAdmins) {
    if (email) combined.add(email);
  }

  return Array.from(combined);
}

export function isConfiguredAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const adminEmails = getConfiguredAdminEmails();
  return adminEmails.includes(normalized);
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const superAdmin = getSuperAdminEmail();
  return Boolean(superAdmin && normalized === superAdmin);
}

