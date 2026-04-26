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
  ctaHref = "/settings",
  className,
}: Props) {
  if (isPremium) return <>{children}</>;

  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/60 backdrop-blur-[6px]">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium">{label}</p>
        <Link href={ctaHref} className="text-xs font-medium text-primary hover:underline">
          Upgrade for $3.99/mo
        </Link>
      </div>
      <div className="pointer-events-none opacity-20">{preview ?? children}</div>
    </div>
  );
}
