"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,
  Moon,
  MoreHorizontal,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { isMoreRoute, moreNavGroups, primaryNav } from "./nav-items";
import { useNavAlertCounts } from "./use-nav-alert-counts";

export function MobileNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { expiringCreditsCount, alertsCount } = useNavAlertCounts(userId);

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
        <div className="flex items-center gap-1 overflow-x-auto px-1 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] scrollbar-hide">
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
                className="relative flex h-12 w-[4.5rem] flex-shrink-0 flex-col items-center justify-center gap-0.5"
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
                className="relative flex h-12 w-[4.5rem] flex-shrink-0 flex-col items-center justify-center gap-0.5"
              >
                <div className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                  isMoreRoute(pathname) ? "bg-primary" : "hover:bg-white/5"
                )}>
                  <MoreHorizontal className={cn(
                    "h-3.5 w-3.5 transition-colors duration-200",
                    isMoreRoute(pathname) ? "text-primary-foreground" : "text-muted-foreground/70"
                  )} />
                  {alertsCount > 0 && (
                    <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground ring-2 ring-background">
                      {alertsCount > 9 ? "9+" : alertsCount}
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
                        const showAlertBadge = "badgeKey" in item && item.badgeKey === "alerts" && alertsCount > 0;
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
                              {showAlertBadge && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                                  {alertsCount > 9 ? "9+" : alertsCount}
                                </span>
                              )}
                            </Link>
                          </SheetClose>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
