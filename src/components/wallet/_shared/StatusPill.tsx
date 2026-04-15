"use client";

import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  date: string | null;
  fee: number;
  className?: string;
}

/** Shows a color-coded renewal status pill (only when ≤ 30 days away or overdue). */
export function StatusPill({ date, fee, className }: StatusPillProps) {
  if (!date || fee <= 0) return null;

  const days = differenceInDays(parseISO(date), new Date());

  let label: string;
  let colorClass: string;

  if (days < 0) {
    label = "Overdue";
    colorClass =
      "text-destructive bg-destructive/10 border-destructive/20";
  } else if (days === 0) {
    label = "Due today";
    colorClass =
      "text-destructive bg-destructive/10 border-destructive/20";
  } else if (days <= 7) {
    label = `${days}d left`;
    colorClass =
      "text-amber-500 bg-amber-500/10 border-amber-500/20";
  } else if (days <= 30) {
    label = `${days}d away`;
    colorClass =
      "text-amber-400/90 bg-amber-500/[0.07] border-amber-500/15";
  } else {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border leading-none",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
