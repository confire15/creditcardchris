"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { primaryNav } from "./nav-items";
import { AlertsBell } from "./alerts-bell";
import { SignOutButton } from "./sign-out-button";

export function MobileNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Top header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 z-40 backdrop-blur-xl bg-background/80 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Image src="/logo.png" alt="Credit Card Chris" width={120} height={32} className="h-8 w-auto" style={{ width: "auto" }} priority />
        <div className="flex items-center gap-1">
          <AlertsBell className="rounded-xl" iconClassName="h-5 w-5" />
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl p-2 text-muted-foreground transition-all hover:text-foreground"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link
            href="/settings"
            className={cn(
              "rounded-xl p-2 transition-all",
              pathname === "/settings" || pathname.startsWith("/settings/")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <SignOutButton className="rounded-xl" iconClassName="h-5 w-5" />
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 backdrop-blur-xl bg-background/90"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around px-2 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5"
              >
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                  isActive ? "bg-primary" : "hover:bg-white/5"
                )}>
                  <Icon className={cn(
                    "h-3.5 w-3.5 transition-colors duration-200",
                    isActive ? "text-primary-foreground" : "text-muted-foreground/70"
                  )} />
                </div>
                <span className={cn(
                  "text-2xs font-medium leading-none",
                  isActive ? "text-primary" : "text-muted-foreground/70"
                )}>
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
