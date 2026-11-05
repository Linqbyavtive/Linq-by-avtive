"use client";

import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CrowdCanvasProps {
  /** Sprite sheet of people (rows x cols grid). Local /crowd/linq-corporate-peeps.png is preferred. */
  src?: string;
  rows?: number;
  cols?: number;
  /** Radius in px of the colour spotlight that follows the cursor. */
  spotlight?: number;
  /** Violet tint (0-1) applied to people inside the spotlight. */
  tint?: number;
  className?: string;
}

type Stage = { width: number; height: number };

type Peep = {
  rect: number[];
  width: number;
  height: number;
  x: number;
  y: number;
  anchorY: number;
  scaleX: number;
  scale: number;
  walk: gsap.core.Timeline | null;
};

const CDN_FALLBACK_SRC =
  "https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png";

const randomRange = (min: number, max: number) => min + Math.random() * (max - min);
const randomIndex = <T,>(array: T[]) => randomRange(0, array.length) | 0;
const removeFromArray = <T,>(array: T[], i: number) => array.splice(i, 1)[0];
const removeItemFromArray = <T,>(array: T[], item: T) =>
  removeFromArray(array, array.indexOf(item));

const CrowdCanvas = ({
  src = "/crowd/linq-corporate-peeps.png",
  rows = 15,
  cols = 7,
  spotlight = 160,
  tint = 0.32,
  className,
}: CrowdCanvasProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const revealRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const base = baseRef.current;
    const reveal = revealRef.current;
    if (!wrap || !base || !reveal) return;

    const baseCtx = base.getContext("2d", { alpha: true });
    const revealCtx = reveal.getContext("2d", { alpha: true });
    if (!baseCtx || !revealCtx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let isVisible = true;
    let isTickerActive = false;

    const img = new Image();
    const stage: Stage = { width: 0, height: 0 };
    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];

    // ---------- walking with distant perspective & responsive scale ----------
    const resetPeep = (peep: Peep) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const isMobile = stage.width < 640;

      // Depth perception: 0 = closest in distance audience, 1 = furthest back
      const depthFactor = gsap.parseEase("power2.in")(Math.random());

      // Scale: 45%-55% on mobile to remain lightweight and avoid text overlap; 55%-65% on desktop
      const baseScale = isMobile ? 0.45 : 0.55;
      const scaleVariance = isMobile ? 0.08 : 0.10;
      const scale = baseScale + scaleVariance * (1 - depthFactor);

      // Distant ground placement: farther figures walk slightly higher on the ground plane
      const verticalSpread = Math.min(isMobile ? 120 : 180, stage.height * 0.42);
      const offsetY = (isMobile ? 30 : 45) - verticalSpread * depthFactor;
      const startY = stage.height - peep.height * scale + offsetY;

      const visualWidth = peep.width * scale;
      const startX = direction === 1 ? -visualWidth - 25 : stage.width + 25;
      const endX = direction === 1 ? stage.width + 25 : -visualWidth - 25;

      peep.scaleX = direction;
      peep.scale = scale;
      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY + peep.height * scale;
      return { startY, endX };
    };

    const normalWalk = (peep: Peep, { startY, endX }: { startY: number; endX: number }) => {
      // Calm, smooth horizontal movement: each person takes ~18-22 seconds to cross
      const xDuration = randomRange(19, 22);
      const yDuration = 0.42;
      const bob = 3.5 * (peep.scale / 0.6);
      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.96, 1.04));
      tl.to(peep, { duration: xDuration, x: endX, ease: "none" }, 0);
      tl.to(
        peep,
        { duration: yDuration, repeat: Math.ceil(xDuration / yDuration), yoyo: true, y: startY - bob },
        0,
      );
      return tl;
    };

    const addPeepToCrowd = () => {
      if (!availablePeeps.length) return null;
      const peep = removeFromArray(availablePeeps, randomIndex(availablePeeps));
      const walk = normalWalk(peep, resetPeep(peep)).eventCallback("onComplete", () => {
        removeItemFromArray(crowd, peep);
        availablePeeps.push(peep);
        if (!disposed && isVisible) addPeepToCrowd();
      });
      peep.walk = walk;
      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return peep;
    };

    // Mobile-optimized crowd capacity: fewer active sprites on small screens to conserve CPU and avoid clutter
    const initCrowd = () => {
      const isMobile = stage.width < 640;
      const targetCount = isMobile ? Math.min(38, allPeeps.length) : allPeeps.length;

      while (availablePeeps.length && crowd.length < targetCount) {
        const added = addPeepToCrowd();
        if (added?.walk) {
          added.walk.progress(Math.random());
        }
      }

      if (reduceMotion) {
        crowd.forEach((p) => p.walk?.pause());
      }
    };

    const createPeeps = () => {
      allPeeps.length = 0;
      const { naturalWidth, naturalHeight } = img;
      const rectWidth = naturalWidth / rows;
      const rectHeight = naturalHeight / cols;
      for (let i = 0; i < rows * cols; i++) {
        allPeeps.push({
          rect: [(i % rows) * rectWidth, ((i / rows) | 0) * rectHeight, rectWidth, rectHeight],
          width: rectWidth,
          height: rectHeight,
          x: 0,
          y: 0,
          anchorY: 0,
          scaleX: 1,
          scale: 0.6,
          walk: null,
        });
      }
    };

    // ---------- drawing with crisp sharpness and capped DPR ----------
    const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, tintAlpha = 0) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.save();
      ctx.scale(dpr, dpr);
      crowd.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scaleX * p.scale, p.scale);
        ctx.drawImage(img, p.rect[0], p.rect[1], p.rect[2], p.rect[3], 0, 0, p.width, p.height);
        ctx.restore();
      });
      ctx.restore();

      if (tintAlpha) {
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = `rgba(124, 58, 237, ${tintAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    };

    // ---------- cursor spotlight ----------
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let seen = false;

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
      if (!seen) {
        current.x = target.x;
        current.y = target.y;
        seen = true;
      }
      reveal.style.opacity = "1";
    };

    const onLeave = () => {
      reveal.style.opacity = "0";
    };

    const render = () => {
      if (!isVisible || disposed) return;
      current.x += (target.x - current.x) * 0.16;
      current.y += (target.y - current.y) * 0.16;
      reveal.style.setProperty("--mx", `${current.x}px`);
      reveal.style.setProperty("--my", `${current.y}px`);
      draw(baseCtx, base);
      draw(revealCtx, reveal, tint);
    };

    const startTicker = () => {
      if (!isTickerActive && !reduceMotion) {
        gsap.ticker.add(render);
        isTickerActive = true;
      }
    };

    const stopTicker = () => {
      if (isTickerActive) {
        gsap.ticker.remove(render);
        isTickerActive = false;
      }
    };

    const resize = () => {
      if (disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      stage.width = base.clientWidth;
      stage.height = base.clientHeight;

      [base, reveal].forEach((c) => {
        c.width = stage.width * dpr;
        c.height = stage.height * dpr;
      });

      crowd.forEach((p) => p.walk?.kill());
      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);
      initCrowd();

      if (reduceMotion) {
        draw(baseCtx, base);
      }
    };

    // ---------- Viewport Intersection Observer (pause when out of view) ----------
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const inView = Boolean(entry && entry.isIntersecting);
          isVisible = inView;
          if (inView) {
            startTicker();
            if (!reduceMotion) {
              crowd.forEach((p) => p.walk?.resume());
            }
          } else {
            stopTicker();
            crowd.forEach((p) => p.walk?.pause());
          }
        },
        { threshold: 0.05 },
      );
      observer.observe(wrap);
    }

    // ---------- Image Loading with Fallback ----------
    img.onload = () => {
      if (disposed) return;
      createPeeps();
      resize();
      if (!reduceMotion) {
        startTicker();
      } else {
        draw(baseCtx, base);
      }
    };

    img.onerror = () => {
      if (disposed) return;
      // If local image fails, fall back to production CDN sprite
      if (img.src !== CDN_FALLBACK_SRC) {
        img.src = CDN_FALLBACK_SRC;
      }
    };

    img.src = src;

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      stopTicker();
      crowd.forEach((p) => p.walk?.kill());
    };
  }, [src, rows, cols, tint]);

  const mask = `radial-gradient(circle ${spotlight}px at var(--mx, -999px) var(--my, -999px), #000 25%, transparent 100%)`;

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {/* Layer 1: full distant crowd, colourless with crisp, clear visibility */}
      <canvas
        ref={baseRef}
        style={{ opacity: 0.9 }}
        className="absolute inset-0 h-full w-full opacity-90 grayscale"
      />
      {/* Layer 2: same crowd in colour, revealed around the cursor with crisp rendering */}
      <canvas
        ref={revealRef}
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
        className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300"
      />
    </div>
  );
};

export { CrowdCanvas };
export default CrowdCanvas;
