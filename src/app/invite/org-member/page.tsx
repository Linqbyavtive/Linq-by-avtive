"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import GradientBackground from "@/components/GradientBackground";
import { Button } from "@/components/ui";
import { Eye, EyeOff } from "lucide-react";

function InviteOrgMemberInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const token = searchParams.get("t") || "";
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage("Missing invitation token.");
      return;
    }
    fetch(`/api/organization-members/invite-info?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.email) setInvitedEmail(data.email);
      })
      .catch(() => {});
  }, [token]);

  const accept = async () => {
    if (!token) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/organization-members/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(String(payload?.error || "Could not accept invitation."));
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/invite/org-member?t=${encodeURIComponent(token)}`)}`;

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center py-12 px-4 overflow-x-hidden overflow-y-auto bg-surface">
      <GradientBackground />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-canvas p-8 shadow-[0_12px_32px_rgba(90,79,207,0.10)]">
        <h1 className="text-[20px] font-medium text-text-primary mb-2">Organization invitation</h1>
        <p className="text-[13px] text-text-muted mb-6 leading-relaxed">
          Accept this invitation while signed in with the same email address the invite was sent to.
        </p>
        {!token ? (
          <p className="text-sm text-red-600">{message}</p>
        ) : isPending ? (
          <p className="text-sm text-muted">Checking session…</p>
        ) : !session?.user ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Create an account to accept your invitation.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const email = String(fd.get("email") || "");
                const username = String(fd.get("username") || "");
                const password = String(fd.get("password") || "");
                if (!email || !username || !password) return;
                
                setBusy(true);
                setMessage("");
                try {
                  // 1. Register user and sync with Supabase Auth on the server
                  const res = await fetch("/api/auth/register-invited", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email,
                      username,
                      password,
                    }),
                  });
                  const payload = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setMessage(String(payload?.error || "Could not create account."));
                    setBusy(false);
                    return;
                  }

                  // 2. Sign in via Supabase client to establish session cookies in browser
                  const signInRes = await authClient.signIn.email({
                    email: email.trim().toLowerCase(),
                    password,
                  });
                  if (signInRes.error) {
                    setMessage(signInRes.error.message || "Account created, but could not sign in. Please try logging in.");
                    setBusy(false);
                    return;
                  }

                  // Wait a brief moment to ensure cookies are set
                  await new Promise(r => setTimeout(r, 500));
                  
                  // 3. After sign in, accept the invite
                  const acceptRes = await fetch("/api/organization-members/accept-invite", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                  });
                  
                  if (!acceptRes.ok) {
                    if (acceptRes.status === 401) {
                      // Cookie might not be available to fetch yet, reload to apply session
                      window.location.reload();
                      return;
                    }
                    const acceptPayload = await acceptRes.json().catch(() => ({}));
                    setMessage(String(acceptPayload?.error || "Account created, but could not accept invitation."));
                    setBusy(false);
                    return;
                  }
                  
                  window.location.href = "/dashboard";
                } catch {
                  setMessage("Something went wrong.");
                  setBusy(false);
                }
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="email"
                name="email"
                required
                readOnly
                value={invitedEmail}
                placeholder="Loading email..."
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-text-muted shadow-sm transition-colors focus-visible:outline-none cursor-not-allowed"
              />
              <input
                type="text"
                name="username"
                required
                placeholder="Username (e.g. john_doe)"
                className="h-11 w-full rounded-lg border border-border bg-canvas px-3 text-[13px] text-text-primary shadow-sm transition-colors placeholder:text-text-xmuted focus-visible:outline-none focus-visible:border-royal-indigo/70 focus-visible:ring-4 focus-visible:ring-royal-indigo/10"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  placeholder="Password (min 12 chars, upper, lower, number, special)"
                  className="h-11 w-full rounded-lg border border-border bg-canvas px-3 pr-10 text-[13px] text-text-primary shadow-sm transition-colors placeholder:text-text-xmuted focus-visible:outline-none focus-visible:border-royal-indigo/70 focus-visible:ring-4 focus-visible:ring-royal-indigo/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {message ? <p className="text-sm text-red-600">{message}</p> : null}
              <Button type="submit" variant="primary" fullWidth size="lg" disabled={busy}>
                {busy ? "Working…" : "Sign up & Accept"}
              </Button>
            </form>
            <div className="mt-2 text-center text-sm">
              <span className="text-text-muted">Already have an account? </span>
              <Link href={loginHref} className="text-royal-indigo hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </div>
        ) : session?.user?.email?.trim().toLowerCase() !== invitedEmail?.trim().toLowerCase() && invitedEmail ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-surface p-4 border border-border">
              <p className="text-[13px] text-text-primary leading-relaxed">
                You are currently signed in as <strong className="break-all">{session.user.email}</strong>, but this invitation was sent to <strong className="break-all">{invitedEmail}</strong>.
              </p>
            </div>
            <p className="text-[13px] text-text-muted leading-relaxed">
              Please sign out of your current account to accept this invitation using the correct email address.
            </p>
            <Button
              variant="primary"
              fullWidth
              size="lg"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await authClient.signOut();
                setBusy(false);
              }}
            >
              Sign out & Switch accounts
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-text-xmuted break-all">Signed in as {session.user.email}</p>
            {message ? <p className="text-sm text-red-600">{message}</p> : null}
            <Button variant="primary" fullWidth size="lg" disabled={busy} onClick={() => void accept()}>
              {busy ? "Working…" : "Accept invitation"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function InviteOrgMemberPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-muted">Loading…</p>
        </main>
      }
    >
      <InviteOrgMemberInner />
    </Suspense>
  );
}
