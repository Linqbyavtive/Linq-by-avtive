"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

// ── 001. One-Link Registration Illustration ──
export function OneLinkIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 280 160"
        className="h-full w-full max-h-40 select-none overflow-visible"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#7546C8" />
          </linearGradient>
          <filter id="linkGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient background glow */}
        <circle cx="140" cy="80" r="55" fill="#F3EDFF" opacity="0.6" />

        {/* Left Link Chain Loop */}
        <motion.g
          animate={
            shouldReduceMotion
              ? {}
              : {
                x: [-3, 3, -3],
              }
          }
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
        >
          <rect
            x="85"
            y="60"
            width="50"
            height="32"
            rx="16"
            fill="none"
            stroke="url(#linkGrad)"
            strokeWidth="5"
            transform="rotate(-25 110 76)"
          />
        </motion.g>

        {/* Right Link Chain Loop */}
        <motion.g
          animate={
            shouldReduceMotion
              ? {}
              : {
                x: [3, -3, 3],
              }
          }
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
        >
          <rect
            x="145"
            y="68"
            width="50"
            height="32"
            rx="16"
            fill="none"
            stroke="url(#linkGrad)"
            strokeWidth="5"
            transform="rotate(-25 170 84)"
          />
        </motion.g>

        {/* Dynamic Connecting Bridge Line */}
        <motion.path
          d="M 115 76 Q 140 70 165 84"
          stroke="#7546C8"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="4 6"
          animate={
            shouldReduceMotion
              ? {}
              : {
                strokeDashoffset: [0, -20],
              }
          }
          transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
        />

        {/* Traveling Signal Pulse */}
        {!shouldReduceMotion && (
          <motion.circle
            r="4"
            fill="#8B5CF6"
            filter="url(#linkGlow)"
            animate={{
              cx: [115, 140, 165, 140, 115],
              cy: [76, 70, 84, 70, 76],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          />
        )}

        {/* Floating URL Badge */}
        <motion.g
          animate={
            shouldReduceMotion
              ? {}
              : {
                y: [-2, 2, -2],
              }
          }
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <rect
            x="85"
            y="118"
            width="110"
            height="24"
            rx="12"
            fill="#FFFFFF"
            stroke="#E9E0FA"
            strokeWidth="1.5"
            className="shadow-sm"
          />
          <circle cx="100" cy="130" r="3" fill="#10B981" />
          <text
            x="144"
            y="134"
            textAnchor="middle"
            fill="#7546C8"
            fontSize="10"
            fontWeight="600"
            fontFamily="monospace"
          >
            linq.app/register
          </text>
        </motion.g>

        {/* Sparkles */}
        {!shouldReduceMotion && (
          <>
            <motion.circle
              cx="75"
              cy="48"
              r="2"
              fill="#A78BFA"
              animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ repeat: Infinity, duration: 2.2 }}
            />
            <motion.circle
              cx="205"
              cy="52"
              r="2.5"
              fill="#7546C8"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 2.8, delay: 0.4 }}
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ── 002. Scannable Attendee Cards Illustration ──
export function ScannableCardIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 280 160"
        className="h-full w-full max-h-40 select-none overflow-visible"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="attendeeCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FAF7FF" />
          </linearGradient>
          <linearGradient id="cardLaserGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(117, 70, 200, 0.45)" />
            <stop offset="100%" stopColor="rgba(117, 70, 200, 0)" />
          </linearGradient>
          <linearGradient id="lanyardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7546C8" />
          </linearGradient>
          <filter id="laserLineGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient background glow */}
        <circle cx="140" cy="80" r="54" fill="#F3EDFF" opacity="0.65" />

        {/* Lanyard Strap at Top */}
        <path
          d="M 125 0 L 133 16 M 155 0 L 147 16"
          stroke="url(#lanyardGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Metal Clip & Slot */}
        <rect x="131" y="14" width="18" height="6" rx="3" fill="#DDD6FE" stroke="#7546C8" strokeWidth="1" />
        <rect x="135" y="16" width="10" height="2" rx="1" fill="#7546C8" />

        {/* Floating Digital Attendee Card */}
        <motion.g
          animate={
            shouldReduceMotion
              ? {}
              : {
                y: [-3, 3, -3],
              }
          }
          transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
        >
          {/* Card Body */}
          <rect
            x="70"
            y="20"
            width="140"
            height="126"
            rx="12"
            fill="url(#attendeeCardGrad)"
            stroke="#D8CEF6"
            strokeWidth="1.5"
            className="shadow-md"
          />

          {/* Top Banner */}
          <path
            d="M 70 30 C 70 24.5 74.5 20 80 20 L 200 20 C 205.5 20 210 24.5 210 30 L 210 35 L 70 35 Z"
            fill="#7546C8"
          />
          <text
            x="140"
            y="30"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="6.5"
            fontWeight="bold"
            letterSpacing="0.8"
          >
            LINQ DIGITAL ATTENDEE PASS
          </text>

          {/* Attendee Profile Row */}
          <g transform="translate(78, 40)">
            {/* Avatar Circle */}
            <circle cx="8" cy="8" r="8" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1" />
            <circle cx="8" cy="6.2" r="2.8" fill="#7546C8" />
            <path d="M 3.2 13 C 3.8 10.4 5.6 9.5 8 9.5 C 10.4 9.5 12.2 10.4 12.8 13" fill="#7546C8" />
            <circle cx="14" cy="13" r="1.8" fill="#10B981" stroke="#FFFFFF" strokeWidth="0.8" />

            {/* Name & Badge Info */}
            <text x="20" y="7" fill="#1E1435" fontSize="7" fontWeight="bold">
              Sarah Jenkins
            </text>
            <text x="20" y="14" fill="#7546C8" fontSize="5" fontWeight="600">
              Tech Summit 2026 • Verified Attendee
            </text>
          </g>

          {/* Authentic Square QR Code Container */}
          <rect
            x="106"
            y="58"
            width="68"
            height="68"
            rx="6"
            fill="#FFFFFF"
            stroke="#EDE9FE"
            strokeWidth="1"
          />

          {/* 3 Prominent QR Corner Finder Squares (Authentic 1:1 Square QR Geometry) */}
          {/* Top-Left Finder */}
          <rect x="111" y="63" width="16" height="16" rx="2" fill="none" stroke="#2B1E4A" strokeWidth="2.5" />
          <rect x="115.5" y="67.5" width="7" height="7" rx="1" fill="#7546C8" />

          {/* Top-Right Finder */}
          <rect x="153" y="63" width="16" height="16" rx="2" fill="none" stroke="#2B1E4A" strokeWidth="2.5" />
          <rect x="157.5" y="67.5" width="7" height="7" rx="1" fill="#7546C8" />

          {/* Bottom-Left Finder */}
          <rect x="111" y="105" width="16" height="16" rx="2" fill="none" stroke="#2B1E4A" strokeWidth="2.5" />
          <rect x="115.5" y="109.5" width="7" height="7" rx="1" fill="#7546C8" />

          {/* Central QR Data Grid Patterns */}
          <rect x="130" y="64" width="4.5" height="4.5" rx="0.8" fill="#2B1E4A" />
          <rect x="138" y="64" width="4.5" height="8" rx="0.8" fill="#7546C8" />
          <rect x="146" y="64" width="4.5" height="4.5" rx="0.8" fill="#2B1E4A" />

          <rect x="130" y="73" width="4.5" height="8" rx="0.8" fill="#7546C8" />
          <rect x="146" y="73" width="4.5" height="4.5" rx="0.8" fill="#7546C8" />

          <rect x="130" y="85" width="4.5" height="4.5" rx="0.8" fill="#2B1E4A" />
          <rect x="138" y="76" width="4.5" height="4.5" rx="0.8" fill="#2B1E4A" />
          <rect x="138" y="84" width="4.5" height="8" rx="0.8" fill="#7546C8" />
          <rect x="146" y="82" width="4.5" height="8" rx="0.8" fill="#2B1E4A" />

          <rect x="130" y="94" width="4.5" height="8" rx="0.8" fill="#7546C8" />
          <rect x="138" y="96" width="4.5" height="4.5" rx="0.8" fill="#2B1E4A" />
          <rect x="146" y="94" width="4.5" height="4.5" rx="0.8" fill="#7546C8" />

          {/* Bottom-Right Quadrant Modules */}
          <rect x="153" y="84" width="4.5" height="4.5" rx="0.8" fill="#2B1E4A" />
          <rect x="162" y="84" width="4.5" height="8" rx="0.8" fill="#7546C8" />
          <rect x="153" y="92" width="8" height="4.5" rx="0.8" fill="#7546C8" />
          <rect x="153" y="100" width="4.5" height="8" rx="0.8" fill="#2B1E4A" />
          <rect x="162" y="100" width="4.5" height="4.5" rx="0.8" fill="#7546C8" />
          <rect x="153" y="112" width="12" height="4.5" rx="0.8" fill="#2B1E4A" />

          {/* Bottom timing strip */}
          <rect x="130" y="106" width="4.5" height="4.5" rx="0.8" fill="#2B1E4A" />
          <rect x="138" y="105" width="4.5" height="8" rx="0.8" fill="#2B1E4A" />
          <rect x="146" y="103" width="4.5" height="8" rx="0.8" fill="#2B1E4A" />
          <rect x="130" y="115" width="4.5" height="4.5" rx="0.8" fill="#7546C8" />
          <rect x="138" y="117" width="4.5" height="4.5" rx="0.8" fill="#7546C8" />
          <rect x="146" y="115" width="4.5" height="4.5" rx="0.8" fill="#7546C8" />

          {/* Subtitle at Bottom of Card */}
          <text
            x="140"
            y="136"
            textAnchor="middle"
            fill="#7546C8"
            fontSize="5"
            fontWeight="bold"
            letterSpacing="0.6"
            fontFamily="monospace"
          >
            SCAN FOR ENTRY & NETWORKING
          </text>

          {/* Scanner Targeting Corner Brackets around Square QR */}
          <path d="M 101 68 L 101 56 L 112 56" stroke="#7546C8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 179 68 L 179 56 L 168 56" stroke="#7546C8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 101 118 L 101 129 L 112 129" stroke="#7546C8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 179 118 L 179 129 L 168 129" stroke="#7546C8" strokeWidth="1.8" strokeLinecap="round" />

          {/* Animated Sweeping Laser Beam across Square QR */}
          {!shouldReduceMotion && (
            <motion.g
              animate={{
                y: [60, 122, 60],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: "easeInOut",
              }}
            >
              {/* Laser glow field */}
              <rect
                x="104"
                y="-5"
                width="72"
                height="10"
                fill="url(#cardLaserGlow)"
              />
              {/* Sharp laser line */}
              <line
                x1="104"
                y1="0"
                x2="176"
                y2="0"
                stroke="#8B5CF6"
                strokeWidth="2"
                filter="url(#laserLineGlow)"
              />
              <circle cx="140" cy="0" r="1.5" fill="#FFFFFF" />
            </motion.g>
          )}

          {/* Floating Verified Check-in Badge on Top Right */}
          <motion.g
            animate={
              shouldReduceMotion
                ? {}
                : {
                  scale: [0.96, 1.05, 0.96],
                }
            }
            transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          >
            <rect
              x="184"
              y="12"
              width="60"
              height="18"
              rx="9"
              fill="#FFFFFF"
              stroke="#A7F3D0"
              strokeWidth="1.2"
              className="shadow-sm"
            />
            <circle cx="194" cy="21" r="5" fill="#10B981" />
            <path
              d="M 191.5 21 L 193.5 23 L 196.5 19"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="221" y="24" textAnchor="middle" fill="#065F46" fontSize="6" fontWeight="bold">
              ADMITTED ✓
            </text>
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

// ── 003. Organization Onboarding Illustration ──
export function OrgOnboardingIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 280 160"
        className="h-full w-full max-h-40 select-none overflow-visible"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F6F0FF" />
          </linearGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx="140" cy="80" r="52" fill="#F3EDFF" opacity="0.6" />

        {/* Ground pedestal */}
        <rect x="70" y="132" width="140" height="6" rx="3" fill="#E9E0FA" />

        {/* Main Headquarters Building */}
        <motion.g
          animate={
            shouldReduceMotion
              ? {}
              : {
                y: [-2, 2, -2],
              }
          }
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          {/* Main Tower */}
          <rect
            x="100"
            y="42"
            width="80"
            height="90"
            rx="8"
            fill="url(#buildingGrad)"
            stroke="#D4C5F9"
            strokeWidth="1.5"
            className="shadow-sm"
          />

          {/* Roof Accent */}
          <path d="M 100 48 L 180 48" stroke="#7546C8" strokeWidth="3" />

          {/* 6 Office Windows lighting up in sequence */}
          <motion.rect
            x="112"
            y="56"
            width="12"
            height="12"
            rx="2.5"
            fill="#8B5CF6"
            animate={
              shouldReduceMotion
                ? { opacity: 0.8 }
                : { opacity: [0.3, 0.95, 0.3] }
            }
            transition={{ repeat: Infinity, duration: 2.8, delay: 0.1 }}
          />
          <motion.rect
            x="134"
            y="56"
            width="12"
            height="12"
            rx="2.5"
            fill="#8B5CF6"
            animate={
              shouldReduceMotion
                ? { opacity: 0.8 }
                : { opacity: [0.3, 0.95, 0.3] }
            }
            transition={{ repeat: Infinity, duration: 2.8, delay: 0.4 }}
          />
          <motion.rect
            x="156"
            y="56"
            width="12"
            height="12"
            rx="2.5"
            fill="#8B5CF6"
            animate={
              shouldReduceMotion
                ? { opacity: 0.8 }
                : { opacity: [0.3, 0.95, 0.3] }
            }
            transition={{ repeat: Infinity, duration: 2.8, delay: 0.7 }}
          />

          <motion.rect
            x="112"
            y="76"
            width="12"
            height="12"
            rx="2.5"
            fill="#8B5CF6"
            animate={
              shouldReduceMotion
                ? { opacity: 0.8 }
                : { opacity: [0.3, 0.95, 0.3] }
            }
            transition={{ repeat: Infinity, duration: 2.8, delay: 1.0 }}
          />
          <motion.rect
            x="134"
            y="76"
            width="12"
            height="12"
            rx="2.5"
            fill="#8B5CF6"
            animate={
              shouldReduceMotion
                ? { opacity: 0.8 }
                : { opacity: [0.3, 0.95, 0.3] }
            }
            transition={{ repeat: Infinity, duration: 2.8, delay: 1.3 }}
          />
          <motion.rect
            x="156"
            y="76"
            width="12"
            height="12"
            rx="2.5"
            fill="#8B5CF6"
            animate={
              shouldReduceMotion
                ? { opacity: 0.8 }
                : { opacity: [0.3, 0.95, 0.3] }
            }
            transition={{ repeat: Infinity, duration: 2.8, delay: 1.6 }}
          />

          {/* Entrance Door */}
          <rect
            x="132"
            y="108"
            width="16"
            height="24"
            rx="4"
            fill="#7546C8"
            stroke="#302544"
            strokeWidth="1"
          />

          {/* Floating Onboarding Progress Card */}
          <g transform="translate(145, 20)">
            <rect
              x="0"
              y="0"
              width="80"
              height="30"
              rx="10"
              fill="#FFFFFF"
              stroke="#E9E0FA"
              strokeWidth="1.5"
              className="shadow-md"
            />
            <text x="12" y="14" fill="#302544" fontSize="8" fontWeight="bold">
              PORTAL READY
            </text>
            {/* Progress Bar background */}
            <rect x="12" y="20" width="46" height="4" rx="2" fill="#E9E0FA" />
            {/* Animated filling bar */}
            <motion.rect
              x="12"
              y="20"
              height="4"
              rx="2"
              fill="#7546C8"
              animate={
                shouldReduceMotion
                  ? { width: 46 }
                  : { width: [8, 46, 46, 8] }
              }
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            />
            {/* Checkmark badge */}
            <circle cx="68" cy="15" r="6" fill="#10B981" />
            <path
              d="M 65 15 L 67 17 L 71 13"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

// ── 003. QR Check-in & Attendance Illustration ──
export function QrCheckInIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 280 160"
        className="h-full w-full max-h-40 select-none overflow-visible"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="qrPassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F9F6FE" />
          </linearGradient>
          <linearGradient id="scanBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
            <stop offset="25%" stopColor="#8B5CF6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#7546C8" stopOpacity="1" />
            <stop offset="75%" stopColor="#8B5CF6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
          <filter id="scanBeamGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* Ambient background glow */}
        <circle cx="140" cy="80" r="56" fill="#F3EDFF" opacity="0.65" />

        {/* Attendee QR Pass Card */}
        <motion.g
          animate={
            shouldReduceMotion
              ? {}
              : {
                y: [-2, 2, -2],
              }
          }
          transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
        >
          {/* Card shadow & body */}
          <rect
            x="48"
            y="22"
            width="96"
            height="116"
            rx="10"
            fill="url(#qrPassGrad)"
            stroke="#D8CEF6"
            strokeWidth="1.5"
            className="shadow-sm"
          />

          {/* Lanyard loop slot */}
          <rect x="86" y="15" width="20" height="5" rx="2.5" fill="#C4B5FD" />
          <circle cx="96" cy="17.5" r="1.5" fill="#FFFFFF" />

          {/* Pass Top Banner */}
          <path
            d="M 48 32 C 48 26.5 52.5 22 58 22 L 134 22 C 139.5 22 144 26.5 144 32 L 144 36 L 48 36 Z"
            fill="#7546C8"
          />
          <text
            x="96"
            y="32"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="6.5"
            fontWeight="bold"
            letterSpacing="0.8"
          >
            ATTENDEE PASS
          </text>

          {/* QR Code Container */}
          <rect
            x="59"
            y="44"
            width="74"
            height="62"
            rx="6"
            fill="#FFFFFF"
            stroke="#E9E0FA"
            strokeWidth="1"
          />

          {/* QR Corner Position Markers */}
          {/* Top-Left */}
          <rect x="65" y="50" width="16" height="16" rx="2" fill="none" stroke="#302544" strokeWidth="2.5" />
          <rect x="69.5" y="54.5" width="7" height="7" rx="1" fill="#7546C8" />
          {/* Top-Right */}
          <rect x="111" y="50" width="16" height="16" rx="2" fill="none" stroke="#302544" strokeWidth="2.5" />
          <rect x="115.5" y="54.5" width="7" height="7" rx="1" fill="#7546C8" />
          {/* Bottom-Left */}
          <rect x="65" y="84" width="16" height="16" rx="2" fill="none" stroke="#302544" strokeWidth="2.5" />
          <rect x="69.5" y="88.5" width="7" height="7" rx="1" fill="#7546C8" />

          {/* Center QR Matrix Pixels */}
          <rect x="86" y="51" width="4" height="4" rx="0.8" fill="#302544" />
          <rect x="94" y="51" width="4" height="4" rx="0.8" fill="#7546C8" />
          <rect x="101" y="51" width="4" height="4" rx="0.8" fill="#302544" />
          <rect x="86" y="60" width="4" height="4" rx="0.8" fill="#7546C8" />
          <rect x="93" y="60" width="7" height="4" rx="0.8" fill="#302544" />
          <rect x="86" y="69" width="6" height="4" rx="0.8" fill="#302544" />
          <rect x="95" y="69" width="4" height="4" rx="0.8" fill="#7546C8" />
          <rect x="102" y="69" width="5" height="4" rx="0.8" fill="#302544" />
          <rect x="86" y="78" width="4" height="4" rx="0.8" fill="#7546C8" />
          <rect x="94" y="78" width="7" height="4" rx="0.8" fill="#302544" />
          <rect x="86" y="87" width="5" height="4" rx="0.8" fill="#302544" />
          <rect x="95" y="87" width="5" height="4" rx="0.8" fill="#7546C8" />
          <rect x="104" y="87" width="4" height="4" rx="0.8" fill="#302544" />
          <rect x="111" y="74" width="5" height="4" rx="0.8" fill="#302544" />
          <rect x="120" y="74" width="4" height="4" rx="0.8" fill="#7546C8" />
          <rect x="114" y="83" width="7" height="4" rx="0.8" fill="#302544" />
          <rect x="111" y="92" width="6" height="4" rx="0.8" fill="#7546C8" />
          <rect x="120" y="92" width="4" height="4" rx="0.8" fill="#302544" />

          {/* Attendee Name & Role Placeholder */}
          <rect x="62" y="114" width="38" height="4" rx="2" fill="#7546C8" />
          <rect x="62" y="122" width="22" height="3" rx="1.5" fill="#A78BFA" opacity="0.7" />
          <rect x="107" y="114" width="23" height="11" rx="5.5" fill="#F3EDFF" stroke="#E0D4FC" strokeWidth="1" />
          <text x="118.5" y="122" textAnchor="middle" fill="#7546C8" fontSize="5.5" fontWeight="bold">
            CONFIRMED
          </text>

          {/* Viewport Scanner Brackets */}
          <path d="M 56 50 L 56 42 L 64 42" stroke="#7546C8" strokeWidth="2" strokeLinecap="round" />
          <path d="M 136 50 L 136 42 L 128 42" stroke="#7546C8" strokeWidth="2" strokeLinecap="round" />
          <path d="M 56 100 L 56 108 L 64 108" stroke="#7546C8" strokeWidth="2" strokeLinecap="round" />
          <path d="M 136 100 L 136 108 L 128 108" stroke="#7546C8" strokeWidth="2" strokeLinecap="round" />

          {/* Animated Sweeping Scan Laser Beam */}
          {!shouldReduceMotion && (
            <motion.g
              animate={{
                y: [46, 102, 46],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.4,
                ease: "easeInOut",
              }}
            >
              <line
                x1="54"
                y1="0"
                x2="138"
                y2="0"
                stroke="url(#scanBeamGrad)"
                strokeWidth="2.5"
                filter="url(#scanBeamGlow)"
              />
              <circle cx="96" cy="0" r="2" fill="#FFFFFF" opacity="0.9" />
            </motion.g>
          )}
        </motion.g>

        {/* Floating Success Verification Card (Right Side) */}
        <motion.g
          animate={
            shouldReduceMotion
              ? {}
              : {
                y: [2, -2, 2],
                scale: [0.98, 1.02, 0.98],
              }
          }
          transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut", delay: 0.2 }}
        >
          {/* Card Container */}
          <rect
            x="158"
            y="38"
            width="104"
            height="84"
            rx="12"
            fill="#FFFFFF"
            stroke="#E9E0FA"
            strokeWidth="1.5"
            className="shadow-md"
          />

          {/* Verified Header Pill */}
          <rect x="168" y="48" width="84" height="20" rx="10" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1" />

          {/* Animated Green Checkmark Pulse */}
          <motion.circle
            cx="180"
            cy="58"
            r="6"
            fill="#10B981"
            animate={
              shouldReduceMotion
                ? {}
                : {
                  scale: [1, 1.15, 1],
                }
            }
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
          <path
            d="M 177.5 58 L 179.5 60 L 183 56"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="215" y="61.5" textAnchor="middle" fill="#065F46" fontSize="7.5" fontWeight="bold">
            CHECK-IN VERIFIED
          </text>

          {/* Attendee Details Rows */}
          <text x="168" y="80" fill="#64748B" fontSize="6.5" fontWeight="500">
            Status:
          </text>
          <text x="200" y="80" fill="#10B981" fontSize="6.5" fontWeight="bold">
            Admitted ✓
          </text>

          <text x="168" y="93" fill="#64748B" fontSize="6.5" fontWeight="500">
            Card ID:
          </text>
          <text x="200" y="93" fill="#302544" fontSize="6.5" fontWeight="600" fontFamily="monospace">
            #LNQ-8492
          </text>

          <text x="168" y="106" fill="#64748B" fontSize="6.5" fontWeight="500">
            Attendance:
          </text>
          <text x="212" y="106" fill="#7546C8" fontSize="6.5" fontWeight="bold">
            Recorded Live
          </text>

          {/* Live indicator dot */}
          <motion.circle
            cx="248"
            cy="104.5"
            r="2"
            fill="#10B981"
            animate={shouldReduceMotion ? {} : { opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        </motion.g>

        {/* Sparkles / Ambient dots */}
        {!shouldReduceMotion && (
          <>
            <motion.circle
              cx="40"
              cy="48"
              r="2"
              fill="#A78BFA"
              animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 2.2 }}
            />
            <motion.circle
              cx="268"
              cy="80"
              r="2.5"
              fill="#8B5CF6"
              animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2.8, delay: 0.5 }}
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ── 004. Portals for Every Role Illustration ──
export function RolePortalsIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 280 160"
        className="h-full w-full max-h-40 select-none overflow-visible"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="portalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FAF7FF" />
          </linearGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx="140" cy="80" r="55" fill="#F3EDFF" opacity="0.6" />

        {/* Main Dashboard Window */}
        <motion.g
          animate={
            shouldReduceMotion
              ? {}
              : {
                y: [-2, 2, -2],
              }
          }
          transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
        >
          {/* Browser Window Frame */}
          <rect
            x="60"
            y="26"
            width="160"
            height="110"
            rx="12"
            fill="url(#portalGrad)"
            stroke="#E9E0FA"
            strokeWidth="1.5"
            className="shadow-md"
          />

          {/* Window Header */}
          <rect x="60" y="26" width="160" height="18" rx="12" fill="#F3EDFF" />
          <rect x="60" y="34" width="160" height="10" fill="#F3EDFF" />
          <circle cx="72" cy="35" r="2.5" fill="#DDD6FE" />
          <circle cx="80" cy="35" r="2.5" fill="#C4B5FD" />
          <circle cx="88" cy="35" r="2.5" fill="#A78BFA" />

          {/* Role Tab Selector (Creator vs Organization) */}
          <rect
            x="96"
            y="48"
            width="88"
            height="16"
            rx="8"
            fill="#EDE9FE"
          />
          {/* Sliding active tab pill */}
          <motion.rect
            y="49"
            width="42"
            height="14"
            rx="7"
            fill="#7546C8"
            animate={
              shouldReduceMotion
                ? { x: 98 }
                : { x: [98, 140, 98] }
            }
            transition={{
              repeat: Infinity,
              duration: 3.4,
              ease: "easeInOut",
            }}
          />
          <text x="119" y="59" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold">
            CREATOR
          </text>
          <text x="161" y="59" textAnchor="middle" fill="#302544" fontSize="7" fontWeight="bold">
            ORG
          </text>

          {/* Left Mini Sidebar */}
          <rect x="70" y="70" width="22" height="54" rx="4" fill="#F6F0FF" />
          <rect x="74" y="76" width="14" height="3" rx="1.5" fill="#7546C8" />
          <rect x="74" y="84" width="14" height="3" rx="1.5" fill="#C4B5FD" />
          <rect x="74" y="92" width="14" height="3" rx="1.5" fill="#C4B5FD" />

          {/* Animated Analytics Chart Bars */}
          <g transform="translate(100, 70)">
            <rect x="0" y="0" width="110" height="54" rx="6" fill="#FFFFFF" stroke="#F3EDFF" strokeWidth="1" />

            {/* Bar 1 */}
            <motion.rect
              x="16"
              width="10"
              rx="3"
              fill="#A78BFA"
              animate={
                shouldReduceMotion
                  ? { y: 22, height: 26 }
                  : { y: [30, 16, 30], height: [18, 32, 18] }
              }
              transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
            />
            {/* Bar 2 */}
            <motion.rect
              x="36"
              width="10"
              rx="3"
              fill="#7546C8"
              animate={
                shouldReduceMotion
                  ? { y: 14, height: 34 }
                  : { y: [20, 10, 20], height: [28, 38, 28] }
              }
              transition={{ repeat: Infinity, duration: 3.0, delay: 0.3, ease: "easeInOut" }}
            />
            {/* Bar 3 */}
            <motion.rect
              x="56"
              width="10"
              rx="3"
              fill="#8B5CF6"
              animate={
                shouldReduceMotion
                  ? { y: 18, height: 30 }
                  : { y: [26, 12, 26], height: [22, 36, 22] }
              }
              transition={{ repeat: Infinity, duration: 2.8, delay: 0.6, ease: "easeInOut" }}
            />
            {/* Bar 4 */}
            <motion.rect
              x="76"
              width="10"
              rx="3"
              fill="#C4B5FD"
              animate={
                shouldReduceMotion
                  ? { y: 26, height: 22 }
                  : { y: [34, 20, 34], height: [14, 28, 14] }
              }
              transition={{ repeat: Infinity, duration: 3.2, delay: 0.2, ease: "easeInOut" }}
            />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

// ── 005. All Organizations, One Place Illustration ──
export function AllOrgsIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 280 160"
        className="h-full w-full max-h-40 select-none overflow-visible"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="orgHubGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient background glow */}
        <circle cx="140" cy="80" r="54" fill="#F3EDFF" opacity="0.6" />

        {/* Expanding Central Pulse Waves */}
        {!shouldReduceMotion && (
          <>
            <motion.circle
              cx="140"
              cy="80"
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="1.5"
              animate={{
                r: [28, 62],
                opacity: [0.7, 0],
              }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeOut" }}
            />
            <motion.circle
              cx="140"
              cy="80"
              fill="none"
              stroke="#C4B5FD"
              strokeWidth="1.2"
              animate={{
                r: [28, 62],
                opacity: [0.7, 0],
              }}
              transition={{ repeat: Infinity, duration: 2.8, delay: 1.4, ease: "easeOut" }}
            />
          </>
        )}

        {/* Connecting Lines to 4 Satellite Orgs */}
        <motion.line
          x1="65"
          y1="45"
          x2="140"
          y2="80"
          stroke="#C4B5FD"
          strokeWidth="2"
          strokeDasharray="4 4"
          animate={shouldReduceMotion ? {} : { strokeDashoffset: [0, -16] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
        />
        <motion.line
          x1="215"
          y1="45"
          x2="140"
          y2="80"
          stroke="#C4B5FD"
          strokeWidth="2"
          strokeDasharray="4 4"
          animate={shouldReduceMotion ? {} : { strokeDashoffset: [0, -16] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
        />
        <motion.line
          x1="65"
          y1="115"
          x2="140"
          y2="80"
          stroke="#C4B5FD"
          strokeWidth="2"
          strokeDasharray="4 4"
          animate={shouldReduceMotion ? {} : { strokeDashoffset: [0, -16] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
        />
        <motion.line
          x1="215"
          y1="115"
          x2="140"
          y2="80"
          stroke="#C4B5FD"
          strokeWidth="2"
          strokeDasharray="4 4"
          animate={shouldReduceMotion ? {} : { strokeDashoffset: [0, -16] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
        />

        {/* Traveling Packets into Hub */}
        {!shouldReduceMotion && (
          <>
            <motion.circle
              r="3"
              fill="#7546C8"
              animate={{
                cx: [65, 140],
                cy: [45, 80],
                opacity: [0.2, 1, 0.2],
              }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            />
            <motion.circle
              r="3"
              fill="#7546C8"
              animate={{
                cx: [215, 140],
                cy: [45, 80],
                opacity: [0.2, 1, 0.2],
              }}
              transition={{ repeat: Infinity, duration: 2.4, delay: 0.6, ease: "easeInOut" }}
            />
            <motion.circle
              r="3"
              fill="#7546C8"
              animate={{
                cx: [65, 140],
                cy: [115, 80],
                opacity: [0.2, 1, 0.2],
              }}
              transition={{ repeat: Infinity, duration: 2.4, delay: 1.2, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Satellite Org Cards */}
        {/* Org 1 Top-Left */}
        <g transform="translate(45, 28)">
          <rect x="0" y="0" width="40" height="34" rx="8" fill="#FFFFFF" stroke="#E9E0FA" strokeWidth="1.5" className="shadow-sm" />
          <rect x="8" y="8" width="24" height="4" rx="2" fill="#7546C8" />
          <rect x="8" y="16" width="16" height="3" rx="1.5" fill="#C4B5FD" />
          <circle cx="28" cy="24" r="3" fill="#10B981" />
        </g>

        {/* Org 2 Top-Right */}
        <g transform="translate(195, 28)">
          <rect x="0" y="0" width="40" height="34" rx="8" fill="#FFFFFF" stroke="#E9E0FA" strokeWidth="1.5" className="shadow-sm" />
          <rect x="8" y="8" width="24" height="4" rx="2" fill="#8B5CF6" />
          <rect x="8" y="16" width="16" height="3" rx="1.5" fill="#C4B5FD" />
          <circle cx="28" cy="24" r="3" fill="#10B981" />
        </g>

        {/* Org 3 Bottom-Left */}
        <g transform="translate(45, 98)">
          <rect x="0" y="0" width="40" height="34" rx="8" fill="#FFFFFF" stroke="#E9E0FA" strokeWidth="1.5" className="shadow-sm" />
          <rect x="8" y="8" width="24" height="4" rx="2" fill="#8B5CF6" />
          <rect x="8" y="16" width="16" height="3" rx="1.5" fill="#C4B5FD" />
          <circle cx="28" cy="24" r="3" fill="#10B981" />
        </g>

        {/* Org 4 Bottom-Right */}
        <g transform="translate(195, 98)">
          <rect x="0" y="0" width="40" height="34" rx="8" fill="#FFFFFF" stroke="#E9E0FA" strokeWidth="1.5" className="shadow-sm" />
          <rect x="8" y="8" width="24" height="4" rx="2" fill="#7546C8" />
          <rect x="8" y="16" width="16" height="3" rx="1.5" fill="#C4B5FD" />
          <circle cx="28" cy="24" r="3" fill="#10B981" />
        </g>

        {/* Central Management Hub Card */}
        <motion.g
          animate={
            shouldReduceMotion
              ? {}
              : {
                scale: [0.97, 1.03, 0.97],
              }
          }
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        >
          <rect
            x="112"
            y="56"
            width="56"
            height="48"
            rx="12"
            fill="#FFFFFF"
            stroke="#7546C8"
            strokeWidth="2"
            className="shadow-md"
          />
          {/* Linq Hub Core Icon */}
          <rect x="120" y="64" width="40" height="8" rx="4" fill="#7546C8" />
          <circle cx="126" cy="84" r="4" fill="#8B5CF6" />
          <circle cx="140" cy="84" r="4" fill="#7546C8" />
          <circle cx="154" cy="84" r="4" fill="#8B5CF6" />
          <rect x="120" y="93" width="40" height="4" rx="2" fill="#EDE9FE" />
        </motion.g>
      </svg>
    </div>
  );
}

// ── 006. Global Networking Illustration ──
export function GlobalNetworkingIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 280 160"
        className="h-full w-full max-h-40 select-none overflow-visible"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="globeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="85%" stopColor="#FAF7FF" />
            <stop offset="100%" stopColor="#EDE9FE" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx="140" cy="80" r="58" fill="#F3EDFF" opacity="0.6" />

        {/* Rotating Globe Wireframe */}
        <g transform="translate(140, 80)">
          {/* Globe Base Sphere */}
          <circle r="44" fill="url(#globeGrad)" stroke="#D4C5F9" strokeWidth="1.5" />

          {/* Latitude Lines */}
          <line x1="-44" y1="0" x2="44" y2="0" stroke="#E9E0FA" strokeWidth="1.2" />
          <ellipse cx="0" cy="-20" rx="38" ry="10" fill="none" stroke="#E9E0FA" strokeWidth="1" strokeDasharray="3 3" />
          <ellipse cx="0" cy="20" rx="38" ry="10" fill="none" stroke="#E9E0FA" strokeWidth="1" strokeDasharray="3 3" />

          {/* Longitude Curved Lines */}
          <ellipse cx="0" cy="0" rx="22" ry="44" fill="none" stroke="#E9E0FA" strokeWidth="1.2" />
          <ellipse cx="0" cy="0" rx="36" ry="44" fill="none" stroke="#E9E0FA" strokeWidth="0.8" />
        </g>

        {/* Global Connection Flight Arcs */}
        <path
          d="M 112 55 Q 140 35 168 58"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="1.8"
          strokeDasharray="4 4"
        />
        <path
          d="M 82 92 Q 110 115 138 88"
          fill="none"
          stroke="#7546C8"
          strokeWidth="1.8"
          strokeDasharray="4 4"
        />
        <path
          d="M 138 88 Q 172 108 198 82"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="1.8"
          strokeDasharray="4 4"
        />

        {/* Traveling Signal Packets */}
        {!shouldReduceMotion && (
          <>
            <motion.circle
              r="3"
              fill="#7546C8"
              animate={{
                cx: [112, 140, 168, 140, 112],
                cy: [55, 35, 58, 35, 55],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
            <motion.circle
              r="3"
              fill="#8B5CF6"
              animate={{
                cx: [82, 110, 138, 110, 82],
                cy: [92, 115, 88, 115, 92],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{ repeat: Infinity, duration: 3.4, delay: 0.5, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Network Node Avatars */}
        {/* Node 1 */}
        <motion.g
          animate={shouldReduceMotion ? {} : { scale: [0.95, 1.08, 0.95] }}
          transition={{ repeat: Infinity, duration: 2.8 }}
        >
          <circle cx="112" cy="55" r="9" fill="#FFFFFF" stroke="#7546C8" strokeWidth="1.8" className="shadow-sm" />
          <circle cx="112" cy="52" r="3" fill="#7546C8" />
          <path d="M 106 60 Q 112 56 118 60" fill="#7546C8" />
        </motion.g>

        {/* Node 2 */}
        <motion.g
          animate={shouldReduceMotion ? {} : { scale: [0.95, 1.08, 0.95] }}
          transition={{ repeat: Infinity, duration: 3.1, delay: 0.4 }}
        >
          <circle cx="168" cy="58" r="9" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="1.8" className="shadow-sm" />
          <circle cx="168" cy="55" r="3" fill="#8B5CF6" />
          <path d="M 162 63 Q 168 59 174 63" fill="#8B5CF6" />
        </motion.g>

        {/* Node 3 (Center) */}
        <motion.g
          animate={shouldReduceMotion ? {} : { scale: [0.95, 1.1, 0.95] }}
          transition={{ repeat: Infinity, duration: 2.5, delay: 0.8 }}
        >
          <circle cx="138" cy="88" r="10" fill="#FFFFFF" stroke="#7546C8" strokeWidth="2" className="shadow-sm" />
          <circle cx="138" cy="84" r="3.5" fill="#7546C8" />
          <path d="M 131 93 Q 138 89 145 93" fill="#7546C8" />
        </motion.g>

        {/* Node 4 (Left) */}
        <motion.g
          animate={shouldReduceMotion ? {} : { scale: [0.95, 1.06, 0.95] }}
          transition={{ repeat: Infinity, duration: 3.3, delay: 1.2 }}
        >
          <circle cx="82" cy="92" r="9" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="1.8" className="shadow-sm" />
          <circle cx="82" cy="89" r="3" fill="#8B5CF6" />
          <path d="M 76 97 Q 82 93 88 97" fill="#8B5CF6" />
        </motion.g>

        {/* Node 5 (Right) */}
        <motion.g
          animate={shouldReduceMotion ? {} : { scale: [0.95, 1.06, 0.95] }}
          transition={{ repeat: Infinity, duration: 3.0, delay: 0.2 }}
        >
          <circle cx="198" cy="82" r="9" fill="#FFFFFF" stroke="#7546C8" strokeWidth="1.8" className="shadow-sm" />
          <circle cx="198" cy="79" r="3" fill="#7546C8" />
          <path d="M 192 87 Q 198 83 204 87" fill="#7546C8" />
        </motion.g>
      </svg>
    </div>
  );
}

