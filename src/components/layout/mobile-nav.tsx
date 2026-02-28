"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  Sparkles,
  Target,
} from "lucide-react";
import { NotificationsBell } from "@/components/notifications/notifications-bell";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: CreditCard },
  { href: "/transactions", label: "Activity", icon: Receipt },
  { href: "/recommend", label: "Best Card", icon: Sparkles },
  { href: "/goals", label: "Goals", icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  return (
    <>
      {/* Top header — logo + notifications + settings */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 z-40 backdrop-blur-xl bg-background/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">C</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Credit Card Chris</span>
        </div>
        <div className="flex items-center gap-1">
          {userId && <NotificationsBell userId={userId} />}
          <Link
            href="/settings"
            className={cn(
              "p-2 rounded-xl transition-all",
              pathname === "/settings"
                ? "text-primary bg-primary/15"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
            )}
          >
            <Settings className="w-5 h-5" />
          </Link>
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
