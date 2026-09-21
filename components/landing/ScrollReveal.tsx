"use client";

/**
 * Reveals a section as it scrolls into view.
 *
 * `once` is the whole design. A section that re-animates every time it
 * crosses the viewport turns scrolling back up into a light show, and on a
 * page arguing for restraint that reads as a contradiction. It plays once and
 * then the element is simply there.
 *
 * Transform and opacity only, so the compositor does the work and no layout
 * is recalculated. Under prefers-reduced-motion it renders as plain markup
 * with no initial state at all — not a faster animation, none.
 */

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function ScrollReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
