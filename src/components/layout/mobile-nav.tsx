"use client";

import Image from "next/image";
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
  Bell,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { endOfMonth, differenceInDays } from "date-fns";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { buildUpcomingAlerts } from "@/lib/alerts/upcoming-alerts";

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/best-card", label: "Best Card", shortLabel: "Best", icon: Sparkles },
  { href: "/alerts", label: "Alerts", shortLabel: "Alerts", icon: Bell },
  { href: "/benefits", label: "Benefits", shortLabel: "Credits", icon: Gift },
  { href: "/keep-or-cancel", label: "Keep or Cancel", shortLabel: "Keep/Cancel", icon: Scale },
  { href: "/calculator", label: "Fee Calculator", shortLabel: "Fee Calc", icon: Calculator },
  { href: "/wallet", label: "Wallet", shortLabel: "Wallet", icon: CreditCard },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

export function MobileNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [expiringCount, setExpiringCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    (async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const monthStart = `${now.toISOString().slice(0, 7)}-01`;

      const [
        creditsRes,
        subRes,
        annualFeesRes,
        perksRes,
        budgetsRes,
        txRes,
      ] = await Promise.all([
        supabase
          .from("statement_credits")
          .select("reset_month, annual_amount, used_amount")
          .eq("user_id", userId),
        supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_cards")
          .select("id, nickname, annual_fee_date, custom_annual_fee, card_template:card_templates(name, annual_fee)")
          .eq("user_id", userId)
          .eq("is_active", true)
          .not("annual_fee_date", "is", null),
        supabase
          .from("card_perks")
          .select(
            "id, name, reset_cadence, reset_month, last_reset_at, value_type, annual_value, used_value, annual_count, used_count, is_redeemed"
          )
          .eq("user_id", userId)
          .eq("is_active", true)
          .eq("notify_before_reset", true),
        supabase
          .from("spending_budgets")
          .select("category_id, monthly_limit, category:spending_categories(display_name)")
          .eq("user_id", userId),
        supabase
          .from("transactions")
          .select("category_id, amount")
          .eq("user_id", userId)
          .gte("transaction_date", monthStart),
      ]);

      if (!active) return;

      const credits = creditsRes.data ?? [];
      const count = credits.filter((c) => {
        if (c.used_amount >= c.annual_amount) return false;
        if (c.reset_month !== currentMonth) return false;
        return differenceInDays(endOfMonth(now), now) <= 7;
      }).length;
      setExpiringCount(count);

      if (!isPremiumPlan(subRes.data)) {
        setAlertsCount(0);
        return;
      }

      const alerts = buildUpcomingAlerts({
        now,
        windowDays: 7,
        annualFeeCards: annualFeesRes.data ?? [],
        perks: perksRes.data ?? [],
        budgets: budgetsRes.data ?? [],
        transactions: txRes.data ?? [],
      });
      setAlertsCount(alerts.length);
    })();

    return () => {
      active = false;
    };
  }, [userId, supabase]);

  return (
    <>
      {/* Top header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 z-40 backdrop-blur-xl bg-background/80 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Image src="/logo.png" alt="Credit Card Chris" width={120} height={32} className="h-8 w-auto" />
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-all"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 backdrop-blur-xl bg-background/90">
        <div className="flex items-stretch justify-around px-1.5 pt-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))]">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const showBadge = item.href === "/benefits" && expiringCount > 0;
            const showAlertsBadge = item.href === "/alerts" && alertsCount > 0;
            const isLongLabel = item.href === "/keep-or-cancel" || item.href === "/calculator";
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className="relative flex min-w-0 flex-1 flex-col items-center justify-start gap-1 px-0 pt-1 pb-0.5"
              >
                <div className={cn(
                  "relative flex h-7 w-8 items-center justify-center rounded-full transition-all duration-200",
                  isActive ? "bg-primary" : "hover:bg-white/5"
                )}>
                  <Icon className={cn(
                    "h-4 w-4 transition-colors duration-200",
                    isActive ? "text-primary-foreground" : "text-muted-foreground/70"
                  )} />
                  {showBadge && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 ring-[1.5px] ring-background" />
                  )}
                  {showAlertsBadge && (
                    <span className="absolute -right-1 -top-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold flex items-center justify-center ring-2 ring-background">
                      {alertsCount > 9 ? "9+" : alertsCount}
                    </span>
                  )}
                </div>
                {item.shortLabel ? (
                  <div className="flex w-full min-h-[22px] min-[360px]:min-h-[24px] items-end justify-center">
                    <span
                      className={cn(
                        "block w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center font-medium leading-[1] tracking-[-0.015em]",
                        isLongLabel ? "text-[7px] min-[360px]:text-[8px]" : "text-[8px] min-[360px]:text-[9px]",
                        isActive ? "text-primary" : "text-muted-foreground/70"
                      )}
                    >
                      {item.shortLabel}
                    </span>
                  </div>
                ) : (
                  <span className="sr-only">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
