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
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-background/50 backdrop-blur-[4px] px-6 text-center">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{label}</p>
        <Link
          href={ctaHref}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
        >
          See Premium — $3.99/mo
        </Link>
        <p className="text-[11px] text-muted-foreground">or $39/yr · cancel anytime</p>
      </div>
      <div className="pointer-events-none opacity-40 saturate-50" aria-hidden>{preview ?? children}</div>
    </div>
  );
}
