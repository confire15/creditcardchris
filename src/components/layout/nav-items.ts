import {
  LayoutDashboard,
  CreditCard,
  MessageCircleQuestion,
  Calculator,
  Scale,
} from "lucide-react";

export const primaryNav = [
  { href: "/dashboard",      label: "Today",          shortLabel: "Today",  icon: LayoutDashboard },
  { href: "/ask",            label: "Ask",            shortLabel: "Ask",    icon: MessageCircleQuestion },
  { href: "/keep-or-cancel", label: "Keep or Cancel", shortLabel: "Keep?",  icon: Scale },
  { href: "/calculator",     label: "Fee Calculator", shortLabel: "Calc",   icon: Calculator },
  { href: "/wallet",         label: "Wallet",         shortLabel: "Wallet", icon: CreditCard },
] as const;
