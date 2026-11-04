"use client";

import React from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { Building2, Link2, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  step: string;
  tagline?: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface StepPosition {
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  rotation?: number;
}

export interface HowItWorksProps {
  features?: StepItem[];
  steps?: StepItem[];
  className?: string;
  stepPositions?: StepPosition[];
}

export const defaultLinqSteps: StepItem[] = [
  {
    step: "01",
    title: "Register your organization",
    description: "Set up your organization once. Linq handles onboarding in a single step.",
    icon: Building2,
  },
  {
    step: "02",
    title: "Share one event link",
    description: "Send attendees a single link to register for your event.",
    icon: Link2,
  },
  {
    step: "03",
    title: "Attendees get scannable cards",
    description: "Each attendee generates a card that others can scan to connect.",
    icon: QrCode,
  },
];

export function HowItWorks({
  features,
  steps,
  className,
  stepPositions,
}: HowItWorksProps) {
  const items = features || steps || defaultLinqSteps;
  const shouldReduceMotion = useReducedMotion();
  const count = items.length;

  // Stagger height between alternating zigzag rows on desktop
  const rowHeight = 168;
  const topPadding = 15;
  const totalHeight = Math.max(560, (count - 1) * rowHeight + 220);

  // Generate dynamic sinusoidal connecting path across all steps
  let svgPath = "";
  if (count > 1) {
    for (let i = 0; i < count - 1; i++) {
      const isCurrLeft = i % 2 === 0;
      const currX = isCurrLeft ? 280 : 720;
      const currY = i * rowHeight + 85;

      const isNextLeft = (i + 1) % 2 === 0;
      const nextX = isNextLeft ? 280 : 720;
      const nextY = (i + 1) * rowHeight + 85;

      // Horizontal bezier control points
      const spanX = nextX - currX;
      const cp1X = currX + spanX * 0.45;
      const cp1Y = currY + 10;
      const cp2X = nextX - spanX * 0.45;
      const cp2Y = nextY - 10;

      if (i === 0) {
        svgPath = `M ${currX} ${currY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${nextX} ${nextY}`;
      } else {
        svgPath += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${nextX} ${nextY}`;
      }
    }
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className={cn("relative mx-auto w-full max-w-5xl", className)}>
        {/* ── Desktop Connected Zigzag Timeline (>= md) ── */}
        <div
          className="hidden md:block relative w-full"
          style={{ height: `${totalHeight}px` }}
        >
          {/* Dynamically generated SVG connector line connecting all steps */}
          {count > 1 && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full -z-0 overflow-visible"
              viewBox={`0 0 1000 ${totalHeight}`}
              fill="none"
              preserveAspectRatio="none"
            >
              {/* Static background dashed guide line */}
              <path
                d={svgPath}
                stroke="#E9E0FA"
                strokeWidth="2.5"
                strokeDasharray="6 8"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Animated pulsing dashed line */}
              <m.path
                d={svgPath}
                stroke="#C4B5FD"
                strokeWidth="2.5"
                strokeDasharray="6 8"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ strokeDashoffset: 0 }}
                animate={
                  shouldReduceMotion
                    ? { strokeDashoffset: 0 }
                    : { strokeDashoffset: -28 }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { repeat: Infinity, duration: 2.8, ease: "linear" }
                }
              />

              {/* Step Anchor Nodes */}
              {items.map((_, idx) => {
                const isLeft = idx % 2 === 0;
                const nodeX = isLeft ? 280 : 720;
                const nodeY = idx * rowHeight + 85;
                return (
                  <circle
                    key={idx}
                    cx={nodeX}
                    cy={nodeY}
                    r="4.5"
                    fill="#7546C8"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="shadow-xs"
                  />
                );
              })}
            </svg>
          )}

          {/* Connected Floating Cards in Zigzag Pattern for ALL Workflow Steps */}
          {items.map((item, index) => {
            const isLeft = index % 2 === 0;
            const top = index * rowHeight + topPadding;
            const customPos = stepPositions?.[index];

            const left = customPos?.left ?? (isLeft ? "4%" : undefined);
            const right = customPos?.right ?? (!isLeft ? "4%" : undefined);
            const rotation =
              customPos?.rotation ??
              (isLeft
                ? index % 4 === 0
                  ? -1.2
                  : -0.8
                : index % 4 === 1
                ? 1.4
                : 1.0);

            const Icon = item.icon;

            return (
              <m.div
                key={item.step}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: shouldReduceMotion ? 0.2 : 0.6,
                  delay: shouldReduceMotion ? 0 : Math.min(index * 0.08, 0.4),
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                whileHover={
                  shouldReduceMotion
                    ? {}
                    : {
                        y: -5,
                        scale: 1.015,
                        transition: { duration: 0.2 },
                      }
                }
                style={{
                  top: `${top}px`,
                  left,
                  right,
                  rotate: shouldReduceMotion ? 0 : `${rotation}deg`,
                }}
                className="group absolute z-10 w-[310px] lg:w-[350px] rounded-2xl border border-[#E9E0FA] bg-white p-2.5 shadow-[0_8px_30px_-6px_rgba(124,58,237,0.06)] transition-all duration-300 hover:border-[#D4C5F9] hover:shadow-[0_14px_36px_-6px_rgba(124,58,237,0.12)]"
              >
                <div className="rounded-xl bg-[#F7F3FF] p-5 lg:p-5.5 transition-colors duration-200">
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <span className="text-xs font-bold tracking-widest text-[#7546C8] uppercase">
                      Step {item.step}
                    </span>
                    <div className="grid size-9 place-items-center rounded-xl bg-white text-[#7546C8] shadow-sm ring-1 ring-[#E9E0FA] transition-transform duration-200 group-hover:scale-105">
                      <Icon className="size-4.5" aria-hidden />
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-[#27213A] tracking-tight leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-[#746D80]">
                    {item.description}
                  </p>
                </div>
              </m.div>
            );
          })}
        </div>

        {/* ── Mobile Stacked Timeline (< md) for ALL Workflow Steps ── */}
        <div className="block md:hidden relative w-full max-w-md mx-auto pt-4 pb-2">
          {/* Vertical dashed line guide connecting the steps */}
          <div
            className="pointer-events-none absolute left-7 top-10 bottom-10 w-0.5 border-l-2 border-dashed border-[#E9E0FA] -z-0"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-4">
            {items.map((item, index) => {
              const Icon = item.icon;

              return (
                <m.div
                  key={item.step}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{
                    duration: shouldReduceMotion ? 0.2 : 0.5,
                    delay: shouldReduceMotion ? 0 : Math.min(index * 0.06, 0.3),
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="relative z-10 w-full rounded-2xl border border-[#E9E0FA] bg-white p-2.5 shadow-[0_6px_24px_-6px_rgba(124,58,237,0.06)]"
                >
                  <div className="rounded-xl bg-[#F7F3FF] p-5">
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="inline-flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-full bg-[#7546C8] text-[11px] font-bold text-white shadow-sm">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold tracking-widest text-[#7546C8] uppercase">
                          Step {item.step}
                        </span>
                      </div>
                      <div className="grid size-9 place-items-center rounded-xl bg-white text-[#7546C8] shadow-sm ring-1 ring-[#E9E0FA]">
                        <Icon className="size-4.5" aria-hidden />
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-[#27213A] tracking-tight leading-snug">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-[#746D80]">
                      {item.description}
                    </p>
                  </div>
                </m.div>
              );
            })}
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}

export default HowItWorks;

