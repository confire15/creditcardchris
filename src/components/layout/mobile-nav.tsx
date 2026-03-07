"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  Sparkles,
  Target,
  PiggyBank,
  ArrowLeftRight,
  GitCompareArrows,
  ClipboardList,
  Settings,
  LogOut,
  MoreHorizontal,
  Sun,
  Moon,
  ChevronRight,
  MessageCircle,
  BarChart3,
  RefreshCw,
  Gift,
} from "lucide-react";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: CreditCard },
  { href: "/transactions", label: "Activity", icon: Receipt },
  { href: "/recommend", label: "Best Card", icon: Sparkles },
];

const moreNav = [
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/chat", label: "AI Assistant", icon: MessageCircle },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/transfer", label: "Transfer Points", icon: ArrowLeftRight },
  { href: "/compare", label: "Compare Cards", icon: GitCompareArrows },
  { href: "/subscriptions", label: "Subscriptions", icon: RefreshCw },
  { href: "/perks", label: "Card Perks", icon: Gift },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  // Close More sheet when navigating
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isMoreActive = moreNav.some((item) => pathname === item.href);

  return (
    <>
      {/* Top header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 z-40 backdrop-blur-xl bg-background/80">
        <img src="/logo.png" alt="Credit Card Chris" className="h-8 w-auto" />
        <div className="flex items-center gap-1">
          {userId && <NotificationsBell userId={userId} />}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-all"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 backdrop-blur-xl bg-background/95">
        <div className="flex items-center justify-around px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 flex-1 py-1"
              >
                <div className={cn(
                  "w-12 h-8 flex items-center justify-center rounded-2xl transition-all",
                  isActive ? "bg-primary/15" : ""
                )}>
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-[10px] font-medium leading-none transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 flex-1 py-1"
          >
            <div className={cn(
              "w-12 h-8 flex items-center justify-center rounded-2xl transition-all",
              isMoreActive || moreOpen ? "bg-primary/15" : ""
            )}>
              <MoreHorizontal className={cn("w-5 h-5 transition-colors", isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className={cn("text-[10px] font-medium leading-none transition-colors", isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground")}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85svh] flex flex-col overflow-hidden pb-0">
          <SheetHeader className="pb-2 flex-shrink-0">
            <SheetTitle className="text-left">More</SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto flex-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="space-y-1 mt-2">
            {moreNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 px-3 py-3.5 rounded-xl transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                    isActive ? "bg-primary/15" : "bg-muted/50"
                  )}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-4 px-3 py-3.5 rounded-xl w-full text-left hover:bg-muted/50 transition-all text-destructive"
            >
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
