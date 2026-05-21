"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  MoreHorizontal,
} from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { isMoreRoute, moreNavGroups, primaryNav } from "./nav-items";
import { useNavAlertCounts } from "./use-nav-alert-counts";

const mobileTabClass =
  "relative flex h-12 w-[clamp(4.75rem,21vw,5.125rem)] flex-shrink-0 flex-col items-center justify-center gap-0.5";
const navNudgeStorageKey = "mobile-nav-scroll-nudge-v2";

export function MobileNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { theme, setTheme } = useTheme();
  const { expiringCreditsCount, alertsCount } = useNavAlertCounts(userId);
  const moreBadgeCount = alertsCount;

  const updateScrollCue = useCallback(() => {
    const nav = navScrollRef.current;
    if (!nav) return;

    setCanScrollRight(nav.scrollLeft < nav.scrollWidth - nav.clientWidth - 4);
  }, []);

  const scrollNavRight = useCallback(() => {
    const nav = navScrollRef.current;
    if (!nav) return;

    nav.scrollBy({ left: Math.max(nav.clientWidth * 0.65, 160), behavior: "smooth" });
  }, []);

  useEffect(() => {
    updateScrollCue();
    window.addEventListener("resize", updateScrollCue);
    return () => window.removeEventListener("resize", updateScrollCue);
  }, [pathname, updateScrollCue]);

  useEffect(() => {
    const nav = navScrollRef.current;
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      if (sessionStorage.getItem(navNudgeStorageKey)) return;
      sessionStorage.setItem(navNudgeStorageKey, "true");
    } catch {
      return;
    }

    let resetTimer: number | undefined;
    const nudgeTimer = window.setTimeout(() => {
      nav.scrollTo({ left: 34, behavior: "smooth" });
      resetTimer = window.setTimeout(() => {
        nav.scrollTo({ left: 0, behavior: "smooth" });
      }, 450);
    }, 650);

    return () => {
      window.clearTimeout(nudgeTimer);
      if (resetTimer) window.clearTimeout(resetTimer);
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Top header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 z-40 backdrop-blur-xl bg-background/80 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Image src="/logo.png" alt="Credit Card Chris" width={120} height={32} className="h-8 w-auto" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl p-2 text-muted-foreground transition-all hover:text-foreground"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl p-2 text-muted-foreground transition-all hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sign out</span>
          </button>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 backdrop-blur-xl bg-background/90">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background via-background/80 to-transparent" />
          {canScrollRight && (
            <button
              type="button"
              aria-label="Scroll navigation"
              onClick={scrollNavRight}
              className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-lg shadow-black/20 backdrop-blur transition hover:bg-muted active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <div
            ref={navScrollRef}
            onScroll={updateScrollCue}
            className="flex items-center gap-1 overflow-x-auto px-1 py-1 pr-12 pb-[calc(0.25rem+env(safe-area-inset-bottom))] scrollbar-hide"
          >
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (!isMoreRoute(pathname) && pathname.startsWith(`${item.href}/`));
              const showBadge = item.href === "/benefits" && expiringCreditsCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  className={mobileTabClass}
                >
                  <div className={cn(
                    "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                    isActive ? "bg-primary" : "hover:bg-white/5"
                  )}>
                    <Icon className={cn(
                      "h-3.5 w-3.5 transition-colors duration-200",
                      isActive ? "text-primary-foreground" : "text-muted-foreground/70"
                    )} />
                    {showBadge && (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400 ring-[1.5px] ring-background" />
                    )}
                  </div>
                  <span className={cn(
                    "w-full truncate text-center text-[10px] font-medium leading-none",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )}>
                    {item.shortLabel}
                  </span>
                </Link>
              );
            })}

            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="More"
                  title="More"
                  className={mobileTabClass}
                >
                  <div className={cn(
                    "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                    isMoreRoute(pathname) ? "bg-primary" : "hover:bg-white/5"
                  )}>
                    <MoreHorizontal className={cn(
                      "h-3.5 w-3.5 transition-colors duration-200",
                      isMoreRoute(pathname) ? "text-primary-foreground" : "text-muted-foreground/70"
                    )} />
                    {moreBadgeCount > 0 && (
                      <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground ring-2 ring-background">
                        {moreBadgeCount > 9 ? "9+" : moreBadgeCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "w-full truncate text-center text-[10px] font-medium leading-none",
                    isMoreRoute(pathname) ? "text-primary" : "text-muted-foreground/70"
                  )}>
                    More
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto rounded-t-3xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-0">
                <SheetHeader className="px-1 pb-1 pt-5">
                  <SheetTitle>More</SheetTitle>
                </SheetHeader>
                <div className="space-y-5">
                  {moreNavGroups.map((group) => (
                    <div key={group.label}>
                      <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="grid gap-2">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                          const badgeCount =
                            "badgeKey" in item && item.badgeKey === "alerts"
                              ? alertsCount
                              : 0;
                          return (
                            <SheetClose key={item.href} asChild>
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm transition-colors",
                                  isActive ? "border-primary/40 bg-primary/[0.12]" : "border-border bg-card hover:bg-muted/50",
                                )}
                              >
                                <span className="flex min-w-0 items-center gap-3">
                                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                    <Icon className="h-4 w-4 text-primary" />
                                  </span>
                                  <span className="truncate font-medium">{item.label}</span>
                                </span>
                                {badgeCount > 0 && (
                                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                                    {badgeCount > 9 ? "9+" : badgeCount}
                                  </span>
                                )}
                              </Link>
                            </SheetClose>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                        <LogOut className="h-4 w-4 text-destructive" />
                      </span>
                      <span className="font-medium">Sign out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </>
  );
}
