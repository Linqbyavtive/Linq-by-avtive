"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { AlertCircle, Eye, EyeOff, Loader2, X } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtpStep, setNeedsOtpStep] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const parseError = (err: unknown) => {
    if (err instanceof Error && err.message) return err.message;
    return "Incorrect email or password.";
  };

  const resolvePostLoginTarget = async () => {
    let target = "/dashboard";
    try {
      const adminRes = await fetch("/api/auth/admin-state", { cache: "no-store" });
      const adminPayload = await adminRes.json().catch(() => ({}));
      const isAdmin = Boolean(adminRes.ok && adminPayload?.data?.isAdmin);
      target = isAdmin ? "/admin" : "/dashboard";
    } catch {
      target = "/dashboard";
    }
    const rawCb = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("callbackUrl") : null;
    const safeCb = rawCb && rawCb.startsWith("/") && !rawCb.startsWith("//") ? rawCb : null;
    return safeCb || target;
  };

  const finishLogin = async () => {
    const target = await resolvePostLoginTarget();
    router.replace(target);
    router.refresh();
  };

  const handleEmailPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? email.length;
    const nextValue = (email.slice(0, start) + pasted + email.slice(end)).trim();
    setEmail(nextValue);
  };

  const handlePasswordPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? password.length;
    const nextValue = (password.slice(0, start) + pasted + password.slice(end)).trim();
    setPassword(nextValue);
  };

  const tryLegacyMigrationLogin = async (trimmedEmail: string, trimmedPassword: string) => {
    let migrationRes: Response;
    try {
      migrationRes = await fetch("/api/auth/migrate-legacy-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });
    } catch {
      setError("Authentication service is temporarily unavailable. Please try again shortly.");
      return true;
    }
    const migrationPayload = await migrationRes.json().catch(() => ({}));
    if (!migrationRes.ok || migrationPayload?.data?.canMigrate !== true) {
      if (migrationRes.status !== 401) {
        setError(String(migrationPayload?.error || "Authentication service is temporarily unavailable. Please try again shortly."));
        return true;
      }
      return false;
    }

    // The user has been verified and synced into Supabase Auth by the server.
    // Directly sign in to establish the authenticated session.
    const signInResult = await authClient.signIn.email({
      email: trimmedEmail,
      password: trimmedPassword,
    });
    if (signInResult.error) {
      setError(
        signInResult.error.message ||
          "Your account was migrated, but sign-in failed. Please try signing in again.",
      );
      return true;
    }
    await finishLogin();
    return true;
  };

  const signInWithSupabase = async (trimmedEmail: string, trimmedPassword: string) => {
    try {
      return await authClient.signIn.email({
        email: trimmedEmail,
        password: trimmedPassword,
      });
    } catch (err: unknown) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Sign-in failed.",
        },
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (needsOtpStep) {
        const code = otp.trim();
        if (!code) {
          setError("Enter the verification code from your email.");
          return;
        }
        const result = await signInWithSupabase(trimmedEmail, trimmedPassword);
        if (result?.error) {
          const errMsg = result.error.message?.toLowerCase() || "";
          if (errMsg.includes("email not confirmed")) {
            setError("Your email address is not verified yet. Please check your inbox.");
            return;
          }
          const migrated = await tryLegacyMigrationLogin(trimmedEmail, trimmedPassword);
          if (!migrated) setError("Incorrect email, password, or verification code.");
          return;
        }
        if (result?.data) {
          await finishLogin();
          return;
        }
        setError("Sign-in failed. Please try again.");
        return;
      }

      const result = await signInWithSupabase(trimmedEmail, trimmedPassword);
      if (result?.error) {
        const errMsg = result.error.message?.toLowerCase() || "";
        if (errMsg.includes("email not confirmed")) {
          setError("Your email address is not verified yet. Please check your inbox.");
          return;
        }
        const migrated = await tryLegacyMigrationLogin(trimmedEmail, trimmedPassword);
        if (!migrated) setError(result.error.message || "Incorrect email or password.");
        return;
      }
      if (result?.data) {
        await finishLogin();
        return;
      }
      setError("Sign-in failed. Please try again.");
    } catch (err: unknown) {
      setError(parseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="w-full min-h-screen bg-[#FFFFFF] flex flex-col justify-center select-text overflow-x-hidden">
      <div className="flex flex-col lg:flex-row w-full min-h-screen">
        {/* =========================================================================
            LEFT COLUMN: Authentication Form (~48% width)
           ========================================================================= */}
        <section className="w-full lg:w-[48%] min-h-screen lg:min-h-0 flex flex-col justify-center items-center px-6 sm:px-10 lg:px-8 xl:px-14 2xl:px-20 py-8 sm:py-10 lg:py-6 bg-[#FFFFFF] z-10">
          <div className="w-full max-w-[420px] sm:max-w-[460px] xl:max-w-[480px] flex flex-col my-auto">
            {/* LINQ LOGO */}
            <div className="mb-6 sm:mb-8 xl:mb-10 2xl:mb-12">
              <Link href="/" className="inline-block transition-opacity hover:opacity-90">
                <Image
                  src="/linq-logo.png"
                  alt="linq"
                  width={120}
                  height={36}
                  style={{ width: "auto" }}
                  className="w-[105px] sm:w-[115px] xl:w-[120px] object-contain cursor-pointer"
                />
              </Link>
            </div>

            {/* LOGIN HEADING */}
            <h1 className="text-[22px] sm:text-[24px] leading-tight font-semibold text-[#171717] tracking-tight mb-4 sm:mb-5 xl:mb-6 text-left">
              Log in to Linq
            </h1>

            {/* AUTH FORM */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col">
              {/* EMAIL FIELD */}
              <div className="flex flex-col mb-3.5 sm:mb-4 xl:mb-5">
                <label
                  htmlFor="email"
                  className="text-[14px] sm:text-[15px] xl:text-[16px] font-medium text-[#171717] mb-1.5 sm:mb-2 text-left select-none"
                >
                  Email address
                </label>
                <div className="relative flex items-center w-full">
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    onPaste={handleEmailPaste}
                    onBlur={() => setEmail((prev) => prev.trim())}
                    placeholder="linq.avtive.app"
                    className="w-full h-[52px] sm:h-[56px] xl:h-[60px] px-4 sm:px-[18px] pr-12 rounded-[12px] xl:rounded-[14px] border border-[#D8D8D8] bg-[#FFFFFF] text-[15px] sm:text-[16px] text-[#202020] placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#743BE8] focus:ring-2 focus:ring-[#743BE8]/15 transition-all [box-shadow:0_0_0_1000px_white_inset]"
                  />
                  {email ? (
                    <button
                      type="button"
                      onClick={() => setEmail("")}
                      className="absolute right-3.5 sm:right-[18px] w-6 h-6 rounded-full bg-[#EFEFEF] hover:bg-[#E2E2E2] text-[#8E8E93] hover:text-[#555555] flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Clear email input"
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div className="flex flex-col mb-1.5 sm:mb-2">
                <label
                  htmlFor="password"
                  className="text-[14px] sm:text-[15px] xl:text-[16px] font-medium text-[#171717] mb-1.5 sm:mb-2 text-left select-none"
                >
                  Password
                </label>
                <div className="relative flex items-center w-full">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onPaste={handlePasswordPaste}
                    onBlur={() => setPassword((prev) => prev.trim())}
                    placeholder="••••••••••••"
                    className="w-full h-[52px] sm:h-[56px] xl:h-[60px] px-4 sm:px-[18px] pr-12 rounded-[12px] xl:rounded-[14px] border border-[#D8D8D8] bg-[#FFFFFF] text-[15px] sm:text-[16px] text-[#202020] placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#743BE8] focus:ring-2 focus:ring-[#743BE8]/15 transition-all [box-shadow:0_0_0_1000px_white_inset]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 sm:right-[18px] text-[#8E8E93] hover:text-[#4A4A4A] transition-colors cursor-pointer p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={20} strokeWidth={1.8} />
                    ) : (
                      <Eye size={20} strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              {/* FORGOT PASSWORD */}
              <div className="flex justify-start mb-6 sm:mb-8 xl:mb-10">
                <Link
                  href="/forgot-password"
                  className="text-[14px] sm:text-[15px] font-normal text-[#76549C] hover:text-[#5A3880] transition-colors cursor-pointer"
                >
                  Forgot password?
                </Link>
              </div>

              {/* OTP STEP (If active) */}
              {needsOtpStep && (
                <div className="flex flex-col mb-4 sm:mb-5">
                  <label
                    htmlFor="otp"
                    className="text-[14px] sm:text-[15px] xl:text-[16px] font-medium text-[#171717] mb-1.5 sm:mb-2 text-left"
                  >
                    Email verification code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full h-[52px] sm:h-[56px] xl:h-[60px] px-4 sm:px-[18px] rounded-[12px] xl:rounded-[14px] border border-[#D8D8D8] bg-[#FFFFFF] text-[15px] sm:text-[16px] text-[#202020] placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#743BE8] focus:ring-2 focus:ring-[#743BE8]/15 transition-all"
                  />
                </div>
              )}

              {/* ERROR ALERT */}
              {error && (
                <div className="mb-4 rounded-[12px] bg-[#FEF2F2] border border-[#FCA5A5]/70 p-3 text-[13px] sm:text-[14px] font-medium text-[#B91C1C] flex items-start gap-2.5">
                  <AlertCircle size={17} className="shrink-0 mt-0.5 text-[#DC2626]" />
                  <span>{error}</span>
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={!email.trim() || !password.trim() || isSubmitting || (needsOtpStep && !otp.trim())}
                className="w-full h-[52px] sm:h-[56px] xl:h-[58px] rounded-[12px] xl:rounded-[13px] text-[#FFFFFF] text-[15px] sm:text-[16px] font-medium flex items-center justify-center transition-all duration-200 cursor-pointer shadow-[0_4px_14px_rgba(116,59,232,0.22)] hover:shadow-[0_6px_20px_rgba(116,59,232,0.30)] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mb-5 sm:mb-6 xl:mb-8"
                style={{
                  background: "linear-gradient(90deg, #743BE8 0%, #7139E8 50%, #7638E8 100%)",
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </span>
                ) : needsOtpStep ? (
                  "Verify and login"
                ) : (
                  "Login"
                )}
              </button>

              {/* REGISTER PROMPT */}
              <div className="text-center text-[14px] sm:text-[15px] text-[#8A8A8A] flex items-center justify-center gap-1.5 flex-wrap">
                <span>Need to register an organization?</span>
                <Link
                  href="/organization/register"
                  className="text-[#743BE8] font-medium hover:text-[#5820CC] hover:underline transition-colors cursor-pointer"
                >
                  Register organization
                </Link>
              </div>

              {/* SWITCH ACCOUNT FOR OTP */}
              {needsOtpStep && (
                <button
                  type="button"
                  onClick={() => {
                    setNeedsOtpStep(false);
                    setOtp("");
                    setError("");
                  }}
                  className="text-center text-[13px] sm:text-[14px] text-[#8A8A8A] hover:text-[#4A4A4A] mt-3 cursor-pointer transition-colors"
                >
                  Use a different account
                </button>
              )}
            </form>
          </div>
        </section>

        {/* =========================================================================
            RIGHT COLUMN: Hero / Marketing Section (~52% width)
           ========================================================================= */}
        <section className="hidden lg:flex flex-col justify-center w-full lg:w-[52%] min-h-screen lg:min-h-0 relative overflow-hidden bg-[#FFFFFF] pl-8 xl:pl-14 2xl:pl-20 pr-6 xl:pr-12 2xl:pr-16 py-8 sm:py-10 lg:py-6 select-text">
          {/* Subtle Ambient Radial Glows */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background: `
                radial-gradient(ellipse 65% 55% at 20% 45%, rgba(145, 91, 255, 0.08) 0%, rgba(255, 255, 255, 0) 70%),
                radial-gradient(ellipse 55% 50% at 15% 85%, rgba(214, 160, 255, 0.06) 0%, rgba(255, 255, 255, 0) 65%),
                radial-gradient(ellipse 50% 45% at 85% 80%, rgba(100, 180, 255, 0.04) 0%, rgba(255, 255, 255, 0) 60%),
                radial-gradient(ellipse 45% 40% at 65% 15%, rgba(145, 91, 255, 0.04) 0%, rgba(255, 255, 255, 0) 55%)
              `,
            }}
          />

          {/* Hero Content Container */}
          <div className="relative z-10 max-w-[540px] xl:max-w-[620px] text-left my-auto">
            {/* TOP CATEGORY TAGLINE */}
            <p className="text-[11px] xl:text-[12px] 2xl:text-[13px] font-medium uppercase tracking-[0.14em] text-[#9382C3] mb-4 sm:mb-6 xl:mb-8 select-none">
              GLOBAL NETWORKING • EVENT CREATORS • ORGANIZATIONS • PORTALS
            </p>

            {/* MAIN HERO HEADLINE */}
            <div className="mb-4 sm:mb-6 xl:mb-8 select-text">
              <h2 className="text-[38px] lg:text-[44px] xl:text-[54px] 2xl:text-[62px] font-extrabold tracking-[-0.03em] leading-[1.06]">
                <span className="block text-[#151515]">Every connection</span>
                <span className="block text-[#7040E5]">creates opportunity</span>
              </h2>
            </div>

            {/* HERO DESCRIPTION PARAGRAPH */}
            <p className="text-[15px] lg:text-[16px] xl:text-[18px] 2xl:text-[19px] font-normal leading-[1.6] text-[#858585] max-w-[560px]">
              Linq turns event registration and organization onboarding into a single, elegant step.
              Share one link, let attendees generate beautiful scannable cards, and manage every
              organization seamlessly.
            </p>
          </div>
        </section>

        {/* =========================================================================
            MOBILE/TABLET MARKETING FOOTER (<1024px)
           ========================================================================= */}
        <section className="flex lg:hidden flex-col justify-center w-full px-6 sm:px-10 py-8 bg-[#FAFAFC] border-t border-slate-100">
          <div className="w-full max-w-[460px] mx-auto text-left">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9382C3] mb-2.5 select-none">
              GLOBAL NETWORKING • EVENT CREATORS • ORGANIZATIONS
            </p>
            <h2 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight leading-[1.1] mb-2.5">
              <span className="block text-[#151515]">Every connection</span>
              <span className="block text-[#7040E5]">creates opportunity</span>
            </h2>
            <p className="text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#858585]">
              Linq turns event registration and organization onboarding into a single, elegant step. Share one link, let attendees generate beautiful scannable cards, and manage every organization seamlessly.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

