"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import {
  Settings,
  LogOut,
  Sun,
  Moon,
  MoreHorizontal,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isMoreRoute, moreNavGroups, primaryNav } from "./nav-items";
import { useNavAlertCounts } from "./use-nav-alert-counts";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState<number | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const { theme, setTheme } = useTheme();
  const { expiringCreditsCount, alertsCount } = useNavAlertCounts(userId);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const memberIds = await getHouseholdMemberIds(supabase, uid);
      Promise.all([
        supabase.from("user_cards").select("*", { count: "exact", head: true }).in("user_id", memberIds).eq("is_active", true),
        supabase.from("statement_credits").select("annual_amount, used_amount").in("user_id", memberIds),
      ]).then(([cardsRes, creditsRes]) => {
        setCardCount(cardsRes.count ?? 0);
        const rem = (creditsRes.data ?? []).reduce(
          (s, c) => s + Math.max(0, (c.annual_amount ?? 0) - (c.used_amount ?? 0)),
          0
        );
        setCreditsRemaining(rem);
      });
    });
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="hidden md:flex items-center justify-between h-16 px-6 border-b border-overlay-subtle sticky top-0 z-40 backdrop-blur-xl bg-background/80">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex-shrink-0">
          <img src="/logo.png" alt="Credit Card Chris" className="h-8 w-auto" style={{ height: "2rem", width: "auto" }} />
        </Link>
        {cardCount !== null && (
          <span className="hidden xl:flex items-center gap-1.5 text-xs bg-muted/40 rounded-full px-2.5 py-1">
            <span className="text-muted-foreground">{cardCount} {cardCount === 1 ? "card" : "cards"}</span>
            {creditsRemaining > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-emerald-500">{formatCurrency(creditsRemaining)} left</span>
              </>
            )}
          </span>
        )}
      </div>

      <nav className="flex items-center gap-0.5">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (!isMoreRoute(pathname) && pathname.startsWith(`${item.href}/`));
          const showBenefitsBadge = item.href === "/benefits" && expiringCreditsCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-overlay-hover"
              )}
            >
              <span className="relative">
                <Icon className="w-4 h-4 flex-shrink-0" />
                {showBenefitsBadge && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-background" />
                )}
              </span>
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="More"
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all",
                isMoreRoute(pathname)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-overlay-hover hover:text-foreground",
              )}
            >
              <span className="relative">
                <MoreHorizontal className="h-4 w-4" />
                {alertsCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground ring-2 ring-background">
                    {alertsCount > 9 ? "9+" : alertsCount}
                  </span>
                )}
              </span>
              <span className="hidden lg:block">More</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-2xl border-border bg-card/95 p-3 shadow-xl backdrop-blur-xl">
            <div className="space-y-4">
              {moreNavGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="grid gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const showAlertBadge = "badgeKey" in item && item.badgeKey === "alerts" && alertsCount > 0;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex min-h-10 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors",
                            isActive ? "bg-primary/[0.12] text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {showAlertBadge && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                              {alertsCount > 9 ? "9+" : alertsCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </nav>

      <div className="flex items-center gap-0.5">
        <Link
          href="/settings"
          title="Settings"
          className={cn(
            "p-2 rounded-full transition-all",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-overlay-hover"
          )}
        >
          <Settings className="w-4 h-4" />
        </Link>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-overlay-hover transition-all"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-overlay-hover transition-all"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
