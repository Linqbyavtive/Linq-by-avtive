import { listAdminUsers } from "@/lib/admin";
import { queryNeon } from "@/lib/neon-db";
import { listOrganizationRegistrationRequests } from "@/lib/organization/registration-db";
import { isConfiguredAdminEmail } from "@/lib/auth/admin-emails";
import {
  Users,
  BarChart3,
  Building2,
  ChevronRight,
  Activity,
  ShieldCheck,
  Sparkles,
  UserRound,
  Clock,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import OrganizationsTable from "./_components/OrganizationsTable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const revalidate = 0; // Ensures this page is always fresh when loaded by admin

type OrganizationRow = {
  id: string;
  email: string | undefined;
  username: string | undefined;
  organizationName: string | undefined;
  organizationLogoUrl: string | undefined;
  created_at: string;
  eventCount: number;
  attendeeCount: number;
  eventIds: Set<string>;
};

export default async function AdminDashboardPage() {
  // Fetch All Admin Data in Parallel for maximum speed
  const [userData, rawEvents, rawAttendees, profiles, officialOrgs, requestsData] = await Promise.all([
    listAdminUsers(),
    queryNeon<{
      id: string;
      user_id: string;
      name: string;
      created_at: string;
      date: string;
      location: string;
      logo_url: string | null;
    }>(
      `SELECT id, user_id, name, created_at, date, location, logo_url
       FROM public.events
       ORDER BY created_at DESC`,
    ),
    queryNeon<{ id: string; event_id: string; created_at: string }>(
      `SELECT id, event_id, created_at FROM public.attendees`,
    ),
    queryNeon<{
      id: string;
      username: string | null;
      organization_name: string | null;
      organization_logo_url: string | null;
    }>(`SELECT id, username, organization_name, organization_logo_url FROM public.profiles`),
    queryNeon<{
      organization_name_key: string;
      organization_logo_url: string | null;
    }>(`SELECT organization_name_key, organization_logo_url FROM public.organizations`),
    listOrganizationRegistrationRequests({ limit: 10 }),
  ]);

  const rawUsers = (userData?.data || []).filter((u) => {
    const email = u.email?.toLowerCase().trim();
    return !email || !isConfiguredAdminEmail(email);
  });

  const profileLookup = new Map();
  (profiles || []).forEach((p) => profileLookup.set(p.id, p));

  const orgLogoLookup = new Map();
  (officialOrgs || []).forEach((o) => {
    if (o.organization_logo_url) orgLogoLookup.set(o.organization_name_key, o.organization_logo_url);
  });

  const pendingRequestsCount = requestsData.counts.pending + requestsData.counts.under_review;

  // Aggregate Data
  const totalOrgs = rawUsers.length;
  const totalEvents = rawEvents.length;
  const totalAttendees = rawAttendees.length;
  const avgEventsPerOrg = totalOrgs > 0 ? (totalEvents / totalOrgs).toFixed(1) : "0.0";
  const avgAttendeesPerEvent = totalEvents > 0 ? (totalAttendees / totalEvents).toFixed(1) : "0.0";
  const mostRecentEventAt = rawEvents[0]?.created_at || null;

  // Build the Organization Grid Data - Grouping by Organization Name
  const orgMap = new Map();
  rawUsers.forEach((user) => {
    const profile = profileLookup.get(user.id);
    const orgName = profile?.organization_name || user.user_metadata?.organization_name || "";
    const orgNameKey =
      profile?.organization_name_key || orgName.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    const effectiveName = orgName.trim() || `@${profile?.username || user.email?.split("@")[0] || "unknown"}`;

    const latestEventWithLogo = rawEvents.find((e) => e.user_id === user.id && e.logo_url);

    // PRIORITY: 1. Master Organization Table -> 2. Profile Logo -> 3. Campaign Logo
    const masterOrgLogo = orgLogoLookup.get(orgNameKey);
    const logoUrl =
      masterOrgLogo?.trim() ||
      profile?.organization_logo_url?.trim() ||
      latestEventWithLogo?.logo_url?.trim() ||
      user.user_metadata?.organization_logo_url?.trim();

    if (!orgMap.has(effectiveName)) {
      orgMap.set(effectiveName, {
        id: user.id, // Use the primary user's ID for drill-down
        email: user.email,
        username: profile?.username || user.email?.split("@")[0],
        organizationName: orgName.trim() ? orgName : undefined,
        organizationLogoUrl: logoUrl,
        created_at: user.created_at,
        eventCount: 0,
        attendeeCount: 0,
        eventIds: new Set(),
      });
    }

    const org = orgMap.get(effectiveName);

    // Aggregate counts from all users in this "organization"
    const userEvents = rawEvents.filter((e) => e.user_id === user.id);
    org.eventCount += userEvents.length;
    userEvents.forEach((e) => org.eventIds.add(e.id));

    // Update logo/username if this user has more campaigns (likely the primary owner) or has a real profile logo
    const hasProfileLogo = profile?.organization_logo_url?.trim() || masterOrgLogo;
    if (hasProfileLogo || (userEvents.length > 0 && userEvents.length >= org.eventCount - userEvents.length)) {
      org.id = user.id;
      org.username = profile?.username || user.email?.split("@")[0];
      org.email = user.email;
      if (logoUrl) org.organizationLogoUrl = logoUrl;
    }
  });

  // Second pass: count attendees for the aggregated event sets
  rawAttendees.forEach((att) => {
    for (const org of orgMap.values()) {
      if (org.eventIds.has(att.event_id)) {
        org.attendeeCount += 1;
        break;
      }
    }
  });

  const organizations: OrganizationRow[] = Array.from(orgMap.values()) as OrganizationRow[];

  // Recent Activity Feed - showing Organizations instead of Campaigns
  const recentOrgs = rawUsers.slice(0, 7).map((user) => {
    const profile = profileLookup.get(user.id);
    return {
      id: user.id,
      email: user.email,
      username: profile?.username || user.email?.split("@")[0],
      organizationName: profile?.organization_name || user.user_metadata?.organization_name,
      created_at: user.created_at,
    };
  });

  const renderRequestStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold gap-1 px-2 py-0.5">
            <Clock size={11} />
            Pending
          </Badge>
        );
      case "UNDER_REVIEW":
        return (
          <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 text-xs font-semibold gap-1 px-2 py-0.5">
            <Clock size={11} />
            Under Review
          </Badge>
        );
      case "CHANGES_REQUESTED":
        return (
          <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-800 text-xs font-semibold gap-1 px-2 py-0.5">
            <AlertCircle size={11} />
            Changes Requested
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold gap-1 px-2 py-0.5">
            <CheckCircle2 size={11} />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800 text-xs font-semibold gap-1 px-2 py-0.5">
            <XCircle size={11} />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 py-6 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] lg:pl-[max(1.5rem,env(safe-area-inset-left))] lg:pr-[max(1.5rem,env(safe-area-inset-right))] select-text">
      {/* Platform Header Card */}
      <Card className="relative animate-slide-up overflow-hidden rounded-xl border border-hairline-soft bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 max-w-3xl flex-col gap-2.5">
            <Badge variant="outline" className="w-fit gap-2 border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.04em] text-primary-strong">
              <ShieldCheck size={14} />
              Super Admin Command Center
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-heading wrap-break-word">
              Platform Overview
            </h1>
            <p className="max-w-2xl min-w-0 text-sm font-normal leading-[1.6] text-muted">
              Centralized operational view for organization onboarding requests, platform governance, and active organizations directory.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:w-auto lg:shrink-0 lg:grid-cols-2 lg:gap-4">
            <Card className="px-5 py-4 border-hairline-soft bg-surface/50 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Avg events/org</p>
              <p className="mt-1.5 text-3xl font-semibold tracking-[-0.03em] text-heading">{avgEventsPerOrg}</p>
            </Card>
            <Card className="px-5 py-4 border-hairline-soft bg-surface/50 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Avg attendees/event</p>
              <p className="mt-1.5 text-3xl font-semibold tracking-[-0.03em] text-heading">{avgAttendeesPerEvent}</p>
            </Card>
          </div>
        </div>
      </Card>

      {/* Main Metric Cards */}
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="group flex items-center gap-5 p-6 animate-slide-up bg-white">
          <div className="relative z-10 w-14 h-14 rounded-md bg-surface border border-hairline-soft flex items-center justify-center text-ink shrink-0">
            <Building2 size={28} strokeWidth={2} />
          </div>
          <div className="relative z-10 flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Total Organizations</span>
            <span className="text-5xl font-medium text-heading tracking-[-0.01em] leading-[1.02]">{totalOrgs}</span>
          </div>
        </Card>

        <Card className="group flex items-center gap-5 p-6 animate-slide-up delay-75 bg-white">
          <div className="relative z-10 w-14 h-14 rounded-md bg-surface border border-hairline-soft flex items-center justify-center text-ink shrink-0">
            <BarChart3 size={28} strokeWidth={2} />
          </div>
          <div className="relative z-10 flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Total Campaigns</span>
            <span className="text-5xl font-medium text-heading tracking-[-0.01em] leading-[1.02]">{totalEvents}</span>
          </div>
        </Card>

        <Card className="group flex items-center gap-5 p-6 animate-slide-up delay-150 bg-white">
          <div className="relative z-10 w-14 h-14 rounded-md bg-surface border border-hairline-soft flex items-center justify-center text-ink shrink-0">
            <Users size={28} strokeWidth={2} />
          </div>
          <div className="relative z-10 flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Total Leads</span>
            <span className="text-5xl font-medium text-heading tracking-[-0.01em] leading-[1.02]">{totalAttendees}</span>
          </div>
        </Card>
      </div>

      {/* SECTION 1: ORGANIZATION CREATION REQUESTS (SUPER ADMIN ONLY) */}
      <Card className="p-6 border-hairline-soft bg-white shadow-sm animate-slide-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-hairline-soft pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-heading">
                  Organization Creation Requests
                </h2>
                {pendingRequestsCount > 0 ? (
                  <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5">
                    {pendingRequestsCount} Pending Review
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold px-2 py-0.5">
                    All Up to Date
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                New company onboarding submissions awaiting super admin review, approval, or modification.
              </p>
            </div>
          </div>

          <Link href="/admin/organization-requests">
            <Button size="sm" className="w-full sm:w-auto gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs">
              View All Requests ({requestsData.total})
              <ArrowRight size={13} />
            </Button>
          </Link>
        </div>

        {/* Requests Metric Counters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">Pending Review</span>
            <span className="text-lg font-bold text-amber-950">{requestsData.counts.pending}</span>
          </div>
          <div className="p-3 rounded-lg bg-orange-50/60 border border-orange-200/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-900">Changes Req.</span>
            <span className="text-lg font-bold text-orange-950">{requestsData.counts.changes_requested}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900">Approved</span>
            <span className="text-lg font-bold text-emerald-950">{requestsData.counts.approved}</span>
          </div>
          <div className="p-3 rounded-lg bg-red-50/60 border border-red-200/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-red-900">Rejected</span>
            <span className="text-lg font-bold text-red-950">{requestsData.counts.rejected}</span>
          </div>
        </div>

        {/* Recent Requests Table */}
        {requestsData.requests.length > 0 ? (
          <div className="overflow-x-auto border border-hairline-soft rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/60 border-b border-hairline-soft text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5">Reference #</th>
                  <th className="py-2.5 px-3.5">Organization</th>
                  <th className="py-2.5 px-3.5">Contact Person</th>
                  <th className="py-2.5 px-3.5">Submitted</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {requestsData.requests.slice(0, 5).map((req) => (
                  <tr key={req.id} className="hover:bg-surface/40 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-xs font-semibold text-primary">
                      <Link href={`/admin/organization-requests/${req.id}`} className="hover:underline">
                        {req.reference_number}
                      </Link>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        {req.organization_logo_url ? (
                          <div className="h-7 w-7 shrink-0 overflow-hidden rounded border border-hairline bg-surface p-0.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={req.organization_logo_url} alt="" className="h-full w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded border border-hairline bg-surface text-muted">
                            <Building2 size={13} />
                          </div>
                        )}
                        <span className="font-semibold text-heading text-xs truncate max-w-[180px]">
                          {req.organization_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-xs">
                      <span className="font-medium text-heading block">{req.contact_name}</span>
                      <span className="text-muted text-[11px] block truncate max-w-[160px]">{req.contact_email}</span>
                    </td>
                    <td className="py-3 px-3.5 text-xs text-muted whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">{renderRequestStatusBadge(req.status)}</td>
                    <td className="py-3 px-3.5 text-right">
                      <Link href={`/admin/organization-requests/${req.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-hairline-strong">
                          <Eye size={12} />
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-hairline-strong rounded-lg bg-surface/30">
            <ClipboardList size={32} className="mx-auto mb-2 text-muted/50" />
            <p className="text-sm font-semibold text-heading">No organization creation requests yet</p>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              When new companies submit their onboarding profile through the registration form, their requests will appear here for your review and approval.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Link href="/organization/register" target="_blank">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                  Test Registration Form
                  <ArrowRight size={12} />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 2: ORGANIZATIONS DIRECTORY & RECENT ACTIVITY */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 animate-slide-up delay-300">
        <div className="lg:col-span-2 flex min-w-0 flex-col gap-5">
          <h2 className="flex min-w-0 flex-wrap items-center gap-2 px-1 text-2xl font-medium tracking-[-0.03em] leading-[1.15] text-ink">
            <UserRound size={22} className="shrink-0 text-ink" />
            <span className="min-w-0">Active Organizations Directory</span>
          </h2>
          <OrganizationsTable
            initialOrganizations={organizations}
            toolbarAction={
              <Link
                key="create-organization"
                href="/admin/organizations/new"
                className={cn(buttonVariants({ variant: "default" }), "w-full justify-center sm:w-auto sm:min-w-[11rem] bg-primary text-primary-foreground")}
              >
                Create Organization
              </Link>
            }
          />
        </div>

        <div className="lg:col-span-1 flex min-w-0 flex-col gap-5">
          <div className="flex min-w-0 flex-col gap-2 px-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <h2 className="flex min-w-0 flex-wrap items-center gap-2 text-2xl font-semibold tracking-[-0.03em] leading-[1.15] text-heading">
              <Activity size={22} className="shrink-0 text-primary-strong" />
              <span className="min-w-0">Recent Activity</span>
            </h2>
            <span className="shrink-0 text-xs text-muted whitespace-nowrap sm:text-right">
              {mostRecentEventAt ? `Updated ${new Date(mostRecentEventAt).toLocaleDateString()}` : "No updates yet"}
            </span>
          </div>

          <Card className="p-4 bg-white border-hairline-soft">
            <Badge variant="outline" className="mb-2 gap-1.5 border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary-strong">
              <Sparkles size={12} />
              Live Feed
            </Badge>
            <div className="flex flex-col gap-3">
              {recentOrgs.map((org) => (
                <Card key={org.id} className="group p-3 bg-surface/40 border-hairline-soft hover:bg-white transition-colors">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary-strong">
                      New Organization
                    </Badge>
                    <span className="text-xs font-normal text-muted">
                      {org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate text-sm font-semibold text-heading group-hover:text-ink">
                    {org.organizationName || "Unnamed Organization"}
                  </h3>
                  <p className="mt-1 truncate text-xs font-normal text-muted">
                    {`@${org.username}`}
                  </p>
                  <Separator className="my-3 bg-border/40" />
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-normal text-muted">{org.email}</span>
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1 bg-white text-xs font-semibold")}
                    >
                      Open Org <ChevronRight size={10} />
                    </Link>
                  </div>
                </Card>
              ))}
              {recentOrgs.length === 0 && (
                <p className="rounded-md border border-dashed border-border bg-surface/40 py-8 text-center text-sm text-muted">
                  No recent organizations detected.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
