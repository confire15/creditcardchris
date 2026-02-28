"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  Sparkles,
  Target,
  Settings,
  LogOut,
  ClipboardList,
  GitCompareArrows,
  Sun,
  Moon,
  Search,
  PiggyBank,
  ArrowLeftRight,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { useTheme } from "next-themes";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: CreditCard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/recommend", label: "Best Card", icon: Sparkles },
  { href: "/chat", label: "AI Chat", icon: MessageCircle },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/applications", label: "Applications", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-border sticky top-0 z-40 backdrop-blur-xl bg-background/80">
      <Link href="/dashboard">
        <img src="/logo.png" alt="Credit Card Chris" className="h-8 w-auto" />
      </Link>

      <nav className="flex items-center gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden xl:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-0.5">
        {/* cmd+K search trigger */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-muted-foreground border border-border hover:bg-muted/40 transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          Search
          <kbd className="ml-1 text-[10px] opacity-60">⌘K</kbd>
        </button>
        {userId && <NotificationsBell userId={userId} />}
        <Link
          href="/settings"
          title="Settings"
          className={cn(
            "p-2 rounded-xl transition-all",
            pathname === "/settings"
              ? "text-primary bg-primary/15"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Settings className="w-4 h-4" />
        </Link>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
