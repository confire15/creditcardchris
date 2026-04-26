"use client";

import { RuleVerdict } from "@/lib/constants/issuer-rules";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function ApplicationVerdict({
  isPremium,
  verdict,
}: {
  isPremium: boolean;
  verdict: RuleVerdict;
}) {
  if (!isPremium) {
    return (
      <Link href="/settings" className="inline-flex items-center rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-1 text-[11px] font-medium text-primary">
        Unlock with Premium
      </Link>
    );
  }

  const className =
    verdict.status === "safe"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      : verdict.status === "wait"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
      : "border-red-500/30 bg-red-500/10 text-red-500";

  const label =
    verdict.status === "safe"
      ? "Safe to apply"
      : verdict.status === "wait"
      ? `Wait ${verdict.daysUntil} days`
      : `Locked`;

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", className)} title={verdict.reason}>
      {label}
    </span>
  );
}
