"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Link2,
  Menu,
  Quote,
  ScanLine,
  Sparkles,
  UserCheck,
  CalendarPlus,
  X,
} from "lucide-react";
import CrowdCanvas from "@/components/ui/skiper39";
import { DiscRevealList, type DiscRevealItem } from "@/components/ui/disc-reveal-list";
import AetherFlowBackground from "@/components/ui/aether-flow-background";
import { motion, AnimatePresence } from "framer-motion";
import { HeroSection4Animation, heroItemVariants } from "@/components/ui/hero-section-4";
import { HowItWorks, type StepItem } from "@/components/ui/how-it-works";
import { AnimatedFeatureCard } from "@/components/ui/feature-card-1";
import StringTieFooter from "@/components/ui/string-tie-footer";
import {
  OneLinkIllustration,
  ScannableCardIllustration,
  QrCheckInIllustration,
  RolePortalsIllustration,
  AllOrgsIllustration,
  GlobalNetworkingIllustration,
} from "@/components/ui/feature-illustrations";
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
import { cn } from "@/lib/utils";

// Locally hosted corporate crowd sprite sheet (15 cols x 7 rows)
const CROWD_SRC = "/crowd/linq-corporate-peeps.png";

const REGISTER_PATH = "/organization/register";
const LOGIN_PATH = "/login";
const AVTIVE_URL = "https://www.avtive.app";

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

// ── Approved 3-Step Journey for How It Works ──
const howItWorksSteps: StepItem[] = [
  {
    step: "01",
    title: "Set Up Your Organization",
    description:
      "Register your organization once and access your dedicated management portal to configure your team and events.",
    icon: Building2,
  },
  {
    step: "02",
    title: "Share One Event Link",
    description:
      "Create and distribute a single event registration link for attendees to register in seconds.",
    icon: Link2,
  },
  {
    step: "03",
    title: "Scan Attendee Cards",
    description:
      "Verify entry at venue doors and track live attendance with scannable digital QR attendee cards.",
    icon: ScanLine,
  },
];

// ── Six Animated Features with Approved Violet Illustration Style ──
const features = [
  {
    title: "One-Link Registration",
    description:
      "Guests register through a simple, branded form to instantly become active event members, accessing registration in seconds from a single shareable link.",
    visual: <OneLinkIllustration />,
  },
  {
    title: "Scannable Attendee Cards",
    description:
      "Manage organization card branding. Each attendee receives a digital QR card they can scan to connect and verify attendance.",
    visual: <ScannableCardIllustration />,
  },
  {
    title: "QR Check-in & Attendance",
    description:
      "Scan attendee QR cards at venue entrances through authorized check-in devices to eliminate queues and record verified attendance in real time.",
    visual: <QrCheckInIllustration />,
  },
  {
    title: "Portals for Every Role",
    description:
      "Dedicated portals for organization administrators, event creators, and team members with granular permission management and clear access controls.",
    visual: <RolePortalsIllustration />,
  },
  {
    title: "Centralized Organization Management",
    description:
      "Full company-panel control after registration to oversee organization profiles, run independent campaigns, manage sponsors, and capture leads.",
    visual: <AllOrgsIllustration />,
  },
  {
    title: "Attendee Networking",
    description:
      "Foster active participant networking where attendees use their digital cards to exchange verified professional contacts and drive post-event value.",
    visual: <GlobalNetworkingIllustration />,
  },
];

// ── Verified Ecosystem Partners ──
const partners = [
  { name: "LEAP Pakistan" },
  { name: "NSTP" },
];

// ── Verified Testimonials ──
const testimonials = [
  {
    quote:
      "Managing our campaign from one panel gave us complete control over our team, sponsors, and leads.",
    author: "Aseer Abbas",
    role: "CEO",
    company: "LEAP Pakistan",
    initials: "AA",
  },
  {
    quote:
      "Role-based access made it clear who could do what, and our team worked without confusion.",
    author: "Muzna Khan",
    role: "CEO",
    company: "EMRChains",
    initials: "MK",
  },
  {
    quote:
      "Linq gave our brand clear visibility and made our sponsorship easy to track.",
    author: "Umer Farooq",
    role: "CEO",
    company: "Techvando",
    initials: "UF",
  },
];

// ── Approved Subscription Plans ──
const subscriptionPlans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For small teams starting with event management",
    highlight: false,
    badge: null,
    features: [
      "1 to 10 team members",
      "Event campaigns",
      "Attendee registration",
      "Digital attendee cards",
      "Standard support",
    ],
    ctaText: "Get Started Free",
    ctaHref: REGISTER_PATH,
  },
  {
    name: "Starter",
    price: "$30",
    period: "/month",
    description: "For growing organizations hosting recurring events",
    highlight: false,
    badge: null,
    features: [
      "Up to 50 team members",
      "Multiple campaigns",
      "QR check-in & attendance",
      "Full role permissions",
      "Priority support",
    ],
    ctaText: "Choose Starter",
    ctaHref: REGISTER_PATH,
  },
  {
    name: "Growth",
    price: "$50",
    period: "/month",
    description: "For established companies managing high-capacity events",
    highlight: true,
    badge: "Most Popular",
    features: [
      "High-capacity attendee scaling",
      "Expanded campaigns & lead capture",
      "Custom card branding & sponsors",
      "Full role & team access",
      "Priority support",
    ],
    ctaText: "Choose Growth",
    ctaHref: REGISTER_PATH,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large enterprises with dedicated event infrastructure",
    highlight: false,
    badge: null,
    features: [
      "Custom attendee limits",
      "Unlimited campaigns",
      "Dedicated infrastructure",
      "Custom role governance",
      "Dedicated account manager",
    ],
    ctaText: "Contact Us",
    ctaHref: "mailto:info@avtive.app?subject=Linq%20Enterprise%20Plan%20Inquiry",
  },
];

// ── Clean Platform Capacity Metrics ──
const reachMetrics = [
  {
    value: "4",
    label: "Subscription Plans",
    icon: Building2,
  },
  {
    value: "2,500+",
    label: "Attendees Per Event",
    icon: UserCheck,
  },
  {
    value: "50",
    label: "Campaigns Per Organization",
    icon: CalendarPlus,
  },
  {
    value: "2,000+",
    label: "Leads Per Campaign",
    icon: Sparkles,
  },
];

function Logo({
  className = "",
  imgClassName = "h-8 md:h-9 w-auto",
}: {
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/linq-logo.png"
        alt="Linq"
        className={`${imgClassName} object-contain transition-transform duration-200 hover:scale-105`}
        width={914}
        height={554}
        priority
      />
    </div>
  );
}

export default function LinqLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  // Book a Demo Modal State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoName, setDemoName] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoOrg, setDemoOrg] = useState("");
  const [demoAttendees, setDemoAttendees] = useState("100 - 500 attendees");
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoError, setDemoError] = useState("");

  // Handle escape key to close demo modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDemoModalOpen) {
        setIsDemoModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDemoModalOpen]);

  // Handle demo request submission
  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName.trim() || !demoEmail.trim() || !demoOrg.trim()) {
      setDemoError("Please fill out all required fields.");
      return;
    }
    setDemoError("");

    // Dispatch via official Avtive contact destination
    const subject = encodeURIComponent(`Linq Demo Request: ${demoOrg}`);
    const body = encodeURIComponent(
      `Full Name: ${demoName}\nWork Email: ${demoEmail}\nOrganization: ${demoOrg}\nEstimated Event Attendees: ${demoAttendees}\n\nRequested via Linq Landing Page.`
    );
    window.location.href = `mailto:info@avtive.app?subject=${subject}&body=${body}`;
    setDemoSubmitted(true);
  };

  const resetDemoModal = () => {
    setIsDemoModalOpen(false);
    setTimeout(() => {
      setDemoSubmitted(false);
      setDemoError("");
    }, 200);
  };

  // Scroll spy for header active-section indication
  useEffect(() => {
    const sectionIds = ["overview", "how-it-works", "features", "pricing"];

    const handleScroll = () => {
      if (window.scrollY < 260) {
        setActiveSection("");
        return;
      }

      const scrollPosition = window.scrollY + 220;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(id);
            return;
          }
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-900 antialiased selection:bg-violet-100 selection:text-violet-900">
      {/* ───────── 1. Header ───────── */}
      <header className="sticky top-0 z-50 w-full border-b border-violet-100/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
          {/* Left: Official Linq Logo */}
          <Link href="/" aria-label="Linq home" className="transition-opacity hover:opacity-90">
            <Logo />
          </Link>

          {/* Center Navigation (Desktop) with Active Indication */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <a
              href="#overview"
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                activeSection === "overview"
                  ? "bg-violet-100/90 text-violet-900 font-semibold shadow-xs ring-1 ring-violet-200/80"
                  : "text-slate-600 hover:bg-violet-50/70 hover:text-violet-700 active:text-violet-800"
              )}
            >
              Overview
            </a>
            <a
              href="#how-it-works"
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                activeSection === "how-it-works"
                  ? "bg-violet-100/90 text-violet-900 font-semibold shadow-xs ring-1 ring-violet-200/80"
                  : "text-slate-600 hover:bg-violet-50/70 hover:text-violet-700 active:text-violet-800"
              )}
            >
              How It Works
            </a>
            <a
              href="#features"
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                activeSection === "features"
                  ? "bg-violet-100/90 text-violet-900 font-semibold shadow-xs ring-1 ring-violet-200/80"
                  : "text-slate-600 hover:bg-violet-50/70 hover:text-violet-700 active:text-violet-800"
              )}
            >
              Features
            </a>
            <a
              href="#pricing"
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                activeSection === "pricing"
                  ? "bg-violet-100/90 text-violet-900 font-semibold shadow-xs ring-1 ring-violet-200/80"
                  : "text-slate-600 hover:bg-violet-50/70 hover:text-violet-700 active:text-violet-800"
              )}
            >
              Pricing
            </a>
          </nav>

          {/* Right Action Buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href={LOGIN_PATH}
              className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-violet-50 hover:text-violet-800"
            >
              Log in
            </Link>
            <Link
              href={REGISTER_PATH}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#7546C8] hover:bg-[#6439B3] px-5 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Register Your Organization
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex size-10 items-center justify-center rounded-xl text-slate-700 hover:bg-violet-50 hover:text-violet-700 focus:outline-hidden"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="border-b border-violet-100 bg-white px-6 pb-6 pt-2 md:hidden overflow-hidden shadow-lg shadow-violet-950/5"
            >
              <nav className="flex flex-col gap-1">
                <a
                  href="#overview"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveSection("overview");
                  }}
                  className={cn(
                    "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                    activeSection === "overview"
                      ? "bg-violet-100/90 text-violet-900 font-semibold"
                      : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                  )}
                >
                  Overview
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveSection("how-it-works");
                  }}
                  className={cn(
                    "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                    activeSection === "how-it-works"
                      ? "bg-violet-100/90 text-violet-900 font-semibold"
                      : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                  )}
                >
                  How It Works
                </a>
                <a
                  href="#features"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveSection("features");
                  }}
                  className={cn(
                    "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                    activeSection === "features"
                      ? "bg-violet-100/90 text-violet-900 font-semibold"
                      : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                  )}
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveSection("pricing");
                  }}
                  className={cn(
                    "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                    activeSection === "pricing"
                      ? "bg-violet-100/90 text-violet-900 font-semibold"
                      : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                  )}
                >
                  Pricing
                </a>
                <div className="mt-4 flex flex-col gap-2.5 pt-4 border-t border-violet-100/80">
                  <Link
                    href={LOGIN_PATH}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-violet-200 text-base font-medium text-slate-700 transition-colors hover:bg-violet-50 hover:text-violet-800"
                  >
                    Log in
                  </Link>
                  <Link
                    href={REGISTER_PATH}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#7546C8] hover:bg-[#6439B3] text-base font-semibold text-white shadow-sm shadow-violet-600/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register Your Organization
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ───────── 2. Hero Section ───────── */}
      <section className="relative isolate flex min-h-[calc(100svh-4.5rem)] flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_75%_100%,#f4effe_0%,#ffffff_72%)]">
        {/* Subtle particle network animation */}
        <AetherFlowBackground className="pointer-events-none absolute inset-0 z-0" />

        {/* Crisp Human Crowd Canvas along the bottom ground (no blur, zero content overlap) */}
        <CrowdCanvas
          src={CROWD_SRC}
          className="bottom-0 top-auto h-[44%] md:h-[48%] pointer-events-none z-0"
        />

        {/* Hero Content (Cleanly positioned with crisp contrast, zero rectangular blur or white panel) */}
        <div className="relative z-20 mx-auto w-full max-w-7xl px-6 pt-12 sm:pt-16 lg:pt-20 pb-32 md:pb-40">
          <HeroSection4Animation className="relative max-w-3xl">
            {/* Main Headline */}
            <motion.h1
              variants={heroItemVariants}
              className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[4.75rem] leading-[1.08] text-slate-900"
            >
              <span className="block text-[#371E57]">One Link.</span>
              <span className="block bg-gradient-to-r from-[#371E57] via-[#5B21B6] to-[#7546C8] bg-clip-text text-transparent pb-1">
                Every Connection.
              </span>
            </motion.h1>

            {/* Hero Tagline */}
            <motion.p
              variants={heroItemVariants}
              className="mt-4 text-xl sm:text-2xl font-semibold tracking-tight text-[#7546C8]"
            >
              Every connection creates opportunity.
            </motion.p>

            {/* Exact Required SaaS Hero Description */}
            <motion.p
              variants={heroItemVariants}
              className="mt-4 max-w-xl text-base sm:text-lg md:text-xl font-normal leading-relaxed text-slate-700"
            >
              Linq helps organizations and event creators manage event registration, issue scannable attendee cards, track event attendance and bring people together.
            </motion.p>

            {/* Hero Action Buttons */}
            <motion.div
              variants={heroItemVariants}
              className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
            >
              <Link
                href={REGISTER_PATH}
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full bg-[#7546C8] hover:bg-[#6439B3] px-8 text-base font-semibold text-white shadow-md shadow-violet-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Register Your Organization
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
              <Link
                href={LOGIN_PATH}
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full border-2 border-violet-200 bg-white/95 px-8 text-base font-semibold text-violet-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/80 active:translate-y-0"
              >
                Log in
              </Link>
            </motion.div>
          </HeroSection4Animation>
        </div>
      </section>

      {/* ───────── 3. Overview (Digital Event Management & Problem Solving) ───────── */}
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

      {/* ───────── 4. How It Works (Approved 3-Step Journey) ───────── */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-t border-violet-100/60 bg-white px-6 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#24212B] sm:text-4xl">
            How Linq Works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            The simple 3-step process to manage event registration, digital attendee cards, and entrance check-in.
          </p>
        </div>
        <div className="mt-14 sm:mt-16">
          <HowItWorks steps={howItWorksSteps} />
        </div>
      </section>

      {/* ───────── 5. Features (Six Animated Feature Cards) ───────── */}
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

      {/* ───────── 6. Supported By (Ecosystem Sponsorship) ───────── */}
      <section className="border-t border-violet-100/70 bg-gradient-to-b from-white via-violet-50/20 to-white py-16 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-bold tracking-widest text-[#7546C8] uppercase">
            Supported By
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#24212B] sm:text-3xl">
            Trusted by leading ecosystem partners
          </h2>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
            Linq is proudly sponsored by LEAP Pakistan & NSTP — reflecting trust in our platform and its potential.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {partners.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-center rounded-2xl border border-violet-100 bg-white px-8 py-4.5 shadow-xs transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-800">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── 7. Testimonials ───────── */}
      <section className="border-t border-violet-100/70 bg-[#FBFAFF] py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-[#24212B] sm:text-4xl">
              What event leaders say about Linq
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Verified experiences from organizations managing events, teams, and sponsorships.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="flex flex-col justify-between rounded-3xl border border-[#E9E0FA] bg-white p-7 shadow-xs transition-all duration-300 hover:border-[#D4C5F9] hover:shadow-md hover:-translate-y-1"
              >
                <div>
                  <Quote className="size-8 text-violet-300 mb-4" />
                  <p className="text-sm sm:text-base leading-relaxed text-slate-700 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-violet-100/80">
                  <div className="grid size-10 place-items-center rounded-full bg-violet-100 text-xs font-bold text-[#7546C8]">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{t.author}</div>
                    <div className="text-xs text-slate-500">
                      {t.role}, {t.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── 8. Subscription Plans ───────── */}
      <section
        id="pricing"
        className="scroll-mt-20 border-t border-violet-100/70 bg-gradient-to-b from-white via-violet-50/20 to-white py-20 sm:py-28 px-6"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-[#24212B] sm:text-4xl">
              Simple, transparent subscription plans
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Select the right plan capacity for your team size, campaigns, and attendee volume.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
            {subscriptionPlans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col justify-between rounded-3xl bg-white p-7 transition-all duration-300",
                  plan.highlight
                    ? "border-2 border-[#7546C8] shadow-[0_12px_36px_-6px_rgba(117,70,200,0.18)] ring-4 ring-violet-100"
                    : "border border-[#E9E0FA] shadow-xs hover:border-[#D4C5F9] hover:shadow-md"
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#7546C8] px-3.5 py-1 text-[11px] font-bold text-white shadow-xs uppercase tracking-wider">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-[#24212B]">{plan.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm font-medium text-slate-500">
                        {plan.period}
                      </span>
                    )}
                  </div>

                  <ul className="mt-6 space-y-3 pt-6 border-t border-violet-100/70 text-xs sm:text-sm text-slate-700">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5">
                        <Check className="size-4 text-[#7546C8] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  {plan.ctaHref.startsWith("mailto:") ? (
                    <a
                      href={plan.ctaHref}
                      className={cn(
                        "inline-flex w-full h-11 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
                        plan.highlight
                          ? "bg-[#7546C8] hover:bg-[#6439B3] text-white shadow-sm shadow-violet-600/20"
                          : "border border-violet-200 text-[#7546C8] hover:bg-violet-50"
                      )}
                    >
                      {plan.ctaText}
                    </a>
                  ) : (
                    <Link
                      href={plan.ctaHref}
                      className={cn(
                        "inline-flex w-full h-11 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
                        plan.highlight
                          ? "bg-[#7546C8] hover:bg-[#6439B3] text-white shadow-sm shadow-violet-600/20"
                          : "border border-violet-200 text-[#7546C8] hover:bg-violet-50"
                      )}
                    >
                      {plan.ctaText}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            All prices in USD as specified in official product rate sheets. Contact our team to confirm current package availability.
          </p>
        </div>
      </section>

      {/* ───────── 9. Platform Capacity Section (Linq in Numbers) ───────── */}
      <section
        id="reach"
        className="scroll-mt-20 border-t border-violet-100/70 bg-gradient-to-b from-white via-violet-50/30 to-[#FBFAFF] px-6 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Linq in Numbers
            </h2>
          </div>

          {/* 4 Metric Cards */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reachMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#E9E0FA] bg-white p-6 shadow-[0_4px_20px_-4px_rgba(124,58,237,0.04)] transition-all duration-300 hover:border-[#D4C5F9] hover:shadow-[0_12px_28px_-6px_rgba(124,58,237,0.1)]"
                >
                  <div className="grid size-11 place-items-center rounded-2xl bg-violet-50 text-[#7546C8] ring-1 ring-violet-200/70">
                    <Icon className="size-5" />
                  </div>

                  <div className="mt-8">
                    <div className="text-3xl sm:text-4xl font-extrabold text-[#7546C8] tracking-tight">
                      {metric.value}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-900 leading-tight">
                      {metric.label}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Book a Demo CTA Action */}
          <div className="mt-16 text-center">
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#7546C8] hover:bg-[#6439B3] px-9 text-base font-semibold text-white shadow-md shadow-violet-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Book a Demo
            </button>
            <p className="mt-3 text-xs text-slate-500">
              Prefer self-service?{" "}
              <Link href={REGISTER_PATH} className="text-violet-700 font-semibold hover:underline">
                Register your organization directly
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Book a Demo Modal Dialog ───────── */}
      <AnimatePresence>
        {isDemoModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={resetDemoModal}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              aria-hidden="true"
            />

            {/* Modal Dialog Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative z-10 w-full max-w-lg rounded-3xl border border-violet-100 bg-white p-6 sm:p-8 shadow-2xl shadow-violet-950/20 my-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={resetDemoModal}
                className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-violet-50 hover:text-slate-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="size-5" />
              </button>

              {!demoSubmitted ? (
                <>
                  <div className="pr-8">
                    <h3 id="demo-modal-title" className="text-2xl font-bold tracking-tight text-slate-900">
                      Book Your Linq Demo
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      Tell us a little about your organization and our team can help you explore Linq.
                    </p>
                  </div>

                  <form onSubmit={handleDemoSubmit} className="mt-6 space-y-4">
                    {demoError && (
                      <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                        {demoError}
                      </div>
                    )}

                    <div>
                      <label htmlFor="modal-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="modal-name"
                        type="text"
                        required
                        value={demoName}
                        onChange={(e) => setDemoName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-2 focus:ring-violet-200"
                      />
                    </div>

                    <div>
                      <label htmlFor="modal-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Work Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="modal-email"
                        type="email"
                        required
                        value={demoEmail}
                        onChange={(e) => setDemoEmail(e.target.value)}
                        placeholder="name@organization.com"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-2 focus:ring-violet-200"
                      />
                    </div>

                    <div>
                      <label htmlFor="modal-org" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Organization Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="modal-org"
                        type="text"
                        required
                        value={demoOrg}
                        onChange={(e) => setDemoOrg(e.target.value)}
                        placeholder="e.g. Acme Tech Summit"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-2 focus:ring-violet-200"
                      />
                    </div>

                    <div>
                      <label htmlFor="modal-attendees" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Estimated Event Attendees
                      </label>
                      <select
                        id="modal-attendees"
                        value={demoAttendees}
                        onChange={(e) => setDemoAttendees(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-hidden focus:ring-2 focus:ring-violet-200"
                      >
                        <option value="Under 100 attendees">Under 100 attendees</option>
                        <option value="100 - 500 attendees">100 - 500 attendees</option>
                        <option value="500 - 2,000 attendees">500 - 2,000 attendees</option>
                        <option value="2,000+ attendees">2,000+ attendees</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#7546C8] hover:bg-[#6439B3] text-sm font-semibold text-white shadow-sm shadow-violet-600/20 cursor-pointer"
                      >
                        Request a Demo
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="py-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h4 className="mt-4 text-xl font-bold text-slate-900">
                    Demo Request Prepared
                  </h4>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                    Your request details have been opened in your email client to reach the Avtive team directly at info@avtive.app.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={resetDemoModal}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ───────── 10. Minimal String Tie Envelope Footer ───────── */}
      <StringTieFooter
        logo={<Logo />}
        title="Linq"
        titleAccent=""
        meta={[]}
        tapes={["Every connection creates opportunity."]}
        noteMessage="A simpler way to bring organizations, events and people together."
        noteCta={{
          label: "Register Your Organization",
          href: REGISTER_PATH,
        }}
        columns={[
          {
            title: "Platform",
            links: [
              { label: "Overview", href: "#overview" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
            ],
          },
          {
            title: "Organization",
            links: [
              { label: "Register organization", href: REGISTER_PATH },
              { label: "Log in", href: LOGIN_PATH },
              { label: "Avtive", href: AVTIVE_URL, external: true },
            ],
          },
          {
            title: "Contact",
            links: [
              { label: "info@avtive.app", href: "mailto:info@avtive.app", external: true },
              { label: "+92 312 5175041", href: "tel:+923125175041", external: true },
              { label: "linq.avtive.app", href: "https://linq.avtive.app", external: true },
            ],
          },
        ]}
        socialLinks={{
          linkedin: "https://www.linkedin.com/company/linqavtive/posts/?viewAsMember=true",
          instagram: "https://www.instagram.com/linq.me/?utm_source=ig_web_button_share_sheet",
        }}
        copyright={`© ${new Date().getFullYear()} Avtive. All rights reserved.`}
        attribution={
          <span>
            Crowd animation adapted from Skiper UI · illustration by{" "}
            <a
              href="https://www.openpeeps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-[#7546C8] hover:underline"
            >
              Open Peeps
            </a>
          </span>
        }
      />
    </main>
  );
}

