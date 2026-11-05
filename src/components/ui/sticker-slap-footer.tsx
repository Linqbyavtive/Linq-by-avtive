"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

// ── Types ──
export interface StickerItem {
  id: string;
  name: string;
  defaultRotate: number;
  slapRotate: number;
  initialClass: string;
  render: React.ReactNode;
}

// ── Inline Social Icons ──
function LinkedInIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function InstagramIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function ArrowUpRightIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

// ── Custom Linq Sticker SVGs (Dark / Violet Theme) ──
function ConnectedLinkSticker() {
  return (
    <div className="relative select-none rounded-2xl border-2 border-white bg-gradient-to-r from-[#7546C8] to-[#5B21B6] px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-[0_8px_20px_rgba(0,0,0,0.45)] ring-1 ring-violet-300/30">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <svg className="size-4 sm:size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-violet-200">Linq</span>
          <span className="text-[11px] sm:text-xs font-bold leading-none text-white">One Link</span>
        </div>
      </div>
    </div>
  );
}

function QrAttendeeCardSticker() {
  return (
    <div className="relative w-[85px] sm:w-[100px] select-none rounded-2xl border-2 border-white bg-[#1A1429] p-2 sm:p-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.5)] ring-1 ring-violet-400/20">
      {/* Top lanyard hole */}
      <div className="mx-auto mb-1 h-1 w-4 sm:w-5 rounded-full bg-violet-400/40" />

      {/* Mini QR display */}
      <div className="rounded-lg bg-white p-1 sm:p-1.5 shadow-xs">
        <svg className="size-13 sm:size-16 text-[#241A3E]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h4v2h-4v-2zm2-2h2v2h-2v-2zm-6-2h2v2h-2v-2zm2-4h2v2h-2v-2zm-2 2h2v2h-2v-2zm6 0h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z" />
        </svg>
      </div>

      {/* Badge label */}
      <div className="mt-1 flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-violet-300">
        <span>ATTENDEE</span>
        <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
      </div>
    </div>
  );
}

function NetworkNodesSticker() {
  return (
    <div className="relative size-[78px] sm:size-[94px] select-none rounded-2xl border-2 border-white bg-gradient-to-br from-[#1E1730] to-[#110D1D] p-1.5 sm:p-2 shadow-[0_8px_22px_rgba(0,0,0,0.5)] ring-1 ring-violet-400/25">
      <svg className="size-full text-violet-400" viewBox="0 0 100 100" fill="none">
        {/* Connection lines */}
        <line x1="50" y1="50" x2="25" y2="28" stroke="#8B5CF6" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.8" />
        <line x1="50" y1="50" x2="78" y2="30" stroke="#8B5CF6" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.8" />
        <line x1="50" y1="50" x2="72" y2="76" stroke="#8B5CF6" strokeWidth="2.5" opacity="0.8" />
        <line x1="50" y1="50" x2="28" y2="74" stroke="#8B5CF6" strokeWidth="2.5" opacity="0.8" />

        {/* Satellites */}
        <circle cx="25" cy="28" r="6" fill="#C4B5FD" />
        <circle cx="78" cy="30" r="5" fill="#A78BFA" />
        <circle cx="72" cy="76" r="6" fill="#8B5CF6" />
        <circle cx="28" cy="74" r="5" fill="#C4B5FD" />

        {/* Center Node */}
        <circle cx="50" cy="50" r="11" fill="#7546C8" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
      </svg>
      <div className="absolute bottom-1 left-0 right-0 text-center text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-violet-300">
        Connect
      </div>
    </div>
  );
}

function VioletSparkleSticker() {
  return (
    <div className="relative size-[54px] sm:size-[64px] select-none rounded-2xl border-2 border-white bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] p-1.5 sm:p-2 shadow-[0_8px_20px_rgba(109,40,217,0.4)] ring-1 ring-violet-300/30">
      <svg className="size-full text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0l2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5L12 0z" />
        <circle cx="19" cy="4" r="1.5" fill="#DDD6FE" />
        <circle cx="4" cy="18" r="1.2" fill="#DDD6FE" />
      </svg>
    </div>
  );
}

// ── StickerSlapFooter Component ──
export default function StickerSlapFooter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // State to trigger reset slap animations on double-click
  const [resetKeys, setResetKeys] = useState<Record<string, number>>({
    link: 0,
    qr: 0,
    network: 0,
    sparkle: 0,
  });

  const handleReset = (id: string) => {
    setResetKeys((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  // Sticker positioning: safe corner placement with mobile scaling to prevent overlap with wordmark
  const stickers: StickerItem[] = [
    {
      id: "link",
      name: "One Link",
      defaultRotate: -6,
      slapRotate: -24,
      initialClass: "top-3 right-3 sm:top-5 sm:right-10 md:right-20 lg:right-32",
      render: <ConnectedLinkSticker />,
    },
    {
      id: "qr",
      name: "QR Pass",
      defaultRotate: 7,
      slapRotate: 28,
      initialClass: "bottom-3 left-3 sm:bottom-6 sm:left-10 md:left-20 lg:left-28",
      render: <QrAttendeeCardSticker />,
    },
    {
      id: "network",
      name: "Network Nodes",
      defaultRotate: -10,
      slapRotate: -32,
      initialClass: "top-3 left-3 sm:top-4 sm:left-10 md:left-24 lg:left-36",
      render: <NetworkNodesSticker />,
    },
    {
      id: "sparkle",
      name: "Sparkle",
      defaultRotate: 14,
      slapRotate: 36,
      initialClass: "bottom-3 right-3 sm:bottom-7 sm:right-12 md:right-24 lg:right-36",
      render: <VioletSparkleSticker />,
    },
  ];

  return (
    <footer
      id="linq-footer"
      ref={containerRef}
      className="linq-footer relative w-full border-t border-[#7546C8]/25 bg-[#0C0A14] text-[#F8FAFC] selection:bg-violet-900 selection:text-white"
      style={{ backgroundColor: "#0C0A14", color: "#F8FAFC" }}
    >
      {/* Background ambient violet glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_0%,rgba(117,70,200,0.18),transparent_75%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-16 sm:pt-20 pb-12">
        {/* ── Top Interactive Arena: Wordmark & Slap Stickers ── */}
        <div className="relative mb-16 sm:mb-20 rounded-3xl border border-[#8B5CF6]/15 bg-[#141021]/80 px-4 sm:px-6 py-12 sm:py-16 md:py-20 text-center shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-md overflow-hidden">
          {/* Subtle background grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
              backgroundSize: "28px 28px",
            }}
            aria-hidden="true"
          />

          {/* Interactive Stickers Layer */}
          <div className="pointer-events-none absolute inset-0 z-20">
            {stickers.map((stk, index) => (
              <motion.div
                key={`${stk.id}-${resetKeys[stk.id]}`}
                drag
                dragConstraints={containerRef}
                dragElastic={0.25}
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 2.0, rotate: stk.slapRotate }
                }
                whileInView={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, scale: 1, rotate: stk.defaultRotate }
                }
                viewport={{ once: true }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 18,
                  delay: index * 0.08,
                }}
                whileHover={{ scale: 1.08, cursor: "grab" }}
                whileDrag={{ scale: 1.15, cursor: "grabbing", zIndex: 40 }}
                onDoubleClick={() => handleReset(stk.id)}
                title="Drag sticker · Double-click to reset"
                className={`pointer-events-auto absolute ${stk.initialClass} touch-none cursor-grab active:cursor-grabbing`}
              >
                {stk.render}
              </motion.div>
            ))}
          </div>

          {/* Giant LINQ Wordmark & Tagline */}
          <div className="relative z-10 flex flex-col items-center justify-center py-4">
            <motion.h2
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="linq-footer-wordmark select-none font-black tracking-[-0.06em] text-[4.75rem] sm:text-[7.5rem] md:text-[10rem] lg:text-[12.5rem] leading-[0.8] drop-shadow-[0_10px_30px_rgba(117,70,200,0.3)]"
              style={{
                color: "transparent",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                backgroundImage: "linear-gradient(180deg, #FFFFFF 0%, #EDE6FE 50%, rgba(139, 92, 246, 0.75) 100%)",
              }}
            >
              linq
            </motion.h2>

            {/* Tagline */}
            <motion.p
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="linq-footer-tagline mt-3 sm:mt-5 text-base sm:text-lg md:text-xl font-medium tracking-tight"
              style={{ color: "#DDD6FE", WebkitTextFillColor: "#DDD6FE" }}
            >
              Every connection creates opportunity.
            </motion.p>

            {/* Double-click hint */}
            <p
              className="linq-footer-hint mt-3 sm:mt-4 text-[11px] sm:text-xs font-medium"
              style={{ color: "#A78BFA", WebkitTextFillColor: "#A78BFA" }}
            >
              Double-click any sticker to reset its position
            </p>
          </div>
        </div>

        {/* ── 3-Column Footer Layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12 pb-12 border-b border-white/10">
          {/* Column 1 — EXPLORE */}
          <div>
            <h3
              className="linq-footer-heading text-xs font-bold uppercase tracking-widest"
              style={{ color: "#C4B5FD", WebkitTextFillColor: "#C4B5FD" }}
            >
              EXPLORE
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="#overview"
                  className="linq-footer-link text-sm transition-colors duration-150 inline-block hover:translate-x-0.5"
                  style={{ color: "#E2E8F0" }}
                >
                  Overview
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="linq-footer-link text-sm transition-colors duration-150 inline-block hover:translate-x-0.5"
                  style={{ color: "#E2E8F0" }}
                >
                  How it works
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="linq-footer-link text-sm transition-colors duration-150 inline-block hover:translate-x-0.5"
                  style={{ color: "#E2E8F0" }}
                >
                  Features
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2 — ACCOUNT */}
          <div>
            <h3
              className="linq-footer-heading text-xs font-bold uppercase tracking-widest"
              style={{ color: "#C4B5FD", WebkitTextFillColor: "#C4B5FD" }}
            >
              ACCOUNT
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/organization/register"
                  className="linq-footer-link group inline-flex items-center gap-1 text-sm transition-colors duration-150 hover:translate-x-0.5"
                  style={{ color: "#E2E8F0" }}
                >
                  <span>Register organization</span>
                  <ArrowUpRightIcon className="size-3.5 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="linq-footer-link group inline-flex items-center gap-1 text-sm transition-colors duration-150 hover:translate-x-0.5"
                  style={{ color: "#E2E8F0" }}
                >
                  <span>Log in</span>
                  <ArrowUpRightIcon className="size-3.5 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
              </li>
              <li>
                <a
                  href="https://www.avtive.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="linq-footer-link group inline-flex items-center gap-1 text-sm transition-colors duration-150 hover:translate-x-0.5"
                  style={{ color: "#E2E8F0" }}
                >
                  <span>Avtive</span>
                  <ArrowUpRightIcon className="size-3.5 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 — CONTACT & SOCIAL */}
          <div>
            <h3
              className="linq-footer-heading text-xs font-bold uppercase tracking-widest"
              style={{ color: "#C4B5FD", WebkitTextFillColor: "#C4B5FD" }}
            >
              CONTACT
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="mailto:info@avtive.app"
                  className="linq-footer-link text-sm transition-colors duration-150 inline-block hover:translate-x-0.5"
                  style={{ color: "#E2E8F0" }}
                >
                  info@avtive.app
                </a>
              </li>
              <li>
                <a
                  href="tel:+923125175041"
                  className="linq-footer-link text-sm transition-colors duration-150 inline-block hover:translate-x-0.5"
                  style={{ color: "#E2E8F0" }}
                >
                  +92 312 5175041
                </a>
              </li>
              <li>
                <Link
                  href="/"
                  className="linq-footer-link group inline-flex items-center gap-1 text-sm transition-colors duration-150 hover:translate-x-0.5"
                  style={{ color: "#E2E8F0" }}
                >
                  <span>linq.avtive.app</span>
                  <ArrowUpRightIcon className="size-3.5 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
              </li>
            </ul>

            {/* Social Links */}
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://www.linkedin.com/company/linqavtive/posts/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                className="linq-footer-social-btn grid size-9 place-items-center rounded-full border border-white/15 bg-white/5 transition-all duration-200 hover:border-[#8B5CF6]/50 hover:bg-[#7546C8]/30 hover:scale-105"
                style={{ color: "#E2E8F0" }}
                aria-label="Linq on LinkedIn"
              >
                <LinkedInIcon className="size-4" />
              </a>
              <a
                href="https://www.instagram.com/linq.me/?utm_source=ig_web_button_share_sheet"
                target="_blank"
                rel="noopener noreferrer"
                className="linq-footer-social-btn grid size-9 place-items-center rounded-full border border-white/15 bg-white/5 transition-all duration-200 hover:border-[#8B5CF6]/50 hover:bg-[#7546C8]/30 hover:scale-105"
                style={{ color: "#E2E8F0" }}
                aria-label="Linq on Instagram"
              >
                <InstagramIcon className="size-4" />
              </a>
            </div>
          </div>
        </div>

        {/* ── Bottom Bar: Copyright & Open Peeps Attribution ── */}
        <div
          className="linq-footer-meta mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ color: "#94A3B8" }}
        >
          <div>
            © {new Date().getFullYear()} Avtive. All rights reserved.
          </div>
          <div>
            Crowd animation adapted from Skiper UI · illustration by{" "}
            <a
              href="https://www.openpeeps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline transition-colors"
              style={{ color: "#C4B5FD" }}
            >
              Open Peeps
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { StickerSlapFooter };
