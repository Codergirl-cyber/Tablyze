"use client";

import React from "react";
import { motion, type Variants, type HTMLMotionProps } from "framer-motion";

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
      ease: "easeOut",
    },
  },
};

export const hoverScale = {
  scale: 1.02,
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
  transition: { type: "spring" as const, stiffness: 400, damping: 25 },
};

export const hoverLift = {
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1)",
  transition: { type: "spring" as const, stiffness: 400, damping: 25 },
};

// ---------------------------------------------------------------------------
// Pre-built motion components with common presets
// ---------------------------------------------------------------------------

type MotionDivProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode;
};

/**
 * Fades in + slides up by 16px when entering the viewport.
 */
export function FadeInUp({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Only fades in (no slide).
 */
export function FadeIn({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * A container that staggers its children automatically.
 * Child must implement the `fadeInUp` variant.
 */
export function StaggerContainer({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hover-lift wrapper: subtle scale + shadow on hover.
 */
export function HoverLift({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      whileHover="hover"
      variants={{ hover: hoverScale }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

