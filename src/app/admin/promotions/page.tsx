import { Suspense } from "react";
import { getServerAuthSession } from "@/auth";
import { redirect } from "next/navigation";
import { queryNeon } from "@/lib/neon-db";
import { PromotionChannelSelect } from "@/components/admin/promotion/PromotionChannelSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
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
      const eventRow = await queryNeon<{ count: string | number }>(
        `SELECT COUNT(*)::int AS count FROM public.events WHERE user_id = $1`,
        [userId],
      );
      if (Number(eventRow[0]?.count || 0) > 0) {
        isOrgAdmin = true;
      }
    } catch {
      // Fallback
    }
  }

  if (!isAdminByRole && !isAdminByEmail && !isOrgAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-[1280px] mx-auto">
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-48 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        }
      >
        <PromotionChannelSelect />
      </Suspense>
    </div>
  );
}
