"use client";
/* eslint-disable @next/next/no-img-element --
 * Card canvases use dynamic URLs (avatars, sponsors, CDN assets) and are captured via html-to-image;
 * opting out of next/image avoids brittle remotePatterns and sizing constraints.
 */
import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { CardData, SponsorEntry, SocialPlatform } from "@/types/card";
import { cssFontStackForGoogleFamily, parseGoogleFamilyFromStored } from "@/lib/card-fonts";
import { preloadGoogleCardFontCss } from "@/lib/card-font-runtime";
import { optimizeCdnImageUrl } from "@/lib/utils/cdn-image";
import { isValidImageDataUrl } from "@/lib/utils/image-data-url";
import { getPublicAppUrl } from "@/lib/app-url";
import { isValidUuid } from "@/lib/validation/uuid";
import { getSocialPlatformIcon } from "@/components/AttendeeSocialLinks";
import { formatAttendeeLinkedInUrl } from "@/lib/validation/social-urls";

/** Custom sponsors */
const SPONSOR_LOGO_HEIGHT_H1_PX = 42;
const SPONSOR_STRIP_MAX_W_H1_PX = 560;
const SPONSOR_LOGO_HEIGHT_V_PX = 36;
const SPONSOR_STRIP_MAX_W_V_PX = 480;

import { parseColorLuminance, isValidCssColor } from "@/lib/ui/color-validation";
export { parseColorLuminance, isValidCssColor };

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function parseColorToHsl(colorStr?: string): { h: number; s: number; l: number } {
  if (!colorStr || typeof colorStr !== "string") return { h: 275, s: 65, l: 30 };
  const raw = colorStr.trim().toLowerCase();

  const PRESET_HSL: Record<string, { h: number; s: number; l: number }> = {
    purple: { h: 275, s: 65, l: 30 },
    default: { h: 275, s: 65, l: 30 },
    blue: { h: 215, s: 85, l: 35 },
    navy: { h: 220, s: 75, l: 20 },
    cyan: { h: 185, s: 95, l: 45 },
    teal: { h: 175, s: 80, l: 35 },
    green: { h: 155, s: 80, l: 30 },
    emerald: { h: 155, s: 80, l: 30 },
    lime: { h: 85, s: 85, l: 40 },
    red: { h: 350, s: 85, l: 35 },
    maroon: { h: 350, s: 70, l: 20 },
    pink: { h: 320, s: 85, l: 40 },
    magenta: { h: 310, s: 90, l: 45 },
    orange: { h: 25, s: 90, l: 45 },
    amber: { h: 38, s: 95, l: 45 },
    yellow: { h: 48, s: 95, l: 50 },
    gold: { h: 42, s: 90, l: 45 },
  };

  if (PRESET_HSL[raw]) {
    return PRESET_HSL[raw];
  }

  // Hex format
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    let r = 0, g = 0, b = 0;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return { h: 275, s: 65, l: 30 };
    }
    if (isNaN(r) || isNaN(g) || isNaN(b)) return { h: 275, s: 65, l: 30 };
    return rgbToHsl(r, g, b);
  }

  // rgb format
  const rgbMatch = raw.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return rgbToHsl(r, g, b);
    }
  }

  // hsl format
  const hslMatch = raw.match(/^hsla?\(\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) % 360;
    const s = Math.min(100, Math.max(0, parseFloat(hslMatch[2])));
    const l = Math.min(100, Math.max(0, parseFloat(hslMatch[3])));
    return { h, s, l };
  }

  return { h: 275, s: 65, l: 30 };
}

export interface NeonPalette {
  primary: string;
  primaryEnd: string;
  secondary: string;
  secondaryEnd: string;
  accentArc: string;
  accentArcEnd: string;
  spotlight1: string;
  spotlight2: string;
  spotlight3: string;
  pillBg: string;
  pillBorder: string;
  dotGrid: string;
  filament1: string;
  filament2: string;
  filament3: string;
  filament4: string;
  filament5: string;
  filament6: string;
  filament7: string;
  flare: string;
  primaryCore: string;
  secondaryCore: string;
}

function getNeonPalette(colorStr?: string): NeonPalette {
  const raw = String(colorStr || "").trim().toLowerCase();

  // 1. Exact default Safar-e-Karakoram / Purple Theme
  if (!raw || raw === "purple" || raw === "default" || raw === "#2d1b54" || raw === "#41295a") {
    return {
      primary: "#00F0FF",
      primaryEnd: "#00E676",
      secondary: "#FF2E93",
      secondaryEnd: "#9333EA",
      accentArc: "#FFB800",
      accentArcEnd: "#FF7A00",
      spotlight1: "#00F0FF",
      spotlight2: "#E024C3",
      spotlight3: "#FF9A00",
      pillBg: "#2D1B54",
      pillBorder: "rgba(255, 255, 255, 0.15)",
      dotGrid: "#00E676",
      filament1: "#FF9A00",
      filament2: "#00F0FF",
      filament3: "#00F0FF",
      filament4: "#00E676",
      filament5: "#E024C3",
      filament6: "#9333EA",
      filament7: "#00F0FF",
      flare: "#FF0080",
      primaryCore: "#FFFFFF",
      secondaryCore: "#FFAEEB",
    };
  }

  // 2. Preset: Blue
  if (raw === "blue" || raw === "navy") {
    return {
      primary: "#00F0FF",
      primaryEnd: "#38BDF8",
      secondary: "#3B82F6",
      secondaryEnd: "#6366F1",
      accentArc: "#7DD3FC",
      accentArcEnd: "#0284C7",
      spotlight1: "#00F0FF",
      spotlight2: "#2563EB",
      spotlight3: "#38BDF8",
      pillBg: "#0F2952",
      pillBorder: "rgba(56, 189, 248, 0.3)",
      dotGrid: "#38BDF8",
      filament1: "#7DD3FC",
      filament2: "#38BDF8",
      filament3: "#00F0FF",
      filament4: "#60A5FA",
      filament5: "#3B82F6",
      filament6: "#2563EB",
      filament7: "#00F0FF",
      flare: "#0284C7",
      primaryCore: "#FFFFFF",
      secondaryCore: "#BAE6FD",
    };
  }

  // 3. Preset: Red
  if (raw === "red" || raw === "maroon") {
    return {
      primary: "#FF3B30",
      primaryEnd: "#EF4444",
      secondary: "#F97316",
      secondaryEnd: "#EA580C",
      accentArc: "#FFB800",
      accentArcEnd: "#FF9500",
      spotlight1: "#FF3B30",
      spotlight2: "#F97316",
      spotlight3: "#FFB800",
      pillBg: "#68132A",
      pillBorder: "rgba(239, 68, 68, 0.3)",
      dotGrid: "#FF9500",
      filament1: "#FFB800",
      filament2: "#FF3B30",
      filament3: "#EF4444",
      filament4: "#F97316",
      filament5: "#EA580C",
      filament6: "#B91C1C",
      filament7: "#FF3B30",
      flare: "#DC2626",
      primaryCore: "#FFFFFF",
      secondaryCore: "#FED7AA",
    };
  }

  // 4. Preset: Green / Emerald
  if (raw === "green" || raw === "emerald" || raw === "teal") {
    return {
      primary: "#00E676",
      primaryEnd: "#10B981",
      secondary: "#00F0FF",
      secondaryEnd: "#0D9488",
      accentArc: "#A3E635",
      accentArcEnd: "#84CC16",
      spotlight1: "#00E676",
      spotlight2: "#14B8A6",
      spotlight3: "#84CC16",
      pillBg: "#0D3829",
      pillBorder: "rgba(16, 185, 129, 0.3)",
      dotGrid: "#00E676",
      filament1: "#A3E635",
      filament2: "#00E676",
      filament3: "#10B981",
      filament4: "#00F0FF",
      filament5: "#14B8A6",
      filament6: "#0D9488",
      filament7: "#00E676",
      flare: "#10B981",
      primaryCore: "#FFFFFF",
      secondaryCore: "#A7F3D0",
    };
  }

  // 5. Preset: Pink
  if (raw === "pink" || raw === "magenta") {
    return {
      primary: "#FF2E93",
      primaryEnd: "#EC4899",
      secondary: "#C084FC",
      secondaryEnd: "#9333EA",
      accentArc: "#FB7185",
      accentArcEnd: "#F43F5E",
      spotlight1: "#FF2E93",
      spotlight2: "#A855F7",
      spotlight3: "#FB7185",
      pillBg: "#5B1245",
      pillBorder: "rgba(236, 72, 153, 0.3)",
      dotGrid: "#FF2E93",
      filament1: "#FB7185",
      filament2: "#FF2E93",
      filament3: "#EC4899",
      filament4: "#C084FC",
      filament5: "#A855F7",
      filament6: "#9333EA",
      filament7: "#FF2E93",
      flare: "#DB2777",
      primaryCore: "#FFFFFF",
      secondaryCore: "#FBCFE8",
    };
  }

  // 6. Preset: Amber / Orange / Gold
  if (raw === "orange" || raw === "amber" || raw === "yellow" || raw === "gold") {
    return {
      primary: "#FFB800",
      primaryEnd: "#F59E0B",
      secondary: "#FF7A00",
      secondaryEnd: "#EA580C",
      accentArc: "#FDE047",
      accentArcEnd: "#FACC15",
      spotlight1: "#FFB800",
      spotlight2: "#EA580C",
      spotlight3: "#FACC15",
      pillBg: "#542805",
      pillBorder: "rgba(245, 158, 11, 0.3)",
      dotGrid: "#FFB800",
      filament1: "#FDE047",
      filament2: "#FFB800",
      filament3: "#F59E0B",
      filament4: "#FF7A00",
      filament5: "#EA580C",
      filament6: "#DC2626",
      filament7: "#FFB800",
      flare: "#D97706",
      primaryCore: "#FFFFFF",
      secondaryCore: "#FEF08A",
    };
  }

  // 7. Dynamic Custom Hex / RGB / HSL Color
  const { h, s } = parseColorToHsl(raw);
  const primary = `hsl(${h}, 95%, 55%)`;
  const primaryEnd = `hsl(${(h + 20) % 360}, 95%, 50%)`;
  const secondary = `hsl(${(h + 40) % 360}, 95%, 55%)`;
  const secondaryEnd = `hsl(${(h + 70) % 360}, 90%, 48%)`;
  const accentArc = `hsl(${(h - 30 + 360) % 360}, 95%, 60%)`;
  const accentArcEnd = `hsl(${(h - 15 + 360) % 360}, 95%, 50%)`;

  return {
    primary,
    primaryEnd,
    secondary,
    secondaryEnd,
    accentArc,
    accentArcEnd,
    spotlight1: primary,
    spotlight2: secondary,
    spotlight3: accentArc,
    pillBg: raw.startsWith("#") ? raw : `hsl(${h}, ${Math.max(50, s)}%, 22%)`,
    pillBorder: `hsla(${h}, 85%, 65%, 0.35)`,
    dotGrid: `hsl(${(h + 25) % 360}, 90%, 50%)`,
    filament1: accentArc,
    filament2: primary,
    filament3: primaryEnd,
    filament4: secondary,
    filament5: secondaryEnd,
    filament6: `hsl(${(h + 90) % 360}, 85%, 45%)`,
    filament7: primary,
    flare: `hsl(${h}, 95%, 50%)`,
    primaryCore: "#FFFFFF",
    secondaryCore: `hsla(${h}, 100%, 90%, 0.9)`,
  };
}

function DynamicNeonCurvesHorizontal({ palette }: { palette: NeonPalette }) {
  return (
    <svg
      width="1200"
      height="628"
      viewBox="0 0 1200 628"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-[1200px] h-[628px] pointer-events-none z-0"
    >
      <defs>
        <filter id="glowPrimaryH" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" result="blur1" />
          <feGaussianBlur stdDeviation="4" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glowSecondaryH" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" result="blur1" />
          <feGaussianBlur stdDeviation="5" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glowArcH" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" result="blur1" />
          <feGaussianBlur stdDeviation="3" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="gradPrimaryH" x1="1200" y1="50" x2="400" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.primary} stopOpacity="0.95" />
          <stop offset="50%" stopColor={palette.primary} stopOpacity="0.9" />
          <stop offset="85%" stopColor={palette.primaryEnd} stopOpacity="0.75" />
          <stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
        </linearGradient>

        <linearGradient id="gradSecondaryH" x1="1200" y1="180" x2="350" y2="630" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.9" />
          <stop offset="40%" stopColor={palette.secondary} stopOpacity="0.95" />
          <stop offset="70%" stopColor={palette.secondaryEnd} stopOpacity="0.85" />
          <stop offset="100%" stopColor={palette.secondaryEnd} stopOpacity="0" />
        </linearGradient>

        <linearGradient id="gradArcH" x1="1200" y1="0" x2="850" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.accentArc} stopOpacity="0.85" />
          <stop offset="60%" stopColor={palette.accentArcEnd} stopOpacity="0.9" />
          <stop offset="100%" stopColor={palette.flare} stopOpacity="0" />
        </linearGradient>

        <linearGradient id="gradWaveH" x1="1100" y1="350" x2="250" y2="580" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.primary} stopOpacity="0.4" />
          <stop offset="50%" stopColor={palette.primaryEnd} stopOpacity="0.5" />
          <stop offset="100%" stopColor={palette.primaryEnd} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base background fill */}
      <rect width="1200" height="628" fill="#04060A" />

      {/* Atmospheric spotlights */}
      <circle cx="1020" cy="220" r="320" fill={palette.spotlight1} opacity="0.12" filter="url(#glowPrimaryH)" />
      <circle cx="560" cy="580" r="280" fill={palette.spotlight2} opacity="0.14" filter="url(#glowSecondaryH)" />
      <circle cx="1150" cy="80" r="200" fill={palette.spotlight3} opacity="0.10" filter="url(#glowArcH)" />

      {/* Filament Background Lines */}
      <g opacity="0.25" strokeWidth="1.2">
        <path d="M 1200,40 C 1040,70 920,180 820,320 C 720,460 580,560 380,628" stroke={palette.filament1} fill="none" />
        <path d="M 1200,60 C 1030,95 910,200 810,335 C 710,470 560,570 350,628" stroke={palette.filament2} fill="none" />
        <path d="M 1200,80 C 1020,120 890,225 790,355 C 690,485 540,580 320,628" stroke={palette.filament3} fill="none" />
        <path d="M 1200,105 C 1000,150 870,250 770,375 C 670,500 520,590 290,628" stroke={palette.filament4} fill="none" />
        <path d="M 1200,130 C 980,180 850,280 750,400 C 650,520 490,600 250,628" stroke={palette.filament5} fill="none" />
        <path d="M 1200,160 C 950,210 820,310 720,430 C 620,550 450,610 200,628" stroke={palette.filament6} fill="none" />
        <path d="M 1200,190 C 920,245 790,350 680,465 C 570,580 390,620 150,628" stroke={palette.filament7} fill="none" />
      </g>

      {/* High Arc Ribbon */}
      <path d="M 1200,15 C 1070,40 980,110 930,190 C 880,270 850,330 810,380" 
            stroke="url(#gradArcH)" strokeWidth="4.5" fill="none" filter="url(#glowArcH)" />
      <path d="M 1200,22 C 1065,50 975,120 925,200 C 875,280 845,340 805,390" 
            stroke="#FFE6A0" strokeWidth="1.5" fill="none" opacity="0.8" />

      {/* Ambient Sweeping Ribbon */}
      <path d="M 1200,240 C 1000,320 840,430 700,510 C 580,580 430,620 280,628" 
            stroke="url(#gradWaveH)" strokeWidth="8" fill="none" opacity="0.45" filter="url(#glowPrimaryH)" />

      {/* Primary Laser Ribbon */}
      <path d="M 1200,110 C 1010,165 870,275 770,405 C 670,535 520,615 300,628" 
            stroke="url(#gradPrimaryH)" strokeWidth="6" fill="none" filter="url(#glowPrimaryH)" />
      <path d="M 1200,112 C 1008,167 868,276 768,406 C 668,536 518,616 298,628" 
            stroke={palette.primaryCore} strokeWidth="2" fill="none" opacity="0.9" />

      {/* Secondary Ribbon */}
      <path d="M 1200,210 C 970,275 830,375 730,485 C 630,595 490,625 360,628" 
            stroke="url(#gradSecondaryH)" strokeWidth="7" fill="none" filter="url(#glowSecondaryH)" />
      <path d="M 1200,212 C 968,277 828,376 728,486 C 628,596 488,626 358,628" 
            stroke={palette.secondaryCore} strokeWidth="2" fill="none" opacity="0.85" />

      {/* Bottom Flare */}
      <path d="M 680,530 C 590,590 480,625 380,628" 
            stroke={palette.flare} strokeWidth="12" fill="none" opacity="0.6" filter="url(#glowSecondaryH)" />
      <path d="M 670,535 C 585,593 478,626 385,628" 
            stroke="#FFFFFF" strokeWidth="2.5" fill="none" opacity="0.9" />

      {/* Sparkles */}
      <circle cx="890" cy="180" r="2" fill="#FFFFFF" opacity="0.9" />
      <circle cx="750" cy="380" r="2.5" fill={palette.primary} opacity="0.95" filter="url(#glowPrimaryH)" />
      <circle cx="530" cy="560" r="3" fill={palette.secondary} opacity="0.9" filter="url(#glowSecondaryH)" />
      <circle cx="1060" cy="90" r="1.8" fill={palette.accentArc} opacity="0.8" />
      <circle cx="980" cy="280" r="1.5" fill="#FFFFFF" opacity="0.7" />
      <circle cx="640" cy="490" r="2" fill={palette.dotGrid} opacity="0.8" />

      {/* Digital Matrix Dot Grid (Lower-Right) */}
      <g fill={palette.dotGrid}>
        <circle cx="755" cy="455" r="1.5" opacity="0.18" />
        <circle cx="755" cy="470" r="1.5" opacity="0.22" />
        <circle cx="755" cy="485" r="1.5" opacity="0.28" />
        <circle cx="755" cy="500" r="1.5" opacity="0.32" />
        <circle cx="755" cy="515" r="1.5" opacity="0.35" />
        <circle cx="755" cy="530" r="1.5" opacity="0.38" />
        <circle cx="755" cy="545" r="1.5" opacity="0.35" />
        <circle cx="755" cy="560" r="1.5" opacity="0.28" />

        <circle cx="770" cy="455" r="1.5" opacity="0.22" />
        <circle cx="770" cy="470" r="1.5" opacity="0.28" />
        <circle cx="770" cy="485" r="1.5" opacity="0.35" />
        <circle cx="770" cy="500" r="1.5" opacity="0.40" />
        <circle cx="770" cy="515" r="1.5" opacity="0.42" />
        <circle cx="770" cy="530" r="1.5" opacity="0.45" />
        <circle cx="770" cy="545" r="1.5" opacity="0.40" />
        <circle cx="770" cy="560" r="1.5" opacity="0.32" />

        <circle cx="785" cy="455" r="1.5" opacity="0.25" />
        <circle cx="785" cy="470" r="1.5" opacity="0.32" />
        <circle cx="785" cy="485" r="1.5" opacity="0.40" />
        <circle cx="785" cy="500" r="1.5" opacity="0.48" />
        <circle cx="785" cy="515" r="1.5" opacity="0.50" />
        <circle cx="785" cy="530" r="1.5" opacity="0.48" />
        <circle cx="785" cy="545" r="1.5" opacity="0.42" />
        <circle cx="785" cy="560" r="1.5" opacity="0.35" />

        <circle cx="800" cy="455" r="1.5" opacity="0.28" />
        <circle cx="800" cy="470" r="1.5" opacity="0.35" />
        <circle cx="800" cy="485" r="1.5" opacity="0.45" />
        <circle cx="800" cy="500" r="1.5" opacity="0.52" />
        <circle cx="800" cy="515" r="1.5" opacity="0.55" />
        <circle cx="800" cy="530" r="1.5" opacity="0.50" />
        <circle cx="800" cy="545" r="1.5" opacity="0.45" />
        <circle cx="800" cy="560" r="1.5" opacity="0.38" />

        <circle cx="815" cy="455" r="1.5" opacity="0.22" />
        <circle cx="815" cy="470" r="1.5" opacity="0.30" />
        <circle cx="815" cy="485" r="1.5" opacity="0.40" />
        <circle cx="815" cy="500" r="1.5" opacity="0.48" />
        <circle cx="815" cy="515" r="1.5" opacity="0.50" />
        <circle cx="815" cy="530" r="1.5" opacity="0.46" />
        <circle cx="815" cy="545" r="1.5" opacity="0.40" />
        <circle cx="815" cy="560" r="1.5" opacity="0.30" />

        <circle cx="830" cy="470" r="1.5" opacity="0.25" />
        <circle cx="830" cy="485" r="1.5" opacity="0.35" />
        <circle cx="830" cy="500" r="1.5" opacity="0.42" />
        <circle cx="830" cy="515" r="1.5" opacity="0.45" />
        <circle cx="830" cy="530" r="1.5" opacity="0.40" />
        <circle cx="830" cy="545" r="1.5" opacity="0.32" />

        <circle cx="845" cy="485" r="1.5" opacity="0.28" />
        <circle cx="845" cy="500" r="1.5" opacity="0.35" />
        <circle cx="845" cy="515" r="1.5" opacity="0.38" />
        <circle cx="845" cy="530" r="1.5" opacity="0.32" />
      </g>
    </svg>
  );
}

function DynamicNeonCurvesVertical({ palette }: { palette: NeonPalette }) {
  return (
    <svg
      width="576"
      height="1024"
      viewBox="0 0 576 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-[576px] h-[1024px] pointer-events-none z-0"
    >
      <defs>
        <filter id="glowPrimaryV" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" result="blur1" />
          <feGaussianBlur stdDeviation="4" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glowSecondaryV" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" result="blur1" />
          <feGaussianBlur stdDeviation="5" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glowArcV" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" result="blur1" />
          <feGaussianBlur stdDeviation="3" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="gradPrimaryV" x1="576" y1="400" x2="0" y2="950" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.primary} stopOpacity="0.95" />
          <stop offset="50%" stopColor={palette.primary} stopOpacity="0.9" />
          <stop offset="85%" stopColor={palette.primaryEnd} stopOpacity="0.8" />
          <stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
        </linearGradient>

        <linearGradient id="gradSecondaryV" x1="576" y1="520" x2="50" y2="1000" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.9" />
          <stop offset="45%" stopColor={palette.secondary} stopOpacity="0.95" />
          <stop offset="80%" stopColor={palette.secondaryEnd} stopOpacity="0.85" />
          <stop offset="100%" stopColor={palette.secondaryEnd} stopOpacity="0.85" />
        </linearGradient>

        <linearGradient id="gradArcV" x1="576" y1="350" x2="300" y2="650" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.accentArc} stopOpacity="0.85" />
          <stop offset="70%" stopColor={palette.accentArcEnd} stopOpacity="0.9" />
          <stop offset="100%" stopColor={palette.flare} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="576" height="1024" fill="#04060A" />

      {/* Radial atmospheric spotlights */}
      <circle cx="450" cy="620" r="260" fill={palette.spotlight1} opacity="0.13" filter="url(#glowPrimaryV)" />
      <circle cx="200" cy="880" r="220" fill={palette.spotlight2} opacity="0.15" filter="url(#glowSecondaryV)" />

      {/* Filament Background Lines */}
      <g opacity="0.25" strokeWidth="1.2">
        <path d="M 576,380 C 480,450 380,620 280,780 C 200,900 120,980 0,1024" stroke={palette.filament1} fill="none" />
        <path d="M 576,410 C 470,480 360,650 260,800 C 180,910 100,990 0,1024" stroke={palette.filament2} fill="none" />
        <path d="M 576,440 C 450,510 340,680 240,820 C 160,920 80,1000 0,1024" stroke={palette.filament3} fill="none" />
        <path d="M 576,480 C 430,550 320,710 220,850 C 140,940 50,1010 0,1024" stroke={palette.filament5} fill="none" />
        <path d="M 576,520 C 410,590 300,740 200,880 C 120,960 30,1020 0,1024" stroke={palette.filament6} fill="none" />
      </g>

      {/* Arc Ribbon */}
      <path d="M 576,360 C 490,410 400,530 330,680" 
            stroke="url(#gradArcV)" strokeWidth="4.5" fill="none" filter="url(#glowArcV)" />

      {/* Primary Laser Ribbon */}
      <path d="M 576,430 C 440,510 320,690 220,850 C 150,950 80,1000 0,1024" 
            stroke="url(#gradPrimaryV)" strokeWidth="6.5" fill="none" filter="url(#glowPrimaryV)" />
      <path d="M 576,432 C 438,512 318,692 218,852 C 148,952 78,1002 0,1024" 
            stroke={palette.primaryCore} strokeWidth="2" fill="none" opacity="0.9" />

      {/* Secondary Ribbon */}
      <path d="M 576,530 C 420,620 280,780 180,920 C 120,990 60,1020 0,1024" 
            stroke="url(#gradSecondaryV)" strokeWidth="7" fill="none" filter="url(#glowSecondaryV)" />
      <path d="M 576,532 C 418,622 278,782 178,922 C 118,992 58,1022 0,1024" 
            stroke={palette.secondaryCore} strokeWidth="2" fill="none" opacity="0.85" />

      {/* Sparkles */}
      <circle cx="370" cy="620" r="2.5" fill={palette.primary} opacity="0.9" filter="url(#glowPrimaryV)" />
      <circle cx="210" cy="850" r="3" fill={palette.secondary} opacity="0.9" filter="url(#glowSecondaryV)" />
      <circle cx="490" cy="420" r="2" fill={palette.accentArc} opacity="0.8" />

      {/* Dots */}
      <g fill={palette.dotGrid}>
        <circle cx="380" cy="740" r="1.5" opacity="0.25" />
        <circle cx="380" cy="755" r="1.5" opacity="0.30" />
        <circle cx="380" cy="770" r="1.5" opacity="0.35" />
        <circle cx="395" cy="740" r="1.5" opacity="0.30" />
        <circle cx="395" cy="755" r="1.5" opacity="0.40" />
        <circle cx="395" cy="770" r="1.5" opacity="0.45" />
        <circle cx="410" cy="740" r="1.5" opacity="0.35" />
        <circle cx="410" cy="755" r="1.5" opacity="0.45" />
        <circle cx="410" cy="770" r="1.5" opacity="0.50" />
      </g>
    </svg>
  );
}

function SponsorStripRow({
  sponsors,
  logoHeightPx,
  maxStripWidthPx = SPONSOR_STRIP_MAX_W_H1_PX,
}: {
  sponsors: SponsorEntry[];
  logoHeightPx: number;
  maxStripWidthPx?: number;
}) {
  const items = sponsors.slice(0, 5);
  const count = items.length;
  const [opticalPadByKey, setOpticalPadByKey] = useState<Record<string, number>>({});

  const innerBudget = maxStripWidthPx * 0.94;
  const fairShareW = innerBudget / Math.max(count, 1);
  const imgCapPx = Math.max(40, Math.floor(fairShareW * 0.92));

  const onLogoLoad = useCallback(
    (key: string, el: HTMLImageElement) => {
      const nw = el.naturalWidth;
      const nh = el.naturalHeight;
      if (!nw || !nh) return;
      const renderedW = Math.min(imgCapPx, (nw / nh) * logoHeightPx);
      const deficit = Math.max(0, fairShareW - renderedW);
      const pad = Math.min(22, Math.round(deficit * 0.34));
      setOpticalPadByKey((prev) => (prev[key] === pad ? prev : { ...prev, [key]: pad }));
    },
    [fairShareW, imgCapPx, logoHeightPx],
  );

  if (count === 0) return null;

  return (
    <div
      className={`flex h-full w-full max-w-full flex-nowrap items-center ${
        count === 1 ? "justify-start" : "justify-start gap-[28px]"
      }`}
      style={{
        maxWidth: maxStripWidthPx,
      }}
    >
      {items.map((s, i) => {
        const key = `${s.logo_url}-${i}`;
        const pad = opticalPadByKey[key] ?? 0;
        return (
          <div
            key={key}
            className="flex min-h-0 shrink-0 items-center justify-center"
            style={{ paddingInline: pad }}
          >
            <img
              src={s.logo_url}
              alt={s.name?.trim() || "Sponsor"}
              title={s.name?.trim() || undefined}
              className="object-contain"
              crossOrigin="anonymous"
              style={{
                height: logoHeightPx,
                width: "auto",
                maxWidth: imgCapPx,
                maxHeight: logoHeightPx,
              }}
              onLoad={(e) => onLogoLoad(key, e.currentTarget)}
            />
          </div>
        );
      })}
    </div>
  );
}

function filterSponsors(s?: SponsorEntry[] | null): SponsorEntry[] {
  if (!s?.length) return [];
  return s
    .filter((x) => x.logo_url?.trim())
    .filter((x) => {
      const url = String(x.logo_url || "").toLowerCase();
      if (!url) return false;
      if (url.includes("figma.com/api/mcp/asset")) return false;
      return true;
    })
    .slice(0, 5);
}

function DefaultAvatarPlaceholder({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <img src="/card-assets/safar-default-avatar.svg" className={`${className} object-cover bg-slate-900`} alt="Default profile" />
  );
}

function formatSessionTimeWithZone(rawTime?: string) {
  const fallback = "1: 00pm - 2: 00 pm";
  const input = String(rawTime || "").trim();
  if (!input) return fallback;
  return input;
}

function OrganizationBrand({
  name,
  logoUrl,
  iconClassName,
  nameBoxClassName,
  nameTextClassName,
  textColorClassName = "text-white",
  nameTextStyle,
}: {
  name: string;
  logoUrl?: string;
  iconClassName: string;
  nameBoxClassName: string;
  nameTextClassName: string;
  textColorClassName?: string;
  nameTextStyle?: React.CSSProperties;
}) {
  return (
    <>
      <div className={`overflow-hidden rounded-md bg-white/95 ${iconClassName}`}>
        {logoUrl && (!logoUrl.startsWith("data:") || isValidImageDataUrl(logoUrl)) ? (
          <img
            src={logoUrl.startsWith("data:") ? logoUrl : optimizeCdnImageUrl(logoUrl, { width: 128, quality: "auto" })}
            alt={name || "Organization logo"}
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-heading/70">
            {name?.trim()?.slice(0, 2).toUpperCase() || "OR"}
          </div>
        )}
      </div>
      <div className={`flex items-center overflow-hidden ${nameBoxClassName}`}>
        <p className={`m-0 w-full truncate font-extrabold ${textColorClassName} ${nameTextClassName}`} style={nameTextStyle}>{name || "Organization"}</p>
      </div>
    </>
  );
}

type ColorTheme = {
  start: string;
  end: string;
  accent: string;
  textColor?: string;
  titleColor?: string;
  verticalEventTitleColor?: string;
};

const COLOR_THEMES: Record<string, ColorTheme> = {
  purple: {
    start: "#2D1B54",
    end: "#150B2E",
    accent: "#00F0FF",
    textColor: "#FFFFFF",
    titleColor: "#FFFFFF",
    verticalEventTitleColor: "#FFFFFF",
  },
  red: {
    start: "#68132A",
    end: "#2A050E",
    accent: "#FF2E93",
    textColor: "#FFFFFF",
    titleColor: "#FFFFFF",
    verticalEventTitleColor: "#FFFFFF",
  },
  pink: {
    start: "#5B1245",
    end: "#23041A",
    accent: "#FFAEEB",
    textColor: "#FFFFFF",
    titleColor: "#FFFFFF",
    verticalEventTitleColor: "#FFFFFF",
  },
  blue: {
    start: "#0F2952",
    end: "#051124",
    accent: "#00F0FF",
    textColor: "#FFFFFF",
    titleColor: "#FFFFFF",
    verticalEventTitleColor: "#FFFFFF",
  },
  green: {
    start: "#0D3829",
    end: "#031710",
    accent: "#00E676",
    textColor: "#FFFFFF",
    titleColor: "#FFFFFF",
    verticalEventTitleColor: "#FFFFFF",
  },
};

function resolveTheme(color?: string): ColorTheme {
  const raw = String(color || "").trim();
  if (!raw) return COLOR_THEMES.purple;
  if (COLOR_THEMES[raw.toLowerCase()]) return COLOR_THEMES[raw.toLowerCase()];

  const luminance = parseColorLuminance(raw);
  if (luminance === null) {
    return COLOR_THEMES.purple;
  }

  const isLight = luminance >= 0.55;
  return {
    start: raw,
    end: "#04060A",
    accent: isLight ? "#04060A" : "#00F0FF",
    textColor: isLight ? "#0B0B0B" : "#FFFFFF",
    titleColor: isLight ? "#0B0B0B" : "#FFFFFF",
    verticalEventTitleColor: isLight ? "#0B0B0B" : "#FFFFFF",
  };
}

export function CardPreview({
  data,
  preview = false,
  id,
  isVertical = false,
  verticalSide = 1,
  horizontalSide = 1,
}: {
  data: Partial<CardData>;
  preview?: boolean;
  id?: string;
  isVertical?: boolean;
  verticalSide?: 1 | 2;
  horizontalSide?: 1 | 2;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const hasOrganizationBranding = Boolean((data.organizationName || "").trim() || (data.organizationLogoUrl || "").trim());
  const sessionTimeLabel = formatSessionTimeWithZone(data.sessionTime);
  const surfaceMotionClass = preview
    ? ""
    : "animate-fade-in will-change-transform transition-all duration-500 group";

  const theme = resolveTheme(data.color);
  const palette = getNeonPalette(data.color);

  const horizontalTextColorOverride = String(data.horizontalTextColor || "").trim();
  const verticalTextColorOverride = String(data.verticalTextColor || "").trim();
  const horizontalTextColor = horizontalTextColorOverride || (theme.textColor || "#FFFFFF");
  const verticalTextColor = verticalTextColorOverride || (theme.textColor || "#FFFFFF");
  const hasHorizontalTextOverride = Boolean(horizontalTextColorOverride);
  const hasVerticalTextOverride = Boolean(verticalTextColorOverride);
  
  const storedFontKey = String(data.fontFamily || "inter").trim() || "inter";
  const googleFamily = parseGoogleFamilyFromStored(storedFontKey);

  useEffect(() => {
    void preloadGoogleCardFontCss(storedFontKey);
  }, [storedFontKey]);

  const fontMap: Record<string, string> = {
    inter: "var(--font-inter-tight), sans-serif",
    poppins: "var(--font-poppins), sans-serif",
    outfit: "var(--font-outfit), sans-serif",
    times: "'Times New Roman', Times, serif",
  };
  const selectedFont = googleFamily
    ? cssFontStackForGoogleFamily(googleFamily)
    : fontMap[storedFontKey] || fontMap.inter;
  const photoUrl = String(data.photo || "").trim();
  const hasRealPhoto =
    Boolean(photoUrl) &&
    !photoUrl.endsWith("/default-avatar-placeholder.svg") &&
    photoUrl !== "/default-avatar-placeholder.svg" &&
    !photoUrl.endsWith("/safar-default-avatar.svg") &&
    photoUrl !== "/card-assets/safar-default-avatar.svg" &&
    (!photoUrl.startsWith("data:") || isValidImageDataUrl(photoUrl));

  const rawQrInput =
    data.linkedin?.trim() ||
    (typeof data.social_links === "object" && data.social_links?.linkedin?.trim()) ||
    "";
  const cardId = data.id ? String(data.id).trim() : "";
  let finalQrUrl = "";
  if (cardId && isValidUuid(cardId)) {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : getPublicAppUrl();
    finalQrUrl = `${origin.replace(/\/$/, "")}/cards/${encodeURIComponent(cardId)}/scan`;
  } else if (rawQrInput) {
    finalQrUrl = rawQrInput;
  }

  const attendeeName = String(data.name || "").trim();
  const attendeeRole = String(data.role || "").trim();
  const attendeeCompany = String(data.company || "").trim();
  const linkedinUrl = formatAttendeeLinkedInUrl(
    data.linkedin || (typeof data.social_links === "object" ? data.social_links?.linkedin : undefined),
  );

  const validSocials: { platform: SocialPlatform; url: string }[] = [];
  if (linkedinUrl) {
    validSocials.push({ platform: "linkedin", url: linkedinUrl });
  }
  if (data.social_links && typeof data.social_links === "object") {
    const platforms: SocialPlatform[] = [
      "instagram",
      "twitter",
      "github",
      "facebook",
      "tiktok",
      "youtube",
      "website",
    ];
    for (const p of platforms) {
      const u = data.social_links[p];
      if (u && typeof u === "string" && u.trim()) {
        validSocials.push({ platform: p, url: u.trim() });
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    const updateQr = async () => {
      if (!finalQrUrl) {
        if (!cancelled) setQrUrl(null);
        return;
      }
      try {
        const url = await QRCode.toDataURL(finalQrUrl, {
          margin: 1,
          width: 400,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setQrUrl(url);
      } catch {
        if (!cancelled) setQrUrl(null);
      }
    };
    void updateQr();
    return () => {
      cancelled = true;
    };
  }, [finalQrUrl]);

  const customSponsorsList = filterSponsors(data.sponsors);

  // ==========================================
  // VERTICAL CARD LAYOUT (Badge / Batch - 576 x 1024)
  // No QR code on batch
  // ==========================================
  if (isVertical) {
    return (
      <div 
        id={id}
        className={`relative overflow-hidden shadow-2xl bg-[#04060A] ${surfaceMotionClass}`}
        style={{ 
          width: "576px", 
          height: "1024px", 
          fontFamily: selectedFont,
        }}
      >
        {/* Dynamic Neon Curves SVG Artwork with live color theme */}
        <DynamicNeonCurvesVertical palette={palette} />

        {/* Dynamic Atmospheric Spotlight */}
        <div 
          className="absolute left-1/2 top-[550px] h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14] blur-[90px] pointer-events-none mix-blend-screen z-0"
          style={{ background: palette.spotlight1 }}
        />

        {/* Optional Organization Branding Top */}
        {hasOrganizationBranding && (
          <div className="absolute right-[36px] top-[42px] z-20 flex items-center gap-2">
            <OrganizationBrand
              name={data.organizationName || "Organization"}
              logoUrl={data.organizationLogoUrl}
              iconClassName="h-[48px] w-[48px]"
              nameBoxClassName="h-[48px] max-w-[180px]"
              nameTextClassName="text-[24px] leading-none"
              textColorClassName="text-white"
            />
          </div>
        )}

        {/* Top-Left: MEET YOU AT [LOCATION] */}
        <div className="absolute left-[36px] top-[46px] z-10 flex flex-col">
          <p 
            className="m-0 text-[26px] font-extrabold tracking-[0.5px] uppercase leading-none"
            style={{ color: hasVerticalTextOverride ? verticalTextColor : "#FFFFFF" }}
          >
            MEET YOU AT
          </p>
          <h2 
            className="m-0 mt-[6px] text-[46px] font-black tracking-tight uppercase leading-none"
            style={{ color: hasVerticalTextOverride ? verticalTextColor : "#FFFFFF" }}
          >
            {data.location || "NSTP"}
          </h2>
        </div>

        {/* Badge Pill & Event Name Row */}
        <div className="absolute left-[36px] top-[148px] z-10 flex flex-col gap-[12px] max-w-[504px]">
          <div className="flex items-center gap-[12px] flex-wrap">
            <div 
              className="flex items-center justify-center px-[18px] py-[8px] rounded-[6px] shadow-sm shrink-0"
              style={{ 
                backgroundColor: palette.pillBg,
                border: `1px solid ${palette.pillBorder}`,
              }}
            >
              <span className="text-[17px] font-black text-white tracking-[1.5px] uppercase leading-none whitespace-nowrap">
                {data.cardRole === "guest" ? "OUR GUEST AT" : "I'M ATTENDING"}
              </span>
            </div>
          </div>
          <h1 
            className="m-0 text-[28px] font-black tracking-tight uppercase leading-tight text-white"
            style={{ color: hasVerticalTextOverride ? verticalTextColor : "#FFFFFF" }}
          >
            {data.eventName || "SAFAR-E-KARAKORAM"}
            {data.cardRole === "guest" && data.guestCategory && (
              <span className="block text-[18px] font-bold text-cyan-300 uppercase tracking-wide mt-1">
                AS {data.guestCategory}
              </span>
            )}
          </h1>
        </div>

        {/* Date, Time & Tagline */}
        <div className="absolute left-[36px] top-[265px] z-10 flex flex-col">
          <p 
            className="m-0 text-[20px] font-bold leading-tight"
            style={{ color: hasVerticalTextOverride ? verticalTextColor : "#FFFFFF" }}
          >
            {data.sessionDate || "10th September 2026"}
          </p>
          <p className="m-0 mt-[3px] text-[16px] font-normal text-slate-300 leading-tight">
            ({sessionTimeLabel})
          </p>
          <p 
            className="m-0 mt-[14px] text-[18px] font-medium tracking-[1.2px] uppercase leading-none text-white/90"
            style={{ color: hasVerticalTextOverride ? verticalTextColor : undefined }}
          >
            START HERE, GO ANYWHERE
          </p>
        </div>

        {/* Center: Side 1 (Front: Attendee Photo, Info & Socials) / Side 2 (Back: Attendee Info & Pass) */}
        {verticalSide === 1 ? (
          <div className="absolute left-1/2 top-[360px] -translate-x-1/2 z-10 flex flex-col items-center w-[480px]">
            {/* Circular Photo */}
            <div className={`relative flex h-[175px] w-[175px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/20 shadow-2xl ${hasRealPhoto ? "bg-white/10" : "bg-slate-900"}`}>
              {hasRealPhoto ? (
                <img 
                  src={photoUrl} 
                  alt={attendeeName ? `Photo of ${attendeeName}` : "Attendee photo"}
                  className="h-full w-full object-cover" 
                  crossOrigin="anonymous" 
                />
              ) : (
                <DefaultAvatarPlaceholder className="h-full w-full object-cover" />
              )}
            </div>

            {/* Attendee Details */}
            <div className="mt-[20px] flex flex-col items-center text-center w-full px-4">
              <h2 
                className="m-0 text-[32px] font-black leading-[1.15] tracking-tight"
                style={{ color: hasVerticalTextOverride ? verticalTextColor : "#FFFFFF" }}
              >
                {attendeeName || "Attendee"}
              </h2>
              {attendeeRole && (
                <p 
                  className="m-0 mt-[6px] text-[18px] font-bold text-white/90 leading-tight uppercase tracking-wide"
                  style={{ color: hasVerticalTextOverride ? verticalTextColor : undefined }}
                >
                  {attendeeRole}
                </p>
              )}
              {attendeeCompany && (
                <p 
                  className="m-0 mt-[4px] text-[16px] font-normal text-white/75 leading-tight"
                  style={{ color: hasVerticalTextOverride ? verticalTextColor : undefined }}
                >
                  {attendeeCompany}
                </p>
              )}

              {/* Social Links */}
              {validSocials.length > 0 && (
                <div className="mt-[16px] flex items-center justify-center gap-[10px] flex-wrap max-w-[340px]">
                  {validSocials.map(({ platform, url }) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/90 hover:bg-white/25 hover:text-white transition-colors"
                      title={platform}
                    >
                      {getSocialPlatformIcon(platform, "h-[16px] w-[16px]")}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute left-1/2 top-[330px] -translate-x-1/2 z-10 flex flex-col items-center text-center w-[480px] px-6">
            <div className="flex flex-col items-center justify-center p-7 rounded-3xl bg-white/5 border border-white/15 backdrop-blur-md shadow-2xl w-full max-w-[380px]">
              <div 
                className="flex items-center justify-center px-[20px] py-[8px] rounded-[6px] shadow-sm mb-3"
                style={{ 
                  backgroundColor: palette.pillBg,
                  border: `1px solid ${palette.pillBorder}`,
                }}
              >
                <span className="text-[14px] font-black text-white tracking-[2px] uppercase leading-none">
                  OFFICIAL ATTENDEE BADGE
                </span>
              </div>

              {/* Scannable Attendance QR Code (Badge Back Side) */}
              <div className="flex h-[210px] w-[210px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-3 shadow-inner my-2">
                {qrUrl ? (
                  <img src={qrUrl} className="h-full w-full object-contain" alt="Attendance QR Code" crossOrigin="anonymous" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-50 p-2 text-center">
                    <p className="m-0 text-[11px] font-semibold text-slate-500 leading-tight">
                      Generating QR...
                    </p>
                  </div>
                )}
              </div>

              <p className="m-0 mt-[10px] text-[14px] font-bold text-cyan-300 tracking-wide uppercase text-center leading-tight">
                Scan to Connect & Check In
              </p>
              <h2 
                className="m-0 mt-[6px] text-[26px] font-black leading-tight tracking-tight truncate max-w-[340px]"
                style={{ color: hasVerticalTextOverride ? verticalTextColor : "#FFFFFF" }}
              >
                {attendeeName || "Attendee"}
              </h2>
              {attendeeRole && (
                <p className="m-0 mt-[4px] text-[16px] font-bold text-white/90 uppercase tracking-wide truncate max-w-[340px]">
                  {attendeeRole}
                </p>
              )}
              {attendeeCompany && (
                <p className="m-0 mt-[2px] text-[14px] font-normal text-white/75 truncate max-w-[340px]">
                  {attendeeCompany}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bottom: Co-organized by & Logos */}
        <div className="absolute left-1/2 bottom-[32px] -translate-x-1/2 z-10 flex flex-col items-center text-center w-[520px]">
          <p className="m-0 text-[14px] font-normal text-white/80 leading-none mb-[10px]">
            Co-organized by:
          </p>
          {customSponsorsList.length > 0 ? (
            <div className="flex justify-center w-full">
              <SponsorStripRow sponsors={customSponsorsList} logoHeightPx={SPONSOR_LOGO_HEIGHT_V_PX} maxStripWidthPx={SPONSOR_STRIP_MAX_W_V_PX} />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-[24px]">
              <img src="/card-assets/nstp-logo.svg" alt="NSTP Defining Innovation" className="h-[34px] w-auto object-contain" />
              <img src="/card-assets/leap-pakistan-logo.svg" alt="LEAP Pakistan" className="h-[34px] w-auto object-contain" />
              <img src="/card-assets/avtive-white-logo.svg" alt="avtive" className="h-[32px] w-auto object-contain" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // HORIZONTAL CARD LAYOUT (Post Card - 1200 x 628)
  // Strictly Front layout (No Back side, No QR code)
  // ==========================================
  return (
    <div
      id={id}
      key={data.designType || "horizontal-post"}
      className={`relative overflow-hidden shadow-2xl poster bg-[#04060A] ${surfaceMotionClass}`}
      style={{
        width: "1200px",
        height: "628px",
        fontFamily: selectedFont,
      }}
    >
      {/* Dynamic Neon Curves SVG Artwork with live color theme */}
      <DynamicNeonCurvesHorizontal palette={palette} />

      {/* Dynamic Atmospheric Spotlight */}
      <div 
        className="absolute left-[700px] top-[300px] h-[750px] w-[750px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14] blur-[100px] pointer-events-none mix-blend-screen z-0"
        style={{ background: palette.spotlight1 }}
      />

      {/* Optional Organization Branding Top-Right */}
      {hasOrganizationBranding && (
        <div className="absolute right-[64px] top-[48px] z-20 flex items-center gap-3">
          <OrganizationBrand
            name={data.organizationName || "Organization"}
            logoUrl={data.organizationLogoUrl}
            iconClassName="h-[52px] w-[52px]"
            nameBoxClassName="h-[52px] max-w-[200px]"
            nameTextClassName="text-[26px] leading-none"
            textColorClassName="text-white"
          />
        </div>
      )}

      {/* Top-Left: MEET YOU AT [LOCATION] */}
      <div className="absolute left-[64px] top-[54px] z-10 flex flex-col">
        <p 
          className="m-0 text-[32px] font-extrabold tracking-[0.5px] uppercase leading-none"
          style={{ color: hasHorizontalTextOverride ? horizontalTextColor : "#FFFFFF" }}
        >
          MEET YOU AT
        </p>
        <h2 
          className="m-0 mt-[6px] text-[54px] font-black tracking-tight uppercase leading-none"
          style={{ color: hasHorizontalTextOverride ? horizontalTextColor : "#FFFFFF" }}
        >
          {data.location || "NSTP"}
        </h2>
      </div>

      {/* Mid-Left: Badge Pill & Event Name Row */}
      <div className="absolute left-[64px] top-[216px] z-10 flex items-center gap-[20px] max-w-[720px]">
        {/* Badge Pill */}
        <div 
          className="flex items-center justify-center px-[22px] py-[10px] rounded-[6px] shadow-sm shrink-0"
          style={{ 
            backgroundColor: palette.pillBg,
            border: `1px solid ${palette.pillBorder}`,
          }}
        >
          <span className="text-[20px] font-black text-white tracking-[2px] uppercase leading-none whitespace-nowrap">
            {data.cardRole === "guest" ? "OUR GUEST AT" : "I'M ATTENDING"}
          </span>
        </div>

        {/* Event Name */}
        <h1 
          className="m-0 text-[34px] font-black tracking-[0.5px] uppercase leading-none truncate max-w-[480px]"
          style={{ color: hasHorizontalTextOverride ? horizontalTextColor : "#FFFFFF" }}
          title={data.eventName || "SAFAR-E-KARAKORAM"}
        >
          {data.eventName || "SAFAR-E-KARAKORAM"}
          {data.cardRole === "guest" && data.guestCategory && (
            <span className="ml-3 text-[20px] font-bold text-cyan-300 uppercase tracking-wide">
              (AS {data.guestCategory})
            </span>
          )}
        </h1>
      </div>

      {/* Date & Time Block */}
      <div className="absolute left-[64px] top-[338px] z-10 flex flex-col">
        <p 
          className="m-0 text-[23px] font-bold leading-tight"
          style={{ color: hasHorizontalTextOverride ? horizontalTextColor : "#FFFFFF" }}
        >
          {data.sessionDate || "10th September 2026"}
        </p>
        <p className="m-0 mt-[4px] text-[18px] font-normal text-slate-300 leading-tight">
          ({sessionTimeLabel})
        </p>
      </div>

      {/* Tagline */}
      <div className="absolute left-[64px] top-[426px] z-10">
        <p 
          className="m-0 text-[21px] font-medium tracking-[1.5px] uppercase leading-none text-white/95"
          style={{ color: hasHorizontalTextOverride ? horizontalTextColor : undefined }}
        >
          START HERE, GO ANYWHERE
        </p>
      </div>

      {/* Bottom-Left: Co-organized by & Logos */}
      <div className="absolute left-[64px] top-[470px] z-10 flex flex-col">
        <p className="m-0 text-[15px] font-normal text-white/80 leading-none mb-[12px]">
          Co-organized by:
        </p>
        {customSponsorsList.length > 0 ? (
          <SponsorStripRow sponsors={customSponsorsList} logoHeightPx={SPONSOR_LOGO_HEIGHT_H1_PX} maxStripWidthPx={SPONSOR_STRIP_MAX_W_H1_PX} />
        ) : (
          <div className="flex items-center gap-[28px]">
            <img src="/card-assets/nstp-logo.svg" alt="NSTP Defining Innovation" className="h-[40px] w-auto object-contain" />
            <img src="/card-assets/leap-pakistan-logo.svg" alt="LEAP Pakistan" className="h-[40px] w-auto object-contain" />
            <img src="/card-assets/avtive-white-logo.svg" alt="avtive" className="h-[38px] w-auto object-contain" />
          </div>
        )}
      </div>

      {/* Right Section: Attendee Photo, Name, Role, Company, Socials (Strictly Front - NO QR) */}
      <div className="absolute right-[80px] top-[100px] z-10 flex flex-col items-center text-center w-[360px]">
        {/* Circular Avatar */}
        <div className={`relative flex h-[200px] w-[200px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/20 shadow-2xl ${hasRealPhoto ? "bg-white/10" : "bg-slate-900"}`}>
          {hasRealPhoto ? (
            <img
              src={photoUrl}
              alt={attendeeName ? `Photo of ${attendeeName}` : "Attendee photo"}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <DefaultAvatarPlaceholder className="h-full w-full object-cover" />
          )}
        </div>

        {/* Attendee Details */}
        <div className="mt-[18px] flex flex-col items-center text-center w-full px-2">
          <h2 
            className="m-0 text-[32px] font-black leading-[1.15] tracking-tight truncate max-w-[340px]"
            style={{ color: hasHorizontalTextOverride ? horizontalTextColor : "#FFFFFF" }}
            title={attendeeName || "Attendee"}
          >
            {attendeeName || "Attendee"}
          </h2>
          {attendeeRole && (
            <p 
              className="m-0 mt-[6px] text-[19px] font-bold text-white/90 leading-tight uppercase tracking-wide truncate max-w-[340px]"
              style={{ color: hasHorizontalTextOverride ? horizontalTextColor : undefined }}
            >
              {attendeeRole}
            </p>
          )}
          {attendeeCompany && (
            <p 
              className="m-0 mt-[4px] text-[17px] font-normal text-white/75 leading-tight truncate max-w-[340px]"
              style={{ color: hasHorizontalTextOverride ? horizontalTextColor : undefined }}
            >
              {attendeeCompany}
            </p>
          )}

          {/* Social Icons Row */}
          {validSocials.length > 0 && (
            <div className="mt-[14px] flex items-center justify-center gap-[10px] flex-wrap max-w-[300px]">
              {validSocials.map(({ platform, url }) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/90 hover:bg-white/25 hover:text-white transition-colors"
                  title={platform}
                >
                  {getSocialPlatformIcon(platform, "h-[16px] w-[16px]")}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
