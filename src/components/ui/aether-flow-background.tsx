"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AetherFlowBackgroundProps {
  className?: string;
  /** Optional override for particle count; calculated dynamically by default based on container size */
  particleCount?: number;
  /** Maximum distance in px for drawing connection lines between particles */
  maxDistance?: number;
  /** Interaction radius for the cursor influence in px */
  mouseRadius?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

export function AetherFlowBackground({
  className,
  particleCount,
  maxDistance = 120,
  mouseRadius = 140,
}: AetherFlowBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let disposed = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      active: false,
    };

    const initParticles = (w: number, h: number) => {
      const count =
        particleCount ??
        Math.min(80, Math.max(25, Math.floor((w * h) / 16000)));

      particles = [];
      for (let i = 0; i < count; i++) {
        // Velocities: calm, subtle float between -0.35 and 0.35 px/frame
        const speed = 0.15 + Math.random() * 0.25;
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          // Varied particle sizes: 1.2px to 2.2px for subtle visual depth
          radius: 1.2 + Math.random() * 1.0,
          // Subtle alpha: 0.30 to 0.55 around Linq violet
          alpha: 0.3 + Math.random() * 0.25,
        });
      }
    };

    const handleResize = () => {
      if (!container || !canvas || disposed) return;
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initParticles(width, height);

      if (reduceMotion) {
        render();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= -40 && x <= rect.width + 40 && y >= -40 && y <= rect.height + 40) {
        mouse.targetX = x;
        mouse.targetY = y;
        mouse.active = true;
      } else {
        mouse.active = false;
      }
    };

    const handlePointerLeave = () => {
      mouse.active = false;
    };

    const render = () => {
      if (disposed || !ctx || width === 0 || height === 0) return;

      // Transparent clear - preserves Linq's hero background gradient
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse follow
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
      } else {
        mouse.x += (-9999 - mouse.x) * 0.05;
        mouse.y += (-9999 - mouse.y) * 0.05;
      }

      // 1. Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!reduceMotion) {
          p.x += p.vx;
          p.y += p.vy;

          // Gentle cursor interaction (soft repulsion when cursor nears)
          if (mouse.active) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < mouseRadius && dist > 0) {
              const force = (1 - dist / mouseRadius) * 0.8;
              const angle = Math.atan2(dy, dx);
              p.x += Math.cos(angle) * force;
              p.y += Math.sin(angle) * force;
            }
          }

          // Gentle boundary bounce to maintain uniform particle distribution
          if (p.x <= p.radius) {
            p.x = p.radius;
            p.vx = Math.abs(p.vx);
          } else if (p.x >= width - p.radius) {
            p.x = width - p.radius;
            p.vx = -Math.abs(p.vx);
          }

          if (p.y <= p.radius) {
            p.y = p.radius;
            p.vy = Math.abs(p.vy);
          } else if (p.y >= height - p.radius) {
            p.y = height - p.radius;
            p.vy = -Math.abs(p.vy);
          }
        }

        // Draw particle (soft violet)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.alpha})`;
        ctx.fill();
      }

      // 2. Connecting lines between nearby particles (subtle lavender)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxDistance) {
            // Low-opacity particle connections: fades smoothly to 0 at maxDistance
            const lineAlpha = (1 - dist / maxDistance) * 0.10;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(124, 58, 237, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // 3. Cursor interaction highlights: subtle connections to cursor
      if (mouse.active) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (dist < mouseRadius) {
            const cursorAlpha = (1 - dist / mouseRadius) * 0.20;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(167, 139, 250, ${cursorAlpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      if (!reduceMotion && !disposed) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);

    if (!reduceMotion) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      disposed = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [particleCount, maxDistance, mouseRadius]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

export default AetherFlowBackground;
