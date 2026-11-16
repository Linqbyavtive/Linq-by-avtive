"use client";

import React from "react";
import { AnimatedFeatureCard } from "@/components/ui/feature-card-1";
import {
  OneLinkIllustration,
  ScannableCardIllustration,
  QrCheckInIllustration,
  RolePortalsIllustration,
  AllOrgsIllustration,
  GlobalNetworkingIllustration,
} from "@/components/ui/feature-illustrations";

// ── Six Animated Features Enriched with Official Brochure Specifications ──
const features = [
  {
    title: "One-Link Registration & Active Membership",
    description:
      "Guests register through a simple, branded form to instantly become active event members, accessing registration in seconds from a single shareable link.",
    visual: <OneLinkIllustration />,
  },
  {
    title: "Branded Digital Cards & LinkedIn Sharing",
    description:
      "Manage organization card branding. Each attendee receives a digital QR card they can share directly on LinkedIn with the event registration link.",
    visual: <ScannableCardIllustration />,
  },
  {
    title: "QR Check-in & Attendance Verification",
    description:
      "Scan attendee QR cards at venue entrances through authorized check-in devices to eliminate queues and record verified attendance in real time.",
    visual: <QrCheckInIllustration />,
  },
  {
    title: "Role Assignment & Permission Management",
    description:
      "Dedicated portals for organization administrators, event creators, and team members with granular permission management and clear access controls.",
    visual: <RolePortalsIllustration />,
  },
  {
    title: "Company Panel, Sponsors & Lead Management",
    description:
      "Full company-panel control after registration to oversee organization profiles, run independent campaigns, manage sponsors, and capture leads.",
    visual: <AllOrgsIllustration />,
  },
  {
    title: "Attendee Networking & Connected Community",
    description:
      "Foster active participant networking where attendees use their digital cards to exchange verified professional contacts and drive post-event value.",
    visual: <GlobalNetworkingIllustration />,
  },
];

export function LinqFeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-t border-violet-100/70 bg-gradient-to-b from-white via-violet-50/40 to-white px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#24212B] sm:text-4xl">
            Built for organizations and event creators
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-slate-600">
            Purpose-built tools to streamline your registration process and maximize networking outcomes.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature) => (
            <AnimatedFeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              visual={feature.visual}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default LinqFeaturesSection;
