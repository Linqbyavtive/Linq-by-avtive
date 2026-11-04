"use client";

import React from "react";
import {
  Check,
  Link2,
  QrCode,
  Building2,
  ShieldCheck,
  Lock,
  ArrowRight,
  ScanLine,
  CheckCircle2,
  Layers,
  LayoutDashboard,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Service 1: One-Link Event Registration Visuals
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Realistic Event Registration Interface (Main Hero Card)
 */
export function RegistrationFormMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-white p-3 select-none text-slate-800 font-sans">
      {/* Top Browser / URL Bar */}
      <div className="flex items-center gap-1.5 border-b border-violet-100/90 pb-2">
        <div className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-rose-400" />
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="size-2 rounded-full bg-emerald-400" />
        </div>
        <div className="flex flex-1 items-center gap-1 rounded-md bg-violet-50/70 px-2 py-0.5 text-[9px] text-violet-700 font-mono">
          <Lock className="size-2.5 text-violet-600" />
          <span className="truncate">linq.avtive.app/e/tech-summit/register</span>
        </div>
      </div>

      {/* Event Header Banner */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[8.5px] font-bold text-violet-700">
            One-Link Registration
          </span>
          <h4 className="mt-0.5 text-[11px] font-bold text-slate-900 leading-tight">
            Global Tech Summit 2026
          </h4>
        </div>
        <div className="text-right">
          <span className="text-[8.5px] text-slate-500 font-medium">Nov 12-14</span>
          <span className="block text-[8px] font-semibold text-emerald-600">Open Access</span>
        </div>
      </div>

      {/* Realistic Registration Form Fields */}
      <div className="space-y-1.5 pt-0.5">
        <div>
          <span className="block text-[8px] font-medium text-slate-500">Attendee Name</span>
          <div className="h-6 rounded-md border border-slate-200 bg-slate-50/50 px-2 flex items-center text-[9.5px] font-medium text-slate-800">
            Sarah Jenkins
          </div>
        </div>
        <div>
          <span className="block text-[8px] font-medium text-slate-500">Work Email</span>
          <div className="h-6 rounded-md border border-slate-200 bg-slate-50/50 px-2 flex items-center text-[9.5px] font-medium text-slate-800">
            sarah.j@acme.corp
          </div>
        </div>
      </div>

      {/* Action Button & Instant Pass Tag */}
      <div className="pt-1">
        <div className="h-7 w-full rounded-lg bg-[#7546C8] flex items-center justify-center gap-1.5 text-[10px] font-semibold text-white shadow-xs">
          <span>Complete Registration</span>
          <ArrowRight className="size-3" />
        </div>
        <p className="mt-1 text-center text-[7.5px] text-slate-500 font-medium">
          Instant digital QR attendee card generated upon submission
        </p>
      </div>
    </div>
  );
}

/**
 * Shareable Event Link Card
 */
export function ShareableLinkMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-white via-violet-50/30 to-violet-100/40 p-3.5 select-none text-slate-800 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex size-6 items-center justify-center rounded-md bg-violet-600 text-white">
            <Link2 className="size-3.5" />
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-900 leading-tight">Shareable Event Link</h5>
            <span className="text-[8px] text-slate-500 font-medium">1 link for invitations & channels</span>
          </div>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700">
          Ready
        </span>
      </div>

      {/* Interactive-looking Link Field */}
      <div className="rounded-lg border border-violet-200 bg-white p-2 shadow-xs">
        <span className="block text-[7.5px] font-semibold tracking-wider text-violet-700 uppercase">
          Public Registration URL
        </span>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="text-[10px] font-mono font-semibold text-slate-800 truncate">
            linq.avtive.app/e/summit26
          </span>
          <div className="flex shrink-0 items-center gap-1 rounded-md bg-violet-100 px-1.5 py-0.5 text-[8px] font-bold text-violet-800">
            <Check className="size-2.5 text-violet-700" />
            <span>Copied</span>
          </div>
        </div>
      </div>

      {/* Channels Pill Row */}
      <div className="flex items-center justify-between gap-1 pt-1 text-[8px] text-slate-600">
        <span className="rounded bg-white/80 px-1.5 py-0.5 font-medium border border-violet-100">
          ✉ Email Invites
        </span>
        <span className="rounded bg-white/80 px-1.5 py-0.5 font-medium border border-violet-100">
          💬 Social Channels
        </span>
        <span className="rounded bg-white/80 px-1.5 py-0.5 font-medium border border-violet-100">
          🌐 1-Click Access
        </span>
      </div>
    </div>
  );
}

/**
 * Instant Digital Pass Generation Confirmation
 */
export function RegistrationConfirmedMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-white p-3.5 select-none text-slate-800 font-sans border-t-2 border-emerald-500">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-4" />
        </div>
        <div>
          <h5 className="text-[10.5px] font-bold text-slate-900 leading-tight">
            Registration Confirmed!
          </h5>
          <span className="text-[8.5px] text-emerald-700 font-medium">Digital QR Pass Generated</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 flex items-center justify-between">
        <div>
          <span className="block text-[8px] text-slate-500">Attendee</span>
          <span className="text-[10px] font-bold text-slate-900">Sarah Jenkins</span>
          <span className="block text-[7.5px] text-violet-700 font-medium">Tech Summit 2026 • Verified</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-violet-200 bg-white p-1">
          <QrCode className="size-6 text-[#2B1E4A]" />
          <span className="text-[6.5px] font-mono text-violet-700 mt-0.5 font-bold">LQ-94812</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[8px] text-slate-500">
        <span>Pass sent to attendee</span>
        <span className="font-semibold text-emerald-600">Ready for Check-in ✓</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Service 2: QR Attendee Cards & Check-in Visuals
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authentic Digital Attendee Pass (Main Hero Card)
 */
export function AttendeePassCardMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-gradient-to-b from-white via-[#FCFAFF] to-[#F7F3FF] p-3 select-none text-slate-800 font-sans">
      {/* Lanyard Clip Top Slot */}
      <div className="mx-auto flex items-center justify-center gap-1 -mt-1">
        <div className="h-1.5 w-8 rounded-full bg-violet-200 border border-violet-300" />
      </div>

      {/* Badge Top Header */}
      <div className="flex items-center justify-between border-b border-violet-100 pb-1.5 pt-0.5">
        <div>
          <span className="text-[7.5px] font-extrabold tracking-widest text-violet-700 uppercase">
            LINQ ATTENDEE CARD
          </span>
          <h5 className="text-[10px] font-bold text-slate-900 leading-tight">
            Global Tech Summit 2026
          </h5>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[7.5px] font-bold text-emerald-700">
          VERIFIED ✓
        </span>
      </div>

      {/* Attendee Profile & Square QR Code */}
      <div className="flex items-center justify-between gap-2 py-1">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="size-6 rounded-full bg-violet-100 border border-violet-300 flex items-center justify-center text-[9px] font-bold text-violet-800">
              SJ
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-900 leading-none">Sarah Jenkins</span>
              <span className="text-[8px] text-slate-500">VP of Product • Acme</span>
            </div>
          </div>
          <div className="text-[7.5px] text-slate-600 space-y-0.5">
            <div><span className="font-semibold text-violet-700">Pass ID:</span> LQ-94812</div>
            <div><span className="font-semibold text-violet-700">Access:</span> All Stages + VIP</div>
          </div>
        </div>

        {/* High-Contrast Square QR Code */}
        <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-violet-200 bg-white p-1.5 shadow-sm">
          {/* Authentic QR grid graphic */}
          <svg className="size-12" viewBox="0 0 50 50" fill="none">
            {/* Finder 1 (Top-Left) */}
            <rect x="2" y="2" width="13" height="13" stroke="#2B1E4A" strokeWidth="2.5" fill="none" rx="1" />
            <rect x="5.5" y="5.5" width="6" height="6" fill="#7546C8" rx="0.5" />
            {/* Finder 2 (Top-Right) */}
            <rect x="35" y="2" width="13" height="13" stroke="#2B1E4A" strokeWidth="2.5" fill="none" rx="1" />
            <rect x="38.5" y="5.5" width="6" height="6" fill="#7546C8" rx="0.5" />
            {/* Finder 3 (Bottom-Left) */}
            <rect x="2" y="35" width="13" height="13" stroke="#2B1E4A" strokeWidth="2.5" fill="none" rx="1" />
            <rect x="5.5" y="38.5" width="6" height="6" fill="#7546C8" rx="0.5" />
            {/* Data Modules */}
            <rect x="18" y="4" width="3.5" height="3.5" fill="#2B1E4A" />
            <rect x="24" y="4" width="3.5" height="7" fill="#7546C8" />
            <rect x="18" y="11" width="3.5" height="7" fill="#7546C8" />
            <rect x="24" y="14" width="7" height="3.5" fill="#2B1E4A" />
            <rect x="18" y="22" width="3.5" height="3.5" fill="#2B1E4A" />
            <rect x="24" y="22" width="3.5" height="3.5" fill="#7546C8" />
            <rect x="4" y="22" width="7" height="3.5" fill="#7546C8" />
            <rect x="35" y="22" width="7" height="3.5" fill="#2B1E4A" />
            <rect x="18" y="30" width="7" height="3.5" fill="#7546C8" />
            <rect x="28" y="30" width="3.5" height="7" fill="#2B1E4A" />
            <rect x="35" y="35" width="4" height="4" fill="#7546C8" />
            <rect x="42" y="35" width="4" height="8" fill="#2B1E4A" />
            <rect x="35" y="43" width="8" height="4" fill="#7546C8" />
          </svg>
          {/* Laser targeting corners */}
          <span className="absolute -top-1 -left-1 size-2 border-t-2 border-l-2 border-[#7546C8]" />
          <span className="absolute -top-1 -right-1 size-2 border-t-2 border-r-2 border-[#7546C8]" />
          <span className="absolute -bottom-1 -left-1 size-2 border-b-2 border-l-2 border-[#7546C8]" />
          <span className="absolute -bottom-1 -right-1 size-2 border-b-2 border-r-2 border-[#7546C8]" />
        </div>
      </div>

      {/* Monospace Footer */}
      <div className="rounded-md bg-violet-100/70 py-1 text-center font-mono text-[7.5px] font-bold text-violet-900 tracking-wider">
        SCAN FOR ENTRY & ATTENDEE NETWORKING
      </div>
    </div>
  );
}

/**
 * Gate Check-in Scanner View (Handheld Staff Device)
 */
export function DoorCheckInScannerMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-slate-900 p-3 select-none text-white font-sans">
      <div className="flex items-center justify-between text-[8px] text-slate-400">
        <span className="flex items-center gap-1 font-semibold text-violet-300">
          <ScanLine className="size-3 text-violet-400" />
          Gate 1 Entrance Scanner
        </span>
        <span className="font-mono text-emerald-400">● LIVE</span>
      </div>

      {/* Scanner Viewfinder Box */}
      <div className="relative my-1 flex flex-col items-center justify-center rounded-lg border border-violet-500/50 bg-slate-950/80 p-2">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300 text-[8.5px] font-bold">
          <Check className="size-3 text-emerald-400" />
          <span>ADMITTED & RECORDED</span>
        </div>
        <div className="mt-1.5 text-center">
          <span className="block text-[10px] font-bold text-white">Sarah Jenkins</span>
          <span className="text-[7.5px] text-slate-400">Pass #LQ-94812 • Verified Attendee</span>
        </div>
        <span className="mt-1 font-mono text-[7.5px] text-violet-300">Timestamp: 09:42:18 AM</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[8px] text-slate-400">
        <span>Door A • Turnstile 1</span>
        <span className="text-emerald-400 font-semibold">Attendance Synced ✓</span>
      </div>
    </div>
  );
}

/**
 * Real-time Attendance Counter Card
 */
export function LiveAttendanceCounterMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-white p-3.5 select-none text-slate-800 font-sans border-t-2 border-violet-600">
      <div className="flex items-center justify-between">
        <span className="text-[8.5px] font-bold tracking-wider text-violet-700 uppercase">
          Live Event Attendance
        </span>
        <span className="flex items-center gap-1 text-[8px] font-semibold text-emerald-600">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Real-time
        </span>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">842</span>
          <span className="text-[9.5px] font-semibold text-slate-500">/ 900 Attendees (93.5%)</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 w-[93.5%]" />
        </div>
      </div>

      <div className="flex items-center justify-between text-[7.5px] text-slate-500 border-t border-slate-100 pt-1">
        <span>Last scan: Sarah Jenkins (1s ago)</span>
        <span className="font-semibold text-violet-700">0 Overlaps</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Service 3: Organization & Event Management Visuals
// (Two Distinct Dashboard-Style Interfaces: Org Portal vs. Event Creator Portal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Organization Portal Interface (Dashboard 1)
 * Dedicated for organizational leadership, multi-event governance and teams
 */
export function OrgPortalDashboardMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-white p-3 select-none text-slate-800 font-sans">
      {/* Portal Top Bar */}
      <div className="flex items-center justify-between border-b border-violet-100 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex size-5 items-center justify-center rounded bg-violet-600 text-white">
            <Building2 className="size-3" />
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-900 leading-none">
              Acme Enterprises ▾
            </h5>
            <span className="text-[7.5px] text-violet-700 font-semibold">
              Organization Portal
            </span>
          </div>
        </div>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[7.5px] font-bold text-violet-800">
          Admin View
        </span>
      </div>

      {/* Org High-level Metrics */}
      <div className="grid grid-cols-3 gap-1 pt-0.5">
        <div className="rounded border border-slate-100 bg-slate-50/70 p-1 text-center">
          <span className="block text-[7px] text-slate-500">Events</span>
          <span className="text-[10px] font-bold text-slate-900">4 Active</span>
        </div>
        <div className="rounded border border-slate-100 bg-slate-50/70 p-1 text-center">
          <span className="block text-[7px] text-slate-500">Attendees</span>
          <span className="text-[10px] font-bold text-violet-700">2,520</span>
        </div>
        <div className="rounded border border-slate-100 bg-slate-50/70 p-1 text-center">
          <span className="block text-[7px] text-slate-500">Team</span>
          <span className="text-[10px] font-bold text-slate-900">12 Members</span>
        </div>
      </div>

      {/* Multi-Event Portfolio Preview */}
      <div className="space-y-1">
        <span className="block text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">
          Managed Organization Events
        </span>
        <div className="rounded border border-slate-100 bg-white p-1 flex items-center justify-between text-[8px]">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-800">Tech Summit 2026</span>
          </div>
          <span className="text-violet-700 font-bold">1,250 reg.</span>
        </div>
        <div className="rounded border border-slate-100 bg-white p-1 flex items-center justify-between text-[8px]">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-blue-500" />
            <span className="font-semibold text-slate-800">Global Leadership</span>
          </div>
          <span className="text-slate-500 font-medium">420 reg.</span>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-1 flex items-center justify-between text-[7.5px] text-slate-500">
        <span>Dedicated Organization Portal</span>
        <span className="font-semibold text-violet-700">Multi-Event Governance →</span>
      </div>
    </div>
  );
}

/**
 * Event Creator Portal Interface (Dashboard 2)
 * Dedicated for event setup, attendee rosters, and live venue execution
 */
export function EventCreatorDashboardMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-white p-3.5 select-none text-slate-800 font-sans border-t-2 border-[#7546C8]">
      {/* Event Creator Portal Header */}
      <div className="flex items-center justify-between border-b border-violet-100 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex size-5 items-center justify-center rounded bg-[#7546C8] text-white">
            <LayoutDashboard className="size-3" />
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-900 leading-none">
              Tech Summit 2026
            </h5>
            <span className="text-[7.5px] text-violet-700 font-semibold">
              Event Creator Portal
            </span>
          </div>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[7.5px] font-bold text-emerald-700">
          ● Live Event
        </span>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-1 text-[8px]">
        <span className="rounded bg-violet-100 px-1.5 py-0.5 font-bold text-violet-800">
          Share Link
        </span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
          Edit Schedule
        </span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
          Door Scanner
        </span>
      </div>

      {/* Real-time Event Execution KPIs */}
      <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-violet-100 bg-violet-50/40 p-1.5">
        <div>
          <span className="block text-[7.5px] text-slate-500">Registrations</span>
          <span className="text-[11px] font-bold text-slate-900">1,250 / 1,500</span>
        </div>
        <div>
          <span className="block text-[7.5px] text-slate-500">Check-in Rate</span>
          <span className="text-[11px] font-bold text-emerald-600">91.8% Checked In</span>
        </div>
      </div>

      {/* Live Attendee Stream Preview */}
      <div className="rounded border border-slate-100 p-1 space-y-0.5 text-[7.5px]">
        <div className="flex items-center justify-between font-medium text-slate-700">
          <span>Sarah Jenkins (Acme)</span>
          <span className="text-emerald-600 font-bold">Checked In ✓</span>
        </div>
        <div className="flex items-center justify-between text-slate-500">
          <span>Marcus Vance (Stripe)</span>
          <span className="text-emerald-600 font-bold">Checked In ✓</span>
        </div>
      </div>

      <div className="text-[7.5px] text-slate-500 text-center font-medium">
        Dedicated Event Creator Execution Portal
      </div>
    </div>
  );
}

/**
 * Dual Role Portals Switcher / Security Card
 */
export function RolePortalsSwitcherMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-white via-violet-50/20 to-violet-100/30 p-3 select-none text-slate-800 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5 text-violet-700" />
          <h5 className="text-[10px] font-bold text-slate-900">Dual Dedicated Portals</h5>
        </div>
        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[7.5px] font-bold text-violet-700">
          RBAC
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 my-1">
        <div className="rounded-lg border border-violet-200/90 bg-white p-1.5">
          <span className="block text-[8px] font-bold text-slate-900">Org Portal</span>
          <p className="mt-0.5 text-[7px] text-slate-500 leading-tight">
            Organization setup, team access, multi-event oversight.
          </p>
        </div>
        <div className="rounded-lg border border-violet-200/90 bg-white p-1.5">
          <span className="block text-[8px] font-bold text-slate-900">Creator Portal</span>
          <p className="mt-0.5 text-[7px] text-slate-500 leading-tight">
            Event setup, link sharing, QR check-in & attendance.
          </p>
        </div>
      </div>

      <div className="rounded border border-emerald-200 bg-emerald-50/60 p-1 flex items-center gap-1 text-[7.5px] text-emerald-800">
        <ShieldCheck className="size-3 text-emerald-600 shrink-0" />
        <span>Organizations and event creators work from their own secure portal</span>
      </div>
    </div>
  );
}

