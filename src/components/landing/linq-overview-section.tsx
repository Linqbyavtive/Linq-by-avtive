"use client";

import React from "react";
import { CheckCircle2, X } from "lucide-react";
import { DiscRevealList, type DiscRevealItem } from "@/components/ui/disc-reveal-list";
import {
  RegistrationFormMockup,
  ShareableLinkMockup,
  RegistrationConfirmedMockup,
  AttendeePassCardMockup,
  DoorCheckInScannerMockup,
  LiveAttendanceCounterMockup,
  OrgPortalDashboardMockup,
  EventCreatorDashboardMockup,
  RolePortalsSwitcherMockup,
} from "@/components/ui/overview-illustrations";

// ── Linq Core Services (Disc Reveal List with Realistic SaaS Mockup Cards) ──
const discRevealItems: DiscRevealItem[] = [
  {
    id: "one-link-registration",
    number: "01",
    title: "One-Link Event Registration",
    subtitle:
      "Create and share one event registration link. Attendees can access the registration flow through a single, simple link.",
    cards: [
      {
        id: "one-link-share",
        alt: "Shareable Linq event registration link",
        render: <ShareableLinkMockup />,
      },
      {
        id: "one-link-form",
        alt: "Realistic Linq one-link event registration interface",
        render: <RegistrationFormMockup />,
      },
      {
        id: "one-link-confirm",
        alt: "Instant digital pass registration confirmation",
        render: <RegistrationConfirmedMockup />,
      },
    ],
  },
  {
    id: "qr-attendee-cards-checkin",
    number: "02",
    title: "QR Attendee Cards & Check-in",
    subtitle:
      "Every registered attendee receives a scannable digital card. Event teams can scan the QR code to verify entry and record attendance.",
    cards: [
      {
        id: "qr-door-scanner",
        alt: "Gate staff handheld QR check-in scanner interface",
        render: <DoorCheckInScannerMockup />,
      },
      {
        id: "qr-attendee-pass",
        alt: "Linq digital attendee card with scannable square QR code",
        render: <AttendeePassCardMockup />,
      },
      {
        id: "qr-live-attendance",
        alt: "Live venue attendance recording counter",
        render: <LiveAttendanceCounterMockup />,
      },
    ],
  },
  {
    id: "organization-event-management",
    number: "03",
    title: "Organization & Event Management",
    subtitle:
      "Dedicated portals help organizations and event creators manage their work and keep event activities organized in one place.",
    cards: [
      {
        id: "org-portal-dashboard",
        alt: "Dedicated Organization Portal dashboard for multi-event governance",
        render: <OrgPortalDashboardMockup />,
      },
      {
        id: "event-creator-dashboard",
        alt: "Dedicated Event Creator Portal dashboard for live event execution",
        render: <EventCreatorDashboardMockup />,
      },
      {
        id: "role-portals-dual",
        alt: "Dual dedicated role portals for organizations and event creators",
        render: <RolePortalsSwitcherMockup />,
      },
    ],
  },
];

export function LinqOverviewSection() {
  return (
    <section
      id="overview"
      className="scroll-mt-20 border-t border-violet-100/70 bg-gradient-to-b from-white via-violet-50/25 to-white px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            One platform for your entire event lifecycle
          </h2>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600">
            Linq is a digital event management platform that brings planning, registration, communication, and on-site operations into one integrated system. By replacing fragmented, manual workflows with real-time visibility and control, Linq helps organizations deliver well-executed events with confidence and precision.
          </p>
        </div>

        {/* Problem vs. Solution Modern Comparison Pill */}
        <div className="mt-12 rounded-3xl border border-violet-100 bg-white/90 p-6 sm:p-8 shadow-xs backdrop-blur-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div className="rounded-2xl bg-rose-50/50 p-5 sm:p-6 border border-rose-100/70">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wider">
                <X className="size-4 text-rose-600" />
                Fragmented Event Challenges
              </div>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Spreadsheet-based event management and paper-based attendance registers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Duplicate attendee records and missed communication updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Long check-in queues, scattered event information, and limited operational visibility</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-[#F7F3FF] p-5 sm:p-6 border border-[#E9E0FA]">
              <div className="flex items-center gap-2 text-[#7546C8] text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="size-4 text-[#7546C8]" />
                The Linq Digital Platform
              </div>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#7546C8] font-bold">•</span>
                  <span>Unified company panel for organization registration, roles, and campaigns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7546C8] font-bold">•</span>
                  <span>One-link registration and branded digital attendee cards with LinkedIn sharing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7546C8] font-bold">•</span>
                  <span>Instant QR-based entrance check-in with real-time operational control</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 sm:mt-16">
          <DiscRevealList items={discRevealItems} />
        </div>
      </div>
    </section>
  );
}

export default LinqOverviewSection;
