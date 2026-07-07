"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  isPremium: boolean;
  children: ReactNode;
  preview?: ReactNode;
  label: string;
  ctaHref?: string;
  className?: string;
};

export function PremiumGate({
  isPremium,
  children,
  preview,
  label,
  ctaHref = "/settings#subscription",
  className,
}: Props) {
  if (isPremium) return <>{children}</>;

  return (
    <div className={cn("relative min-h-[300px]", className)}>
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/40 p-4">
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-primary/25 bg-card/95 px-6 py-6 text-center shadow-lg shadow-black/20 backdrop-blur-md">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold leading-snug">{label}</p>
          <Link
            href={ctaHref}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            See Premium — $3.99/mo
          </Link>
          <p className="text-caption">or $39/yr · cancel anytime</p>
        </div>
      </div>
      <div className="pointer-events-none opacity-40 saturate-50" aria-hidden>{preview ?? children}</div>
    </div>
  );
}
