# LINQ Authentication Architecture & Handoff

## Current Production Architecture

Authentication in LINQ is powered by **Supabase Auth** as the primary authentication and session authority, paired with **Neon Postgres** as the application database.

- **Supabase Client (Browser):** `src/lib/auth/client.ts` / `src/utils/supabase/client.ts`
- **Supabase Client (Server):** `src/utils/supabase/server.ts`
- **Supabase Client (Admin/Management API):** `src/utils/supabase/admin.ts`
- **Protected Route & Session Middleware:** `src/proxy.ts` / `src/utils/supabase/middleware.ts`
- **Application Session Helper:** `src/auth.ts` (`getServerAuthSession()`)
- **Legacy Credential Migration Route:** `src/app/api/auth/migrate-legacy-login/route.ts`
- **Auth User Repository:** `src/lib/auth-db.ts`

### Architectural Roles & Responsibilities

1. **Supabase Auth (Authoritative Session & Credential Authority):**
   - Handles password authentication via `/auth/v1/token?grant_type=password`.
   - Manages refresh tokens, JWTs, and HTTP-only session cookies via `@supabase/ssr`.
   - Stores authoritative Supabase user IDs (`user.id`).
   - The GoTrue Admin API is used exclusively server-side (via `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`) for just-in-time credential migration and admin user creation with pre-confirmed email.

2. **Neon Postgres (Application & Tenant Authority):**
   - Stores tenant profiles (`public.profiles`), organizations (`public.organizations`), events, attendees, and cards.
   - Manages `public.auth_users`, which holds internal user UUIDs (`user_id`), normalized email lookups, and historical Argon2 password hashes.
   - `auth_users.neon_auth_user_id` stores the linked Supabase Auth user ID (historical column name maintained for schema stability).

3. **Legacy Argon2 Password Migration Bridge:**
   - Existing accounts with legacy Argon2 password hashes in `public.auth_users` can continue logging in seamlessly with their existing email and password.
   - When Supabase Auth returns `invalid_credentials` (e.g. user does not yet exist in the active Supabase project or password has not yet been synchronized), the login form calls `/api/auth/migrate-legacy-login`.
   - The migration endpoint verifies the Argon2 password hash against `public.auth_users` (supporting direct, peppered, and clean-pepper variations).
   - Upon successful verification, the server synchronizes the account into Supabase Auth using the server-side Supabase Admin API (`createUser` or `updateUserById` with `email_confirm: true`).
   - The linked Supabase user ID is persisted in `public.auth_users.neon_auth_user_id`.
   - The frontend immediately signs in via Supabase Auth to establish the active browser session.

## Runtime Flow

```
User submits email + password
       │
       ▼
1. Supabase Auth (client.signIn.email)
       │
       ├─► Success ──► Session cookies set ──► Redirect to /dashboard or /admin
       │
       └─► Error: invalid_credentials (400)
             │
             ▼
2. Call /api/auth/migrate-legacy-login (POST)
       │
       ├─► Verify Argon2 password in public.auth_users
       │     └─► Mismatch ──► Return 401 (Invalid email or password)
       │
       ├─► Synchronize user into Supabase Auth via Admin API (syncSupabaseAuthUser)
       │     ├─► If absent: Admin API createUser (email_confirm: true)
       │     └─► If exists: Admin API updateUserById (password + email_confirm: true)
       │
       ├─► Link Supabase user ID to public.auth_users (neon_auth_user_id)
       │
       ▼
3. Frontend completes signIn.email with verified credentials ──► Redirect
```

## Environment Configuration

### Required Production Variables

- **Supabase Project:**
  - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`: Active Supabase project URL (e.g. `https://<project-ref>.supabase.co`).
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Public anonymous/publishable key for browser clients.
  - `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`: Server-only service role secret key for admin synchronization and password updates. Must point to the **same** project as `NEXT_PUBLIC_SUPABASE_URL`.

- **Neon Database:**
  - `DATABASE_URL`: Connection string for PostgreSQL queries.
  - `DATABASE_URL_DIRECT`: Direct unpooled connection string (used for migrations and system queries).

- **Security & Password Pepper:**
  - `PASSWORD_PEPPER`: Secret pepper string matching the legacy Argon2 password hashing configuration.

### Obsolete / Deprecated Variables

- `NEON_AUTH_BASE_URL` (Obsolete - Neon Auth is disabled)
- `NEON_AUTH_COOKIE_SECRET` (Obsolete - sessions are managed by Supabase Auth)
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` (Obsolete - NextAuth removed)
