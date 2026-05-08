import {
  Activity,
  BadgePercent,
  Bell,
  Calculator,
  CreditCard,
  Gift,
  History,
  LayoutDashboard,
  MessageCircleQuestion,
  Scale,
  Settings,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";

export const primaryNav = [
  { href: "/dashboard", label: "Home", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/ask", label: "Ask", shortLabel: "Ask", icon: MessageCircleQuestion },
  { href: "/best-card", label: "Best Card", shortLabel: "Best", icon: Sparkles },
  { href: "/benefits", label: "Benefits", shortLabel: "Benefits", icon: Gift },
  { href: "/keep-or-cancel", label: "Keep or Cancel", shortLabel: "Keep", icon: Scale },
  { href: "/calculator", label: "Fee Calc", shortLabel: "Fee Calc", icon: Calculator },
  { href: "/wallet", label: "Wallet", shortLabel: "Wallet", icon: CreditCard },
] as const;

export const moreNavGroups = [
  {
    label: "Decisions",
    items: [
      { href: "/wallet/applications", label: "Applications", icon: Activity },
    ],
  },
  {
    label: "Tracking",
    items: [
      { href: "/alerts", label: "Alerts", icon: Bell, badgeKey: "alerts" },
      { href: "/wallet/points", label: "Points Wallet", icon: WalletCards },
      { href: "/wallet/offers", label: "Offer Matcher", icon: BadgePercent },
      { href: "/wallet/challenges", label: "Spend Challenges", icon: Target },
      { href: "/recap", label: "Year in Review", icon: Sparkles },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/settings/activity", label: "Activity Log", icon: History },
    ],
  },
] as const;

export function isMoreRoute(pathname: string) {
  return moreNavGroups.some((group) =>
    group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
}
