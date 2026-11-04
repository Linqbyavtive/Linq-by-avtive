"use client";

import * as React from "react";

/**
 * Linq Minimal String Tie Footer
 * 
 * An interactive, minimalist envelope-styled footer adapted for Linq:
 * - White paper flap (#FFFFFF) with rounded envelope contours
 * - Soft lavender body (#F3EDFF)
 * - Dark slate typography (#302544)
 * - Violet accents (#7546C8) and string (#8B5CF6)
 * - Rotating grommet buttons with interactive tying / untying cord simulation
 * - Hidden note revealed upon opening: "A simpler way to bring organizations, events and people together. "
 * - Minimal clean navigation, social links, and attribution.
 */

// #region string math & simulation
export type Pt = { x: number; y: number };

export const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const round = (v: number): number => Math.round(v * 100) / 100;

export const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

export const polyLength = (pts: Pt[]): number => {
  let l = 0;
  for (let i = 1; i < pts.length; i++) {
    l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return l;
};

export const resample = (pts: Pt[], n: number): Pt[] => {
  const segs = Math.max(1, Math.floor(n) || 1);
  if (!pts.length) return [];
  if (pts.length === 1) return Array.from({ length: segs + 1 }, () => ({ ...pts[0] }));
  const total = polyLength(pts);
  const out: Pt[] = [{ ...pts[0] }];
  let j = 1;
  let acc = 0;
  for (let i = 1; i < segs; i++) {
    const want = (total * i) / segs;
    while (j < pts.length - 1 && acc + Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y) < want) {
      acc += Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
      j++;
    }
    const a = pts[j - 1];
    const b = pts[j];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = Math.min(1, Math.max(0, (want - acc) / l));
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  out.push({ ...pts[pts.length - 1] });
  return out;
};

export const tiePath = (top: Pt, bottom: Pt, rho: number, tail: number, step: number = 4): Pt[] => {
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;
  const D = Math.hypot(dx, dy) || 1;
  const u = { x: dx / D, y: dy / D };
  const v = { x: u.y, y: -u.x };
  const r = Math.max(1, Math.min(rho, D * 0.42));
  const at = (c: Pt, rad: number, th: number): Pt => ({
    x: c.x + rad * (Math.cos(th) * u.x + Math.sin(th) * v.x),
    y: c.y + rad * (Math.cos(th) * u.y + Math.sin(th) * v.y),
  });
  const pts: Pt[] = [{ ...bottom }];
  const arc = (c: Pt, rad: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * rad) / step));
    for (let i = 1; i <= n; i++) pts.push(at(c, rad, a0 + ((a1 - a0) * i) / n));
  };
  const line = (b: Pt) => {
    const a = pts[pts.length - 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let i = 1; i <= n; i++) pts.push({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n });
  };
  const tan = (rad: number) => Math.acos(Math.min(1, rad / (D / 2)));
  const PI = Math.PI;
  const r1 = r;
  const r2 = r * 1.16;
  const a1 = tan(r1);
  const a2 = tan(r2);
  line(at(bottom, r1, -PI / 2));
  arc(bottom, r1, -PI / 2, PI - a1);
  line(at(top, r1, -a1));
  arc(top, r1, -a1, a1 - 2 * PI);
  line(at(bottom, r2, -PI + a2));
  arc(bottom, r2, -PI + a2, PI - a2);
  line(at(top, r2, -a2));
  arc(top, r2, -a2, -1.25 * PI);
  const end = pts[pts.length - 1];
  const out = at(top, r2 + tail * 0.5, -1.32 * PI);
  const tip = { x: out.x + (v.x * 0.85 - u.x * 0.35) * tail * 0.6, y: out.y + (v.y * 0.85 - u.y * 0.35) * tail * 0.6 };
  const n = Math.max(2, Math.ceil(tail / step));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const m = 1 - t;
    pts.push({
      x: m * m * end.x + 2 * m * t * out.x + t * t * tip.x,
      y: m * m * end.y + 2 * m * t * out.y + t * t * tip.y,
    });
  }
  return pts;
};

export type Box = { left: number; top: number; right: number; bottom: number };

export const restPath = (
  anchor: Pt,
  length: number,
  size: number,
  box: Box,
  angle: number = 1.05,
  seed: number = 1,
  step: number = 3
): Pt[] => {
  const pts: Pt[] = [{ ...anchor }];
  const L = Math.max(0, length);
  const b = size * 0.75;
  const a = size * 0.26;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const clampIn = (p: Pt): Pt => ({
    x: Math.min(box.right, Math.max(box.left, p.x)),
    y: Math.min(box.bottom, Math.max(box.top, p.y)),
  });
  let t = 0;
  let len = 0;
  let prev: Pt = { ...anchor };
  let guard = 0;
  while (len < L && guard++ < 20000) {
    t += step / Math.max(1, Math.hypot(a, b));
    const wob = 1 + (hash(Math.floor(t / 6.283) * 3.1 + seed) - 0.5) * 0.5;
    const bend = Math.sin(t * 0.18 + seed) * 0.28;
    const lx = a * t - b * wob * Math.sin(t);
    const ly = b * wob * (1 - Math.cos(t)) * 0.8;
    const cb = Math.cos(bend);
    const sb = Math.sin(bend);
    const rx = lx * cb - ly * sb;
    const ry = lx * sb + ly * cb;
    const p = clampIn({ x: anchor.x + rx * c - ry * s, y: anchor.y + rx * s + ry * c });
    const d = Math.hypot(p.x - prev.x, p.y - prev.y);
    if (d < 0.01) continue;
    if (len + d > L) {
      const k = (L - len) / d;
      pts.push({ x: prev.x + (p.x - prev.x) * k, y: prev.y + (p.y - prev.y) * k });
      len = L;
      break;
    }
    pts.push(p);
    len += d;
    prev = p;
  }
  while (len < L - 0.01 && guard++ < 40000) {
    const p = clampIn({ x: prev.x - Math.min(step, L - len), y: prev.y });
    const d = Math.hypot(p.x - prev.x, p.y - prev.y);
    if (d < 0.01) break;
    pts.push(p);
    len += d;
    prev = p;
  }
  return pts;
};

export const smoothPath = (xs: ArrayLike<number>, ys: ArrayLike<number>): string => {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return "";
  let d = "M" + round(xs[0]) + " " + round(ys[0]);
  for (let i = 1; i < n - 1; i++) {
    d += "Q" + round(xs[i]) + " " + round(ys[i]) + " " + round((xs[i] + xs[i + 1]) / 2) + " " + round((ys[i] + ys[i + 1]) / 2);
  }
  return d + "L" + round(xs[n - 1]) + " " + round(ys[n - 1]);
};

export const scrollProgress = (top: number, height: number, viewport: number): number => {
  if (!(viewport > 0) || !Number.isFinite(top)) return 1;
  const span = Math.max(1, Math.min(Number.isFinite(height) && height > 0 ? height : viewport, viewport) * 0.7);
  return clamp01((viewport - top) / span);
};

export const stepWind = (wind: number, target: number, dt: number, rate: number): number => {
  const want = (target - wind) * (1 - Math.exp(-Math.max(0, dt) * 5));
  const cap = Math.max(0, rate) * Math.max(0, dt);
  const next = wind + Math.max(-cap, Math.min(cap, want));
  return Math.abs(target - next) < 0.0005 ? target : clamp01(next);
};

export type Rope = {
  x: Float64Array;
  y: Float64Array;
  px: Float64Array;
  py: Float64Array;
  seg: number;
};

export const makeRope = (pts: Pt[]): Rope => {
  const n = pts.length;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  pts.forEach((p, i) => {
    x[i] = p.x;
    y[i] = p.y;
  });
  return { x, y, px: Float64Array.from(x), py: Float64Array.from(y), seg: n > 1 ? polyLength(pts) / (n - 1) : 0 };
};

export const stepRope = (
  r: Rope,
  tied: Pt[],
  rest: Pt[],
  locked: number,
  attract: number,
  drag: { i: number; x: number; y: number } | null = null,
  iterations: number = 12
): void => {
  const n = r.x.length;
  const lockN = Math.max(1, Math.min(n, Math.floor(locked)));
  const pinned = (i: number) => i < lockN || (drag !== null && drag.i === i);
  for (let i = 0; i < n; i++) {
    if (drag && drag.i === i) {
      r.px[i] = r.x[i];
      r.py[i] = r.y[i];
      r.x[i] = drag.x;
      r.y[i] = drag.y;
    } else if (i < lockN) {
      const t = tied[i];
      r.px[i] = r.x[i];
      r.py[i] = r.y[i];
      if (t) {
        const k = i === 0 ? 1 : 0.24;
        r.x[i] += (t.x - r.x[i]) * k;
        r.y[i] += (t.y - r.y[i]) * k;
      }
    } else {
      const vx = (r.x[i] - r.px[i]) * 0.9;
      const vy = (r.y[i] - r.py[i]) * 0.9;
      r.px[i] = r.x[i];
      r.py[i] = r.y[i];
      r.x[i] += vx;
      r.y[i] += vy;
      const q = rest[i];
      if (q && attract > 0) {
        r.x[i] += (q.x - r.x[i]) * attract;
        r.y[i] += (q.y - r.y[i]) * attract;
      }
    }
  }
  const seg = r.seg;
  for (let k = 0; k < iterations; k++) {
    for (let i = 0; i < n - 1; i++) {
      const a = pinned(i);
      const b = pinned(i + 1);
      if (a && b) continue;
      const dx = r.x[i + 1] - r.x[i];
      const dy = r.y[i + 1] - r.y[i];
      const d = Math.hypot(dx, dy) || 1e-6;
      const diff = (d - seg) / d;
      if (a) {
        r.x[i + 1] -= dx * diff;
        r.y[i + 1] -= dy * diff;
      } else if (b) {
        r.x[i] += dx * diff;
        r.y[i] += dy * diff;
      } else {
        r.x[i] += dx * diff * 0.5;
        r.y[i] += dy * diff * 0.5;
        r.x[i + 1] -= dx * diff * 0.5;
        r.y[i + 1] -= dy * diff * 0.5;
      }
    }
  }
};

export const nearestFree = (r: Rope, x: number, y: number, locked: number, reach: number): number => {
  let best = -1;
  let bd = reach * reach;
  for (let i = Math.max(1, Math.floor(locked)); i < r.x.length; i++) {
    const d = (r.x[i] - x) ** 2 + (r.y[i] - y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
};
// #endregion

// ── Linq Button Face (Metallic Violet & Lavender Grommet) ──
function ButtonFace({ uid, accent = "#7546C8" }: { uid: string; accent?: string }) {
  return (
    <svg viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      <defs>
        <filter id={uid + "p"} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="7" result="n" />
          <feDiffuseLighting in="n" surfaceScale="1.4" diffuseConstant="1.05" lightingColor="#fff" result="l">
            <feDistantLight azimuth="235" elevation="56" />
          </feDiffuseLighting>
          <feComposite in="l" in2="SourceGraphic" operator="arithmetic" k1="0.62" k2="0" k3="0.44" k4="0" result="m" />
          <feComposite in="m" in2="SourceAlpha" operator="in" />
        </filter>
        <linearGradient id={uid + "m"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EDE9FE" />
          <stop offset="30%" stopColor="#A78BFA" />
          <stop offset="55%" stopColor="#302544" />
          <stop offset="80%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id={uid + "n"} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#DDD6FE" />
          <stop offset="45%" stopColor="#5B21B6" />
          <stop offset="100%" stopColor="#302544" />
        </linearGradient>
        <mask id={uid + "h"}>
          <rect x="-100" y="-100" width="200" height="200" fill="#fff" />
          <circle r="12.5" fill="#000" />
        </mask>
      </defs>
      <g mask={"url(#" + uid + "h)"}>
        {/* Violet paper button base */}
        <circle r="95" fill={accent} filter={"url(#" + uid + "p)"} />
        {/* Pressed ring around grommet */}
        <circle r="33" fill="none" stroke="rgba(48,37,68,0.2)" strokeWidth="3.5" />
        <circle r="35.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <circle r="26" fill={"url(#" + uid + "m)"} />
        <circle r="26" fill="none" stroke="rgba(48,37,68,0.45)" strokeWidth="1" />
        <circle r="18.5" fill={"url(#" + uid + "n)"} />
        <circle r="13" fill="none" stroke="#302544" strokeWidth="2.2" />
      </g>
    </svg>
  );
}

function ButtonGloss({ uid }: { uid: string }) {
  return (
    <svg className="stt-gloss" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={uid + "g"} cx=".32" cy=".26" r=".85">
          <stop offset="0%" stopColor="#fff" stopOpacity=".3" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#302544" stopOpacity=".2" />
        </radialGradient>
        <mask id={uid + "k"}>
          <rect x="-100" y="-100" width="200" height="200" fill="#fff" />
          <circle r="12.5" fill="#000" />
        </mask>
      </defs>
      <g mask={"url(#" + uid + "k)"}>
        <circle r="95" fill={"url(#" + uid + "g)"} />
        <circle r="94" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4" />
        <path d="M-17 -12A21 21 0 0 1 -3 -21" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M14 15A21 21 0 0 1 3 21" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const ArrowIcon = () => (
  <svg viewBox="0 0 12 12" className="inline-block size-3 transition-transform" aria-hidden="true" focusable="false">
    <path d="M2.5 9.5L9.5 2.5M4 2.5H9.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── 2 Minimal Illustrated Characters (Open Peeps minimal line art style) ──
function MinimalCharacterLeft() {
  return (
    <svg
      viewBox="0 0 70 100"
      className="pointer-events-none absolute bottom-4 left-4 sm:left-12 h-20 sm:h-24 w-auto opacity-70 select-none hidden md:block"
      fill="none"
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="35" cy="22" r="14" stroke="#302544" strokeWidth="2" fill="#FFFFFF" />
      {/* Hair loop */}
      <path d="M 22 20 Q 32 10 48 20" stroke="#7546C8" strokeWidth="2.5" strokeLinecap="round" />
      {/* Eyes & smile */}
      <circle cx="31" cy="23" r="1.5" fill="#302544" />
      <circle cx="39" cy="23" r="1.5" fill="#302544" />
      <path d="M 32 29 Q 35 32 38 29" stroke="#302544" strokeWidth="1.5" strokeLinecap="round" />
      {/* Body / Torso */}
      <path d="M 24 38 Q 35 34 46 38 L 49 76 L 21 76 Z" stroke="#302544" strokeWidth="2" fill="#F3EDFF" />
      {/* Attendee ID Badge / Card */}
      <rect x="30" y="44" width="12" height="15" rx="2" stroke="#7546C8" strokeWidth="1.5" fill="#FFFFFF" />
      <line x1="33" y1="48" x2="39" y2="48" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="36" cy="54" r="1.5" fill="#7546C8" />
      {/* Legs */}
      <line x1="28" y1="76" x2="28" y2="95" stroke="#302544" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="76" x2="42" y2="95" stroke="#302544" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MinimalCharacterRight() {
  return (
    <svg
      viewBox="0 0 70 100"
      className="pointer-events-none absolute bottom-4 right-4 sm:right-12 h-20 sm:h-24 w-auto opacity-70 select-none hidden md:block"
      fill="none"
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="35" cy="22" r="14" stroke="#302544" strokeWidth="2" fill="#FFFFFF" />
      {/* Glasses */}
      <rect x="25" y="19" width="8" height="6" rx="2" stroke="#7546C8" strokeWidth="1.5" fill="none" />
      <rect x="37" y="19" width="8" height="6" rx="2" stroke="#7546C8" strokeWidth="1.5" fill="none" />
      <line x1="33" y1="22" x2="37" y2="22" stroke="#7546C8" strokeWidth="1.5" />
      {/* Smile */}
      <path d="M 32 29 Q 35 32 38 29" stroke="#302544" strokeWidth="1.5" strokeLinecap="round" />
      {/* Torso */}
      <path d="M 22 38 Q 35 34 48 38 L 47 76 L 23 76 Z" stroke="#302544" strokeWidth="2" fill="#FAF5FF" />
      {/* Waving Arm */}
      <path d="M 46 42 Q 58 35 56 22" stroke="#302544" strokeWidth="2" strokeLinecap="round" />
      <circle cx="56" cy="20" r="3" fill="#EDE9FE" stroke="#7546C8" strokeWidth="1.5" />
      {/* Legs */}
      <line x1="28" y1="76" x2="28" y2="95" stroke="#302544" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="76" x2="42" y2="95" stroke="#302544" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── 3–4 Small Violet Doodles ──
function VioletDoodles() {
  return (
    <>
      {/* Doodle 1: Sparkle / Star near Wordmark */}
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-8 top-12 size-6 text-violet-500/40 select-none"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M 12 0 Q 12 12 24 12 Q 12 12 12 24 Q 12 12 0 12 Q 12 12 12 0 Z" />
      </svg>
      {/* Doodle 2: Small loop connection doodle */}
      <svg
        viewBox="0 0 32 20"
        className="pointer-events-none absolute right-12 top-10 w-8 h-5 text-violet-400/50 select-none hidden sm:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M 4 10 C 4 4 12 4 16 10 C 20 16 28 16 28 10" />
      </svg>
      {/* Doodle 3: Gentle arrow hint */}
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-1/4 top-1/2 -translate-y-4 size-5 text-violet-600/30 select-none hidden lg:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M 6 18 Q 14 16 17 8 M 12 7 L 18 7 L 18 13" />
      </svg>
    </>
  );
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const EASE = "cubic-bezier(.22,1,.36,1)";

const CSS =
  ".stt{position:relative;isolation:isolate;overflow:hidden;overflow:clip;container-type:inline-size;width:100%;box-sizing:border-box;background:var(--stt-body-bg);color:var(--stt-ink);font-family:var(--stt-sans);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}" +
  ":where(.stt) *,:where(.stt) *::before,:where(.stt) *::after{box-sizing:border-box}" +
  ":where(.stt) button{appearance:none;background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer}" +
  ":where(.stt) a{color:inherit;text-decoration:none}" +
  ":where(.stt) h2,:where(.stt) p{margin:0}" +
  ".stt :focus-visible{outline:2px solid var(--stt-accent);outline-offset:4px;border-radius:4px}" +
  ".stt-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}" +
  ".stt-frame{--r:clamp(40px,6.2cqw,76px);--fold:0px;--R:clamp(32px,8cqw,120px);position:relative;display:flex;flex-direction:column;min-height:var(--stt-h)}" +
  ".stt.is-open .stt-frame{--fold:calc(var(--r) * 2.46)}" +
  // The Envelope Flap (White paper with rounded envelope bottom)
  ".stt-flapwrap{position:relative;z-index:3;pointer-events:none;filter:drop-shadow(0 calc(var(--r) * .12) calc(var(--r) * .2) rgba(117,70,200,.14)) drop-shadow(0 4px 12px rgba(48,37,68,.08))}" +
  ".stt-flap{position:relative;pointer-events:auto;background:var(--stt-paper);color:var(--stt-ink);clip-path:inset(0 0 var(--fold) 0 round 0 0 var(--R) var(--R));transition:clip-path .85s " + EASE + ";padding:clamp(24px,4cqw,48px) clamp(16px,6cqw,96px) 0}" +
  ".stt-flap::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:" + GRAIN + ";background-size:220px;opacity:calc(var(--stt-grain) * .6);mix-blend-mode:soft-light}" +
  ".stt-crease{position:absolute;left:0;right:0;bottom:var(--fold);height:calc(var(--r) * .5);pointer-events:none;background:linear-gradient(to top,rgba(117,70,200,.1),transparent);opacity:0;transition:opacity .5s,bottom .85s " + EASE + "}" +
  ".stt.is-open .stt-crease{opacity:1}" +
  ".stt-meta{position:relative;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:clamp(11px,1.3cqw,15px);letter-spacing:.02em;font-weight:600;color:#746D80}" +
  ".stt-meta span{opacity:0;transform:translateY(-6px);transition:opacity .8s,transform .8s " + EASE + "}" +
  ".stt-meta span:nth-child(2){transition-delay:.08s}.stt-meta span:nth-child(3){transition-delay:.16s}" +
  ".stt.is-in .stt-meta span{opacity:1;transform:none}" +
  ".stt-head{position:relative;display:flex;flex-direction:column;align-items:center;margin-top:clamp(20px,4.5cqw,48px)}" +
  ".stt-title{font-family:var(--stt-display);font-weight:800;font-size:clamp(54px,11.5cqw,140px);line-height:.95;letter-spacing:-.045em;white-space:nowrap;text-align:center;clip-path:inset(-.25em -.4em -.02em -.4em);color:#27213A}" +
  ".stt-ch{display:inline-block;transform:translateY(105%);transition:transform 1.1s " + EASE + ";transition-delay:calc(.12s + var(--i) * .045s)}" +
  ".stt.is-in .stt-ch{transform:none}" +
  ".stt.is-in .stt-title:hover .stt-ch{transition:transform .5s " + EASE + "}" +
  ".stt.is-in .stt-title .stt-ch:hover{transform:translateY(-.045em);color:var(--stt-accent)}" +
  ".stt-tapes{position:relative;display:flex;flex-direction:column;align-items:center;margin-top:clamp(12px,1.8cqw,24px);font-family:var(--stt-sans);font-size:clamp(15px,2.4cqw,26px);font-weight:600;line-height:1.15;letter-spacing:-.02em}" +
  ".stt-tape{position:relative;display:inline-block;padding:.18em .6em .22em;white-space:nowrap;clip-path:inset(-20% 100% -20% 0);transition:clip-path .75s " + EASE + ",transform .5s " + EASE + "}" +
  ".stt-tape::before{content:'';position:absolute;inset:0;z-index:-1;background:var(--tb);clip-path:polygon(0 4%,1.2% 0,98.6% 3%,100% 0,99.2% 30%,100% 58%,98.8% 100%,1.6% 97%,0 100%,.9% 64%,0 34%);box-shadow:0 2px 8px rgba(117,70,200,.15);transition:filter .4s}" +
  ".stt-tape span{position:relative;color:var(--tc)}" +
  ".stt-tape-a{--tb:var(--stt-accent);--tc:#FFFFFF;transform:rotate(-1.4deg) translateX(-.2em);transition-delay:.75s,0s}" +
  ".stt-tape-b{--tb:#302544;--tc:#F3EDFF;margin-top:.15em;transform:rotate(.6deg) translateX(.15em);transition-delay:.95s,0s}" +
  ".stt.is-in .stt-tape{clip-path:inset(-20% -2% -20% -2%)}" +
  ".stt-tape:hover{transition-delay:0s,0s}" +
  ".stt-tape-a:hover{transform:rotate(-2.5deg) translate(-.24em,-.06em)}" +
  ".stt-tape-b:hover{transform:rotate(1.8deg) translate(.16em,-.05em)}" +
  ".stt-dock{position:relative;height:calc(var(--r) * 2.62);display:flex;justify-content:center;align-items:flex-end;padding-bottom:calc(var(--r) * .22)}" +
  // The Rotating Buttons
  ".stt-btn{position:relative;display:block;width:calc(var(--r) * 2);height:calc(var(--r) * 2);border-radius:50%;filter:drop-shadow(0 calc(var(--r) * .08) calc(var(--r) * .12) rgba(117,70,200,.24)) drop-shadow(0 2px 4px rgba(48,37,68,.16));transition:transform .45s " + EASE + ",filter .45s " + EASE + ";-webkit-tap-highlight-color:transparent}" +
  ".stt-btn:hover{transform:translateY(-3px) scale(1.03);filter:drop-shadow(0 calc(var(--r) * .14) calc(var(--r) * .18) rgba(117,70,200,.32)) drop-shadow(0 2px 6px rgba(48,37,68,.2))}" +
  ".stt-btn:active{transform:translateY(0) scale(.97);transition-duration:.12s}" +
  ".stt-btn:focus-visible{outline-offset:6px;border-radius:50%}" +
  ".stt-spin{display:block;width:100%;height:100%;will-change:transform}" +
  ".stt-btn svg{display:block;width:100%;height:100%;max-width:none;overflow:visible}" +
  ".stt-gloss{position:absolute;inset:0;pointer-events:none}" +
  ".stt-btn-top{transition:transform .45s " + EASE + ",filter .45s " + EASE + ",opacity .4s}" +
  ".stt.is-open .stt-btn-top{opacity:0;pointer-events:none}" +
  // The Envelope Body (Soft Lavender)
  ".stt-body{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;color:var(--stt-body-ink);background:var(--stt-body-bg)}" +
  ".stt-panel{position:absolute;inset:0;z-index:2;background:var(--stt-body-bg)}" +
  ".stt-panel::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:" + GRAIN + ";background-size:220px;opacity:calc(var(--stt-grain) * .5);mix-blend-mode:multiply}" +
  ".stt-dock-b{position:relative;z-index:4;height:calc(var(--r) * 2.62);display:flex;justify-content:center;align-items:flex-start;padding-top:calc(var(--r) * .22)}" +
  ".stt-content{position:relative;z-index:3;flex:1;display:flex;flex-direction:column;gap:36px;padding:clamp(20px,3.5cqw,48px) clamp(20px,6cqw,80px) clamp(28px,4.5cqw,56px);max-width:1100px;margin:0 auto;width:100%}" +
  // Sliding Note inside the Envelope
  ".stt-letter{position:absolute;z-index:1;left:50%;bottom:calc(100% - var(--tuck));--tuck:clamp(30px,4cqw,54px);width:min(660px,calc(100% - 32px));height:calc(var(--r) * 2.46 - var(--r) * .14 + var(--tuck));transform:translate(-50%,calc(var(--r) * 1.2));transition:transform .7s " + EASE + ";background:#FFFFFF;color:var(--stt-ink);border-radius:16px 16px 0 0;box-shadow:0 -2px 0 rgba(117,70,200,.08),0 16px 40px rgba(117,70,200,.18);border:1px solid #EDE9FE;border-bottom:none;padding:clamp(16px,2.2cqw,28px) clamp(20px,3cqw,40px) var(--tuck);display:flex;flex-direction:column;justify-content:center;gap:clamp(6px,1cqw,12px);overflow:hidden}" +
  ".stt-letter::before{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(transparent 0 calc(1.8em - 1px),rgba(117,70,200,.05) calc(1.8em - 1px) 1.8em);opacity:.9}" +
  ".stt-letter::after{content:'';position:absolute;inset:0;pointer-events:none;background-image:" + GRAIN + ";background-size:220px;opacity:calc(var(--stt-grain) * .6);mix-blend-mode:soft-light}" +
  ".stt.is-open .stt-letter{transform:translate(-50%,0);transition:transform .9s .3s " + EASE + "}" +
  ".stt-letter>*{position:relative;z-index:1}" +
  ".stt-letter>.stt-stamp{position:absolute;right:clamp(12px,2cqw,28px);top:clamp(10px,1.6cqw,22px);width:clamp(84px,10cqw,120px);height:auto;max-width:none;overflow:visible;color:var(--stt-accent);opacity:.75;transform:rotate(-7deg);fill:none;stroke:currentColor;stroke-width:1.4}" +
  ".stt-stamp text{fill:currentColor;stroke:none;font-family:var(--stt-sans);font-size:7px;font-weight:700;letter-spacing:.08em;text-anchor:middle}" +
  ".stt-note-k{font-size:clamp(10px,1.05cqw,12px);letter-spacing:.16em;text-transform:uppercase;color:var(--stt-accent);font-weight:700}" +
  ".stt-note-t{font-family:var(--stt-sans);font-weight:500;font-size:clamp(14px,1.8cqw,20px);line-height:1.4;letter-spacing:-.015em;max-width:28em;color:#302544}" +
  ".stt-note-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;font-size:clamp(12px,1.2cqw,14px);margin-top:4px}" +
  ".stt-cta{display:inline-flex;align-items:center;gap:.5em;padding:.55em 1.25em;border-radius:99px;background:var(--stt-accent);color:#FFFFFF;font-weight:600;box-shadow:0 4px 14px rgba(117,70,200,.25);transition:background .3s,transform .3s " + EASE + "}" +
  ".stt-cta:hover{background:#5B21B6;transform:translateY(-1px)}" +
  ".stt-ghost{font-weight:600;color:#7546C8;text-decoration:underline;text-underline-offset:3px;transition:opacity .2s;cursor:pointer}" +
  ".stt-ghost:hover{color:#5B21B6}" +
  // The Interactive Cord (Violet/Purple)
  ".stt-cord{position:absolute;left:0;top:0;z-index:5;overflow:visible;max-width:none;pointer-events:none}" +
  ".stt-cord path{fill:none;stroke-linecap:round;stroke-linejoin:round}" +
  ".stt-cord .stt-hit{stroke:transparent;stroke-width:22px;pointer-events:none;cursor:grab;touch-action:none}" +
  ".stt-cord.is-loose .stt-hit{pointer-events:stroke}" +
  ".stt-cord.is-drag .stt-hit{cursor:grabbing}" +
  "@media (prefers-reduced-motion: reduce){" +
  ".stt *,.stt *::before{transition-duration:.01s !important;transition-delay:0s !important}" +
  ".stt-ch,.stt-meta span{transform:none}" +
  "}";

const SEGMENTS = 96;

export interface MinimalNavColumn {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

export interface StringTieFooterProps {
  logo?: React.ReactNode;
  meta?: string[];
  title?: string;
  titleAccent?: string;
  tapes?: string[];
  noteMessage?: string;
  noteCta?: { label: string; href: string };
  columns?: MinimalNavColumn[];
  socialLinks?: {
    linkedin?: string;
    instagram?: string;
  };
  copyright?: string;
  attribution?: React.ReactNode;
  height?: string;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
}

export default function StringTieFooter({
  logo,
  meta = [],
  title = "Linq",
  tapes = [],
  noteMessage = "A simpler way to bring organizations, events and people together.",
  noteCta = {
    label: "Register organization",
    href: "https://linq.avtive.app/organization/register",
  },
  columns = [
    {
      title: "Platform",
      links: [
        { label: "Overview", href: "#overview" },
        { label: "How it works", href: "#how-it-works" },
        { label: "Features", href: "#features" },
      ],
    },
    {
      title: "Organization",
      links: [
        { label: "Register organization", href: "https://linq.avtive.app/organization/register", external: true },
        { label: "Log in", href: "https://linq.avtive.app/login", external: true },
        { label: "Avtive", href: "https://www.avtive.app", external: true },
      ],
    },
  ],
  socialLinks = {
    linkedin: "https://www.linkedin.com/company/linqavtive/posts/?viewAsMember=true",
    instagram: "https://www.instagram.com/linq.me/?utm_source=ig_web_button_share_sheet",
  },
  copyright = `© ${new Date().getFullYear()} Avtive. All rights reserved.`,
  attribution,
  height = "auto",
  defaultOpen = false,
  onToggle,
  className = "",
}: StringTieFooterProps) {
  const uid = "stt" + React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const rootRef = React.useRef<HTMLElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const topRef = React.useRef<HTMLButtonElement>(null);
  const botRef = React.useRef<HTMLButtonElement>(null);
  const spinTopRef = React.useRef<HTMLSpanElement>(null);
  const spinBotRef = React.useRef<HTMLSpanElement>(null);
  const flapRef = React.useRef<HTMLDivElement>(null);
  const letterRef = React.useRef<HTMLDivElement>(null);
  const cordRef = React.useRef<SVGSVGElement>(null);
  const shadowRef = React.useRef<SVGPathElement>(null);
  const bodyRef = React.useRef<SVGPathElement>(null);
  const twistRef = React.useRef<SVGPathElement>(null);
  const hitRef = React.useRef<SVGPathElement>(null);
  const tipRef = React.useRef<SVGLineElement>(null);

  const [seen, setSeen] = React.useState(false);
  const [open, setOpen] = React.useState(defaultOpen);
  const [loose, setLoose] = React.useState(true);

  const sim = React.useRef({
    rope: null as Rope | null,
    tied: [] as Pt[],
    rest: [] as Pt[],
    w: 0,
    h: 0,
    scale: 1,
    cordW: 3,
    wind: 0,
    intent: (defaultOpen ? "open" : "sealed") as "open" | "sealed",
    fast: false,
    attract: 0.05,
    drag: null as { i: number; x: number; y: number; id: number } | null,
    seenAt: 0,
    holdUntil: 0,
    acc: 0,
    last: 0,
    raf: 0,
    visible: false,
    reduced: false,
    loose: true,
    open: defaultOpen,
    ptr: null as { x: number; y: number; vx: number; vy: number } | null,
  });

  const draw = React.useCallback(() => {
    const s = sim.current;
    const r = s.rope;
    if (!r) return;
    const d = smoothPath(r.x, r.y);
    shadowRef.current?.setAttribute("d", d);
    bodyRef.current?.setAttribute("d", d);
    twistRef.current?.setAttribute("d", d);
    hitRef.current?.setAttribute("d", d);
    const n = r.x.length;
    const tip = tipRef.current;
    if (tip && n > 2) {
      const ex = r.x[n - 1];
      const ey = r.y[n - 1];
      const dx = ex - r.x[n - 3];
      const dy = ey - r.y[n - 3];
      const l = Math.hypot(dx, dy) || 1;
      const len = s.cordW * 3.4;
      tip.setAttribute("x1", String(round(ex - (dx / l) * len)));
      tip.setAttribute("y1", String(round(ey - (dy / l) * len)));
      tip.setAttribute("x2", String(round(ex)));
      tip.setAttribute("y2", String(round(ey)));
    }
    const w = s.cordW;
    bodyRef.current?.setAttribute("stroke-width", String(w));
    shadowRef.current?.setAttribute("stroke-width", String(w + 1.4));
    twistRef.current?.setAttribute("stroke-width", String(round(w * 0.42)));
    twistRef.current?.setAttribute("stroke-dasharray", round(w * 0.9) + " " + round(w * 1.25));
    tip?.setAttribute("stroke-width", String(round(w * 1.55)));
  }, []);

  const measure = React.useCallback(() => {
    const root = rootRef.current;
    const frame = frameRef.current;
    const t = topRef.current;
    const b = botRef.current;
    const flap = flapRef.current;
    if (!root || !frame || !t || !b || !flap) return;
    const s = sim.current;
    const rr = root.getBoundingClientRect();
    const scale = root.offsetWidth ? rr.width / root.offsetWidth : 1;
    s.scale = scale || 1;
    const local = (el: Element): Pt => {
      const q = el.getBoundingClientRect();
      return { x: (q.left + q.width / 2 - rr.left) / s.scale, y: (q.top + q.height / 2 - rr.top) / s.scale };
    };
    const top = local(t);
    const bottom = local(b);
    const r = t.offsetWidth / 2;
    s.w = root.offsetWidth;
    s.h = root.offsetHeight;
    s.cordW = Math.max(2.4, Math.min(3.8, r * 0.04));
    const seam = flap.offsetHeight;
    const tiedRaw = tiePath(top, bottom, r * 0.4, r * 0.95);
    const L = polyLength(tiedRaw);
    s.tied = resample(tiedRaw, SEGMENTS);
    const pad = Math.max(10, r * 0.2);
    const box = { left: pad, top: seam + pad, right: s.w - pad, bottom: s.h - pad };
    const narrow = s.w < 640;
    s.rest = resample(restPath(bottom, L, r * (narrow ? 0.58 : 0.66), box, narrow ? 1.5 : 1.4, 2), SEGMENTS);
    const cordEl = cordRef.current;
    if (cordEl) {
      cordEl.setAttribute("viewBox", "0 0 " + s.w + " " + s.h);
      cordEl.setAttribute("width", String(s.w));
      cordEl.setAttribute("height", String(s.h));
    }
    if (!s.rope || s.rope.x.length !== s.tied.length) {
      s.rope = makeRope(s.wind > 0.5 ? s.tied : s.rest);
    } else {
      s.rope.seg = L / SEGMENTS;
      const k = Math.floor(s.wind * (SEGMENTS + 1));
      for (let i = 0; i < s.rope.x.length; i++) {
        const q = i < k ? s.tied[i] : s.rest[i];
        s.rope.x[i] = s.rope.px[i] = q.x;
        s.rope.y[i] = s.rope.py[i] = q.y;
      }
    }
    draw();
  }, [draw]);

  const tickRef = React.useRef<(now: number) => void>(() => {});

  const tick = React.useCallback((now: number) => {
    const s = sim.current;
    s.raf = 0;
    const root = rootRef.current;
    if (!root || !s.rope) return;
    const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 0.016);
    s.last = now;

    const rect = root.getBoundingClientRect();
    const p = scrollProgress(rect.top, rect.height, window.innerHeight);
    const started = s.seenAt > 0 && now - s.seenAt > (s.reduced ? 0 : 800);
    const target = s.intent === "sealed" && started && now >= s.holdUntil ? p : 0;
    s.wind = s.reduced ? target : stepWind(s.wind, target, dt, s.fast ? 1.5 : 0.85);
    if (s.wind === target) s.fast = false;
    const locked = s.wind * (SEGMENTS + 1);

    if (spinTopRef.current) spinTopRef.current.style.transform = "rotate(" + round(s.wind * 540) + "deg)";
    if (spinBotRef.current) spinBotRef.current.style.transform = "rotate(" + round(s.wind * -200) + "deg)";

    if (s.reduced) {
      const k = Math.floor(locked);
      for (let i = 0; i < s.rope.x.length; i++) {
        const q = i < Math.max(1, k) ? s.tied[i] : s.rest[i];
        s.rope.x[i] = s.rope.px[i] = q.x;
        s.rope.y[i] = s.rope.py[i] = q.y;
      }
    } else {
      s.acc += dt;
      while (s.acc >= 1 / 60) {
        s.acc -= 1 / 60;
        const ptr = s.ptr;
        if (ptr && !s.drag) {
          const reach = 46;
          for (let i = Math.max(1, Math.floor(locked)); i < s.rope.x.length; i++) {
            const dx = s.rope.x[i] - ptr.x;
            const dy = s.rope.y[i] - ptr.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < reach * reach) {
              const f = (1 - Math.sqrt(d2) / reach) * 0.22;
              s.rope.x[i] += ptr.vx * f;
              s.rope.y[i] += ptr.vy * f;
            }
          }
          ptr.vx *= 0.6;
          ptr.vy *= 0.6;
        }
        stepRope(s.rope, s.tied, s.rest, locked, s.attract, s.drag);
      }
    }
    draw();

    const isLoose = locked < SEGMENTS * 0.98;
    if (isLoose !== s.loose) {
      s.loose = isLoose;
      setLoose(isLoose);
    }
    if (s.intent === "open" && s.wind < 0.015 && !s.open) {
      s.open = true;
      setOpen(true);
    }
    if (s.visible) s.raf = requestAnimationFrame((n) => tickRef.current(n));
  }, [draw]);
  React.useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const wake = React.useCallback(() => {
    const s = sim.current;
    if (!s.raf && s.visible) {
      s.last = 0;
      s.raf = requestAnimationFrame((n) => tickRef.current(n));
    }
  }, []);

  React.useEffect(() => {
    const s = sim.current;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    s.reduced = !!mq?.matches;
    const onMq = () => {
      s.reduced = !!mq?.matches;
    };
    mq?.addEventListener?.("change", onMq);

    measure();
    const root = rootRef.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : null;
    if (root) ro?.observe(root);
    document.fonts?.ready?.then(() => measure()).catch(() => {});

    let io: IntersectionObserver | null = null;
    if (root && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          const on = entries.some((e) => e.isIntersecting);
          s.visible = on;
          if (on && !s.seenAt) {
            s.seenAt = performance.now();
            setSeen(true);
          }
          if (on) wake();
        },
        { threshold: 0.1 }
      );
      io.observe(root);
    } else {
      s.visible = true;
      s.seenAt = performance.now();
      setSeen(true);
      wake();
    }
    return () => {
      io?.disconnect();
      ro?.disconnect();
      mq?.removeEventListener?.("change", onMq);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.visible = false;
    };
  }, [measure, wake]);

  React.useEffect(() => {
    const el = letterRef.current;
    if (!el) return;
    if (open) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [open]);

  const toggle = (want?: boolean) => {
    const s = sim.current;
    const next = want ?? s.intent === "sealed";
    if (next === (s.intent === "open")) return;
    s.fast = true;
    s.attract = 0.05;
    s.drag = null;
    onToggle?.(next);
    if (next) {
      s.intent = "open";
    } else {
      s.open = false;
      s.intent = "sealed";
      s.holdUntil = performance.now() + (s.reduced ? 0 : 650);
      setOpen(false);
    }
    wake();
  };

  const toLocal = (e: React.PointerEvent) => {
    const rr = rootRef.current!.getBoundingClientRect();
    const s = sim.current;
    return { x: (e.clientX - rr.left) / s.scale, y: (e.clientY - rr.top) / s.scale };
  };

  const onCordDown = (e: React.PointerEvent<SVGPathElement>) => {
    const s = sim.current;
    if (!s.rope) return;
    const p = toLocal(e);
    const i = nearestFree(s.rope, p.x, p.y, s.wind * (SEGMENTS + 1), 30);
    if (i < 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    s.drag = { i, x: p.x, y: p.y, id: e.pointerId };
    s.attract = 0;
    cordRef.current?.classList.add("is-drag");
    wake();
  };

  const onCordMove = (e: React.PointerEvent<SVGPathElement>) => {
    const s = sim.current;
    if (!s.drag || s.drag.id !== e.pointerId) return;
    const p = toLocal(e);
    s.drag.x = Math.min(s.w - 4, Math.max(4, p.x));
    s.drag.y = Math.min(s.h - 4, Math.max(4, p.y));
  };

  const onCordUp = (e: React.PointerEvent<SVGPathElement>) => {
    const s = sim.current;
    if (!s.drag || s.drag.id !== e.pointerId) return;
    s.drag = null;
    cordRef.current?.classList.remove("is-drag");
  };

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const s = sim.current;
    const p = toLocal(e);
    const prev = s.ptr;
    const cap = (v: number) => Math.max(-14, Math.min(14, v));
    s.ptr = { x: p.x, y: p.y, vx: prev ? cap(p.x - prev.x) : 0, vy: prev ? cap(p.y - prev.y) : 0 };
  };

  // Linq Palette Styles
  const style = {
    "--stt-paper": "#FFFFFF",
    "--stt-body-bg": "#F3EDFF",
    "--stt-ink": "#302544",
    "--stt-body-ink": "#302544",
    "--stt-accent": "#7546C8",
    "--stt-cord": "#8B5CF6",
    "--stt-display": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "--stt-sans": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "--stt-grain": "0.45",
    "--stt-h": height,
  } as React.CSSProperties;

  let ci = 0;
  const letters = (word: string) =>
    [...word].map((c, i) => (
      <span key={i} className="stt-ch" style={{ "--i": ci++ } as React.CSSProperties}>
        {c === " " ? " " : c}
      </span>
    ));

  return (
    <footer
      ref={rootRef}
      className={
        "stt" +
        (seen ? " is-in" : "") +
        (open ? " is-open" : "") +
        (className ? " " + className : "")
      }
      style={style}
      onPointerMove={onMove}
      onPointerLeave={() => (sim.current.ptr = null)}
    >
      <style>{CSS}</style>
      <div ref={frameRef} className="stt-frame">
        {/* ──────── Flap (White Envelope Paper with LINQ Branding) ──────── */}
        <div className="stt-flapwrap">
          <div ref={flapRef} className="stt-flap">
            {/* Minimal Doodles on Flap */}
            <VioletDoodles />

            {/* Top Bar: Logo & Meta Tags */}
            <div className="stt-meta flex items-center justify-between">
              <div>{logo}</div>
              {meta.length > 0 && (
                <div className="flex items-center gap-3 font-mono text-xs">
                  {meta.slice(0, 3).map((m, i) => (
                    <span key={i} className="hidden sm:inline">
                      ({m})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Main LINQ Wordmark and Tagline Tapes */}
            <div className="stt-head">
              <h2 className="stt-title">
                <span className="stt-sr">{title}</span>
                <span aria-hidden="true" className="tracking-tight font-extrabold text-[#27213A]">
                  {letters(title)}
                </span>
              </h2>

              {tapes.length > 0 && (
                <p className="stt-tapes">
                  {tapes.slice(0, 2).map((t, i) => (
                    <React.Fragment key={i}>
                      <span className={"stt-tape " + (i ? "stt-tape-b" : "stt-tape-a")}>
                        <span>{t}</span>
                      </span>
                      {i === 0 && tapes.length > 1 && <span className="stt-sr"> </span>}
                    </React.Fragment>
                  ))}
                </p>
              )}
            </div>

            {/* Top Button Dock */}
            <div className="stt-dock">
              <button
                ref={topRef}
                type="button"
                className="stt-btn stt-btn-top"
                onClick={() => toggle(true)}
                aria-label="Untie the envelope"
                aria-controls={uid + "note"}
                aria-expanded={open}
                tabIndex={open ? -1 : 0}
                aria-hidden={open || undefined}
              >
                <span ref={spinTopRef} className="stt-spin">
                  <ButtonFace uid={uid + "t"} accent="#7546C8" />
                </span>
                <ButtonGloss uid={uid + "t"} />
              </button>
            </div>
            <div className="stt-crease" aria-hidden="true" />
          </div>
        </div>

        {/* ──────── Envelope Body (Soft Lavender with Note & Navigation) ──────── */}
        <div className="stt-body">
          {/* Slide-out Secret Note */}
          <div ref={letterRef} id={uid + "note"} className="stt-letter" role="region" aria-label="Linq Note">
            <svg className="stt-stamp" viewBox="0 0 150 64" aria-hidden="true" focusable="false">
              <circle cx="32" cy="32" r="26" />
              <circle cx="32" cy="32" r="20.5" />
              <text x="32" y="35" textLength="32" lengthAdjust="spacingAndGlyphs">
                LINQ · AVTIVE
              </text>
              <path d="M66 18q10-5 20 0t20 0 20 0 20 0M66 28q10-5 20 0t20 0 20 0 20 0M66 38q10-5 20 0t20 0 20 0 20 0M66 48q10-5 20 0t20 0 20 0 20 0" />
            </svg>
            <p className="stt-note-t">{noteMessage}</p>
            <div className="stt-note-row">
              {noteCta && (
                <a
                  className="stt-cta"
                  href={noteCta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {noteCta.label}
                  <ArrowIcon />
                </a>
              )}
              <button type="button" className="stt-ghost" onClick={() => toggle(false)}>
                Tie it back up
              </button>
            </div>
          </div>

          <div className="stt-panel" aria-hidden="true" />

          {/* Bottom Button Dock */}
          <div className="stt-dock-b">
            <button
              ref={botRef}
              type="button"
              className="stt-btn"
              onClick={() => toggle()}
              aria-label={open ? "Tie the envelope back up" : "Untie the envelope"}
              aria-controls={uid + "note"}
              aria-expanded={open}
            >
              <span ref={spinBotRef} className="stt-spin">
                <ButtonFace uid={uid + "b"} accent="#7546C8" />
              </span>
              <ButtonGloss uid={uid + "b"} />
            </button>
          </div>

          {/* Clean Navigation & Content Area */}
          <div className="stt-content">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 w-full pt-4">
              {columns.map((col, idx) => (
                <div key={idx} className="flex flex-col gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-700">
                    {col.title}
                  </span>
                  <nav className="flex flex-col gap-2.5">
                    {col.links.map((link, lIdx) => (
                      <a
                        key={lIdx}
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noopener noreferrer" : undefined}
                        className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#302544]/80 transition-colors hover:text-violet-700 w-fit"
                      >
                        {link.label}
                        {link.external && (
                          <span className="opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100">
                            <ArrowIcon />
                          </span>
                        )}
                      </a>
                    ))}
                  </nav>
                </div>
              ))}

              {/* Social Links Column */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700">
                  Connect
                </span>
                <nav className="flex flex-col gap-2.5">
                  {socialLinks.linkedin && (
                    <a
                      href={socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#302544]/80 transition-colors hover:text-violet-700 w-fit"
                    >
                      LinkedIn
                      <span className="opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100">
                        <ArrowIcon />
                      </span>
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#302544]/80 transition-colors hover:text-violet-700 w-fit"
                    >
                      Instagram
                      <span className="opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100">
                        <ArrowIcon />
                      </span>
                    </a>
                  )}
                </nav>
              </div>
            </div>

            {/* Bottom Copyright & Attribution Bar */}
            <div className="border-t border-violet-200/60 pt-6 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#746D80] w-full">
              <p>{copyright}</p>
              {attribution && <div>{attribution}</div>}
            </div>
          </div>

          {/* 2 Minimal Illustrated Characters */}
          <MinimalCharacterLeft />
          <MinimalCharacterRight />
        </div>
      </div>

      {/* ──────── Interactive SVG Wound & Loose Cord Layer ──────── */}
      <svg ref={cordRef} className={"stt-cord" + (loose ? " is-loose" : "")} aria-hidden="true" focusable="false">
        <defs>
          <filter id={uid + "s"} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>
        <path ref={shadowRef} stroke="rgba(117,70,200,0.22)" transform="translate(1.2 2.6)" filter={"url(#" + uid + "s)"} />
        <path ref={bodyRef} stroke="#8B5CF6" />
        <path ref={twistRef} stroke="rgba(255,255,255,0.3)" />
        <line ref={tipRef} stroke="#C4B5FD" strokeLinecap="round" />
        <path
          ref={hitRef}
          className="stt-hit"
          onPointerDown={onCordDown}
          onPointerMove={onCordMove}
          onPointerUp={onCordUp}
          onPointerCancel={onCordUp}
        />
      </svg>
    </footer>
  );
}
