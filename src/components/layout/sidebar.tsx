"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  CreditCard,
  Settings,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";

const primaryNav = [
  { href: "/dashboard", label: "Best Card", icon: Sparkles },
  { href: "/wallet", label: "Wallet", icon: CreditCard },
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
    <header className="hidden md:flex items-center justify-between h-16 px-6 border-b border-overlay-subtle sticky top-0 z-40 backdrop-blur-xl bg-background/80">
      <Link href="/dashboard" className="flex-shrink-0">
        <img src="/logo.png" alt="Credit Card Chris" className="h-8 w-auto" />
      </Link>

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
