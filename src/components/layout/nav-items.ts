import {
  LayoutDashboard,
  CreditCard,
  MessageCircleQuestion,
  Calculator,
  Scale,
} from "lucide-react";

export const primaryNav = [
  { href: "/dashboard",      label: "Today",          shortLabel: "Today",  icon: LayoutDashboard },
  { href: "/wallet",         label: "Wallet",         shortLabel: "Wallet", icon: CreditCard },
  { href: "/ask",            label: "Ask",            shortLabel: "Ask",    icon: MessageCircleQuestion },
  { href: "/keep-or-cancel", label: "Keep or Cancel", shortLabel: "K/C",    icon: Scale },
  { href: "/calculator",     label: "Fee Calculator", shortLabel: "Calc",   icon: Calculator },
] as const;
