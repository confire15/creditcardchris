import {
  Bell,
  Calculator,
  CalendarClock,
  CreditCard,
  Gift,
  LayoutDashboard,
  MessageCircleQuestion,
  Scale,
  Settings,
  Sparkles,
  WalletCards,
} from "lucide-react";

export const primaryNav = [
  { href: "/dashboard", label: "Today", shortLabel: "Today", icon: LayoutDashboard },
  { href: "/ask", label: "Ask", shortLabel: "Ask", icon: MessageCircleQuestion },
  { href: "/benefits", label: "Benefits", shortLabel: "Benefits", icon: Gift },
  { href: "/wallet", label: "Wallet", shortLabel: "Wallet", icon: CreditCard },
] as const;

export const moreNavGroups = [
  {
    label: "Actions",
    items: [
      { href: "/alerts", label: "Alerts", icon: Bell, badgeKey: "alerts" },
      { href: "/best-card", label: "Best Card", icon: Sparkles },
      { href: "/credits", label: "Close Credits", icon: Gift },
      { href: "/wallet/copilot", label: "Wallet Copilot", icon: WalletCards },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/keep-or-cancel", label: "Keep or Cancel", icon: Scale },
      { href: "/annual-fees", label: "Annual Fees", icon: CalendarClock },
      { href: "/calculator", label: "Fee Calc", icon: Calculator },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

export function isMoreRoute(pathname: string) {
  return moreNavGroups.some((group) =>
    group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
}
