"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { primaryNav } from "./nav-items";

export function MobileNav({ userId: _userId }: { userId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { theme, setTheme } = useTheme();

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
          <Link
            href="/settings"
            className={cn(
              "rounded-xl p-2 transition-all",
              pathname === "/settings" || pathname.startsWith("/settings/")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Settings"
          >
            {/* inline SVG to avoid importing Settings icon separately */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </Link>
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

      {/* Bottom tab bar — 3 items, no scroll needed */}
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
                  "text-[10px] font-medium leading-none",
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
