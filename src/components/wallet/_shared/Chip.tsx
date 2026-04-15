"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type ChipVariant = "multiplier" | "credit" | "base";

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  /** 0-100: shows a translucent fill behind the chip for "credit" variant */
  progress?: number;
  onClick?: () => void;
  className?: string;
}

export function Chip({
  label,
  variant = "base",
  progress,
  onClick,
  className,
}: ChipProps) {
  const isClickable = !!onClick;

  const inner = (
    <>
      {variant === "credit" && typeof progress === "number" && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/[0.08] origin-left"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      )}
      <span className="relative z-10 truncate">{label}</span>
    </>
  );

  const baseClasses = cn(
    "relative inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-none overflow-hidden select-none",
    variant === "multiplier" &&
      "bg-primary/10 border border-primary/20 text-primary",
    variant === "credit" &&
      "bg-muted/50 border border-border text-foreground/70",
    variant === "base" &&
      "bg-muted/50 border border-border text-muted-foreground",
    isClickable &&
      "cursor-pointer hover:border-primary/40 hover:text-primary transition-colors",
    className
  );

  if (isClickable) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className={baseClasses}
        whileTap={{ scale: 0.93 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {inner}
      </motion.button>
    );
  }

  return <span className={baseClasses}>{inner}</span>;
}
