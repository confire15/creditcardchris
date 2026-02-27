"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  Sparkles,
  Target,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: CreditCard },
  { href: "/transactions", label: "Activity", icon: Receipt },
  { href: "/recommend", label: "Best Card", icon: Sparkles },
  { href: "/goals", label: "Goals", icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top header — logo only */}
      <div className="md:hidden flex items-center px-5 py-4 border-b border-white/[0.06] sticky top-0 z-40 backdrop-blur-xl bg-background/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">C</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Credit Card Chris</span>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] backdrop-blur-xl bg-background/90">
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-0",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all",
                  isActive ? "bg-primary/15" : ""
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-none",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
