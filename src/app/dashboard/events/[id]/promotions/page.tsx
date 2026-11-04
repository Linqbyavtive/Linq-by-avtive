import { Suspense } from "react";
import { getServerAuthSession } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import { PromotionChannelSelect } from "@/components/admin/promotion/PromotionChannelSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { queryNeonOneAsSystem } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

interface EventPromotionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPromotionsPage({ params }: EventPromotionsPageProps) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const eventId = resolvedParams.id;

  let eventName = "Campaign";
  if (eventId) {
    try {
      const eventRow = await queryNeonOneAsSystem<{ id: string; name: string }>(
        `SELECT id, name FROM public.events WHERE id = $1 LIMIT 1`,
        [eventId],
      );
      if (eventRow?.name) {
        eventName = eventRow.name;
      }
    } catch {
      // Fallback
    }
  }

  return (
    <div className="relative min-h-screen bg-transparent select-text">
      <GradientBackground />

      {/* Top Header Bar */}
      <div className="relative z-50 border-b border-hairline-soft bg-white/85 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            href={`/dashboard/events/${eventId}`}
            className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-heading transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back to {eventName}</span>
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
