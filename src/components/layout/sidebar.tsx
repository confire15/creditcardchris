"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import {
  Sparkles,
  CreditCard,
  Settings,
  LogOut,
  Sun,
  Moon,
  LayoutDashboard,
  Gift,
  Scale,
  Calculator,
} from "lucide-react";
import { useTheme } from "next-themes";

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/best-card", label: "Best Card", icon: Sparkles },
  { href: "/benefits", label: "Benefits", icon: Gift },
  { href: "/keep-or-cancel", label: "Keep or Cancel", icon: Scale },
  { href: "/calculator", label: "Fee Calculator", icon: Calculator },
  { href: "/wallet", label: "Wallet", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState<number | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      Promise.all([
        supabase.from("user_cards").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("is_active", true),
        supabase.from("statement_credits").select("annual_amount, used_amount").eq("user_id", uid),
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
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-overlay-hover"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}

      </nav>

      <div className="flex items-center gap-0.5">
        <Link
          href="/settings"
          title="Settings"
          className={cn(
            "p-2 rounded-xl transition-all",
            pathname === "/settings"
              ? "text-primary bg-primary/15"
              : "text-muted-foreground hover:text-foreground hover:bg-overlay-hover"
          )}
        >
          <Settings className="w-4 h-4" />
        </Link>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-overlay-hover transition-all"
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
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-overlay-hover transition-all"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
