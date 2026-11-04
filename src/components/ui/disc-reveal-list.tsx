/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DiscRevealCard {
  id?: string;
  alt: string;
  render?: React.ReactNode;
  url?: string;
}

export interface DiscRevealItem {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  images?: {
    url: string;
    alt: string;
    rotation?: number;
    offset?: { x: number; y: number };
  }[];
  cards?: DiscRevealCard[];
}

interface DiscRevealListProps {
  items: DiscRevealItem[];
  className?: string;
}

export function DiscRevealList({ items, className }: DiscRevealListProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    const checkReducedMotion = () => {
      setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    };

    checkMobile();
    checkReducedMotion();

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const activeItem = items[activeIndex] || items[0];

  const getItemCards = (item: DiscRevealItem): DiscRevealCard[] => {
    if (item.cards && item.cards.length > 0) return item.cards;
    if (item.images && item.images.length > 0) {
      return item.images.map((img, i) => ({
        id: `${item.id}-img-${i}`,
        alt: img.alt,
        url: img.url,
      }));
    }
    return [];
  };

  return (
    <div className={cn("relative mx-auto w-full max-w-6xl", className)}>
      <div className="relative grid grid-cols-1 lg:grid-cols-12 lg:gap-12 items-center">
        {/* Left Column: Interactive Rows */}
        <div className="lg:col-span-7 flex flex-col z-20">
          <div className="divide-y divide-violet-100/80 border-y border-violet-100/80">
            {items.map((item, idx) => {
              const isActive = activeIndex === idx;
              const currentCards = getItemCards(item);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isActive}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onFocus={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveIndex(idx);
                    }
                  }}
                  className={cn(
                    "group relative cursor-pointer py-8 sm:py-10 transition-all duration-300 outline-none select-none",
                    isActive ? "opacity-100" : "opacity-45 hover:opacity-75"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      {/* Step Number */}
                      <span className="text-xs font-semibold tracking-wider text-violet-700 uppercase">
                        {item.number}
                      </span>

                      {/* Clean, Modern Heading */}
                      <h3 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-violet-950">
                        {item.title}
                      </h3>

                      {/* Subtitle (Fades in smoothly) */}
                      <AnimatePresence mode="wait">
                        {isActive && (
                          <motion.p
                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                            transition={{ duration: 0.28, ease: "easeOut" }}
                            className="mt-3 max-w-md text-base sm:text-lg text-slate-600 leading-relaxed"
                          >
                            {item.subtitle}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Mobile Inline Visuals */}
                  {isMobile && isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35 }}
                      className="mt-6 flex flex-col gap-3 overflow-hidden pt-2"
                    >
                      {currentCards.map((card, cardIdx) => (
                        <div
                          key={card.id || cardIdx}
                          className="relative w-full overflow-hidden rounded-xl border border-violet-100/90 bg-white shadow-sm"
                        >
                          {card.render ? (
                            <div className="w-full h-[185px] sm:h-[200px]">{card.render}</div>
                          ) : (
                            <div className="relative aspect-4/3 w-full">
                                                            <img
                                src={card.url}
                                alt={card.alt}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Desktop Floating Photos with Smooth Spring Animation */}
        {!isMobile && (
          <div className="lg:col-span-5 relative h-[460px] flex items-center justify-center pointer-events-none">
            {/* Subtle soft lavender glow background behind photos */}
            <div
              className="absolute -inset-6 -z-10 rounded-full bg-gradient-to-tr from-violet-100/50 via-purple-50/40 to-transparent blur-2xl"
              aria-hidden="true"
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="relative w-full h-full"
              >
                {getItemCards(activeItem).map((card, imgIdx) => {
                  const layoutConfigs = [
                    // Card 1: Top-Left
                    {
                      className: "top-4 left-4 w-[255px] h-[180px] z-10",
                      initial: { opacity: 0, scale: 0.85, y: 20, rotate: -8 },
                      animate: { opacity: 1, scale: 1, y: 0, rotate: -4 },
                      transition: {
                        type: "spring" as const,
                        stiffness: 260,
                        damping: 22,
                        delay: 0.05,
                      },
                    },
                    // Card 2: Center-Right (Hero Photo)
                    {
                      className: "top-14 right-1 w-[290px] h-[205px] z-20",
                      initial: { opacity: 0, scale: 0.85, y: 30, rotate: 6 },
                      animate: { opacity: 1, scale: 1, y: 0, rotate: 3 },
                      transition: {
                        type: "spring" as const,
                        stiffness: 260,
                        damping: 22,
                        delay: 0.12,
                      },
                    },
                    // Card 3: Bottom-Center
                    {
                      className: "bottom-4 left-8 w-[250px] h-[175px] z-15",
                      initial: { opacity: 0, scale: 0.85, y: 25, rotate: -4 },
                      animate: { opacity: 1, scale: 1, y: 0, rotate: -2 },
                      transition: {
                        type: "spring" as const,
                        stiffness: 260,
                        damping: 22,
                        delay: 0.18,
                      },
                    },
                  ];

                  const config = layoutConfigs[imgIdx] || layoutConfigs[0];

                  return (
                    <motion.div
                      key={card.id || `${activeItem.id}-${imgIdx}`}
                      initial={reduceMotion ? { opacity: 0 } : config.initial}
                      animate={reduceMotion ? { opacity: 1 } : config.animate}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
                      transition={reduceMotion ? { duration: 0.2 } : config.transition}
                      className={cn(
                        "absolute overflow-hidden rounded-2xl border-2 border-white/90 bg-white shadow-xl shadow-violet-950/10",
                        config.className
                      )}
                    >
                      {card.render ? (
                        <div className="h-full w-full">{card.render}</div>
                      ) : (
                                                      <img
                          src={card.url}
                          alt={card.alt}
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscRevealList;

