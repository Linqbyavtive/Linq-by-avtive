"use client";

import React from "react";
import {
  motion,
  useReducedMotion,
  type Variants,
  type HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Standard staggered entrance container variants inspired by hero-section-4.
 * Orchestrates child appearance in sequential order with customizable delays.
 */
export const heroContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

/**
 * Standard fade-up item variants:
 * Opacity: 0 -> 1
 * Y translation: 20px -> 0px
 * Duration: 0.7s with smooth spring-free easing
 */
export const heroItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export interface HeroSection4AnimationProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
}

/**
 * Reusable animation container wrapper that applies staggered fade-up
 * entrance animations to its motion children while respecting reduced motion.
 */
export function HeroSection4Animation({
  children,
  className,
  staggerDelay = 0.15,
  delayChildren = 0.1,
  ...props
}: HeroSection4AnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
        delayChildren: shouldReduceMotion ? 0 : delayChildren,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface HeroAnimationItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable child item wrapper for elements inside HeroSection4Animation.
 */
export function HeroAnimationItem({
  children,
  className,
  ...props
}: HeroAnimationItemProps) {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.7,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={cn(className)} {...props}>
      {children}
    </motion.div>
  );
}

export { HeroSection4Animation as HeroAnimationContainer };
export default HeroSection4Animation;

