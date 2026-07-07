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
      <Link href="/settings#subscription" className="inline-flex items-center rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-1 text-2xs font-medium text-primary">
        Unlock with Premium
      </Link>
    );
  }

  const className =
    verdict.status === "safe"
      ? "border-success/30 bg-success/10 text-success"
      : verdict.status === "wait"
      ? "border-warning/30 bg-warning/10 text-warning"
      : "border-danger/30 bg-danger/10 text-danger";

  const label =
    verdict.status === "safe"
      ? "Safe to apply"
      : verdict.status === "wait"
      ? `Wait ${verdict.daysUntil} days`
      : `Locked`;

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-2xs font-medium", className)} title={verdict.reason}>
      {label}
    </span>
  );
}
