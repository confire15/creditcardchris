"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export const WALLET_TABS = [
  { key: "cards", label: "Cards" },
  { key: "credits-benefits", label: "Credits & Benefits" },
  { key: "offers", label: "Offers" },
  { key: "points", label: "Points" },
  { key: "challenges", label: "Challenges" },
  { key: "applications", label: "Applications" },
  { key: "annual-fees", label: "Annual Fees" },
] as const;

export type WalletTabKey = (typeof WALLET_TABS)[number]["key"];

export function isWalletTab(value: string | null | undefined): value is WalletTabKey {
  return !!value && WALLET_TABS.some((t) => t.key === value);
}

export function WalletTabs({ active }: { active: WalletTabKey }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div
      className="sticky top-16 z-30 -mx-4 mb-4 border-b border-overlay-subtle bg-background/80 px-4 backdrop-blur-xl md:top-16 md:-mx-6 md:px-6"
      role="tablist"
      aria-label="Wallet sections"
    >
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {WALLET_TABS.map((tab) => {
          const isActive = tab.key === active;
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          if (tab.key === "cards") params.delete("tab");
          else params.set("tab", tab.key);
          const qs = params.toString();
          const href = `${pathname}${qs ? `?${qs}` : ""}`;
          return (
            <Link
              key={tab.key}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "relative flex-shrink-0 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
