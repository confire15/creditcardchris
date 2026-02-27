"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: CreditCard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/recommend", label: "Best Card", icon: Sparkles },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-white/[0.06] sticky top-0 z-40 backdrop-blur-xl bg-background/80">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-base font-bold text-primary-foreground">C</span>
        </div>
        <span className="text-xl font-bold tracking-tight">Credit Card Chris</span>
      </Link>

      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </header>
  );
}
