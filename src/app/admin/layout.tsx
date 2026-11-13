import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import GradientBackground from "@/components/GradientBackground";
import ExitAdminButton from "./_components/ExitAdminButton";
import { AdminNavTabs } from "./_components/AdminNavTabs";
import { queryNeonOneAsSystem } from "@/lib/neon-db";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const sessionEmail = session?.user?.email?.trim().toLowerCase();
  const role = String(session?.user?.role || "");
  const isAdminByRole = typeof role === "string" && role.toLowerCase() === "admin";
  const isAdminByEmail = isConfiguredAdminEmail(sessionEmail);

  let isOrgAdmin = false;
  if (userId) {
    try {
      const eventRow = await queryNeonOneAsSystem<{ count: string | number }>(
        `SELECT COUNT(*)::int AS count FROM public.events WHERE user_id = $1`,
        [userId],
      );
      if (Number(eventRow?.count || 0) > 0) {
        isOrgAdmin = true;
      }
    } catch {
      // Fallback
    }
  }

  if (!isAdminByRole && !isAdminByEmail && !isOrgAdmin) {
    redirect("/dashboard");
  }

  let pendingRequestsCount = 0;
  try {
    const pendingRow = await queryNeonOneAsSystem<{ count: string | number }>(
      `SELECT COUNT(*)::int AS count FROM public.organization_registration_requests WHERE status IN ('PENDING', 'UNDER_REVIEW')`,
    );
    pendingRequestsCount = Number(pendingRow?.count || 0);
  } catch {
    // Graceful fallback if table is not yet created
  }

  return (
    <div className="relative min-h-screen bg-transparent select-text">
      <GradientBackground />
      
      <div className="relative z-50 border-b border-hairline-soft bg-primary backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex w-full max-w-[1640px] animate-slide-up flex-col gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:pb-3.5 sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))] lg:pl-12 lg:pr-12">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/admin"
              className="group no-link-underline flex min-w-0 flex-1 items-center gap-3 sm:gap-4 rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              <div className="shrink-0 flex items-center justify-center">
                <Image
                  src="/linq-logo.png"
                  alt="Linq logo"
                  width={110}
                  height={36}
                  style={{ width: "auto" }}
                  className="h-9 object-contain"
                  priority
                />
              </div>
              <div className="flex min-w-0 flex-col">
                <h1 className="text-xl font-semibold leading-tight tracking-[0.02em]" style={{ color: "#FFFFFF" }}>
                  Owner Console
                </h1>
                <p className="text-sm font-medium leading-snug tracking-[0.02em] text-white/75">
                  Linq Global Super Admin
                </p>
              </div>
            </Link>

            <div className="flex w-full shrink-0 justify-end sm:w-auto animate-slide-up">
              <ExitAdminButton />
            </div>
          </div>

          <div className="border-t border-white/15 pt-2 mt-1">
            <AdminNavTabs pendingRequestsCount={pendingRequestsCount} />
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[1640px] mx-auto">
        {children}
      </div>
    </div>
  );
}

