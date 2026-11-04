import { Suspense } from "react";
import { getServerAuthSession } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import { PromotionChannelSelect } from "@/components/admin/promotion/PromotionChannelSelect";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

interface DashboardPromotionsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPromotionsPage({
  searchParams,
}: DashboardPromotionsPageProps) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const eventId =
    typeof resolvedSearchParams.eventId === "string"
      ? resolvedSearchParams.eventId
      : undefined;
  const eventName =
    typeof resolvedSearchParams.eventName === "string"
      ? resolvedSearchParams.eventName
      : undefined;

  const backHref = eventId ? `/dashboard/events/${eventId}` : "/dashboard";
  const backLabel = eventId
    ? eventName
      ? `Back to ${eventName}`
      : "Back to Campaign"
    : "Back to Dashboard";

  return (
    <div className="relative min-h-screen bg-transparent select-text">
      <GradientBackground />

      {/* Top Header Bar */}
      <div className="relative z-50 border-b border-hairline-soft bg-white/85 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-heading transition-colors"
          >
            <ArrowLeft size={15} />
            <span>{backLabel}</span>
          </Link>

          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/linq-logo.png"
              alt="Linq logo"
              width={90}
              height={30}
              style={{ width: "auto" }}
              className="h-7 object-contain"
              priority
            />
          </Link>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
          <PromotionChannelSelect eventId={eventId} eventName={eventName} hideTopBack={true} />
        </Suspense>
      </div>
    </div>
  );
}
