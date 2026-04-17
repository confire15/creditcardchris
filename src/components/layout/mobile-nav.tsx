"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  CreditCard,
  Settings,
  Sun,
  Moon,
  LayoutDashboard,
  Gift,
  Scale,
  Calculator,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { endOfMonth, differenceInDays } from "date-fns";

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/best-card", label: "Best Card", icon: Sparkles },
  { href: "/benefits", label: "Benefits", icon: Gift },
  { href: "/keep-or-cancel", label: "Keep/Cancel", icon: Scale },
  { href: "/calculator", label: "Fee Calculator", icon: Calculator },
  { href: "/wallet", label: "Wallet", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [expiringCount, setExpiringCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("statement_credits")
      .select("reset_month, annual_amount, used_amount")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!data) return;
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const count = data.filter((c) => {
          if (c.used_amount >= c.annual_amount) return false;
          if (c.reset_month !== currentMonth) return false;
          return differenceInDays(endOfMonth(now), now) <= 7;
        }).length;
        setExpiringCount(count);
      });
  }, [userId, supabase]);

  return (
    <>
      {/* Top header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 z-40 backdrop-blur-xl bg-background/80 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <img src="/logo.png" alt="Credit Card Chris" className="h-8 w-auto" style={{ height: "2rem", width: "auto" }} />
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-all"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 backdrop-blur-xl bg-background/90">
        <div className="flex items-center justify-around px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const showBadge = item.href === "/benefits" && expiringCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="relative flex items-center justify-center flex-1 py-1"
              >
                <div className={cn(
                  "relative flex items-center justify-center w-10 h-9 rounded-2xl transition-all duration-200",
                  isActive ? "bg-primary/15" : "hover:bg-white/5"
                )}>
                  <Icon className={cn(
                    "w-[1.15rem] h-[1.15rem] transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )} />
                  {showBadge && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-[1.5px] ring-background" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
