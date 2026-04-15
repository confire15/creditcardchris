"use client";

import { useReducedMotion } from "motion/react";

/**
 * Returns whether the user prefers reduced motion,
 * and a helper transition that disables spring physics when they do.
 */
export function useMotionSafe() {
  const prefersReduced = useReducedMotion();
  return {
    prefersReduced: !!prefersReduced,
    safeTransition: prefersReduced
      ? { duration: 0.01 }
      : undefined,
  };
}
