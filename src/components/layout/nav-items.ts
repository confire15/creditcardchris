import {
  LayoutDashboard,
  CreditCard,
  MessageCircleQuestion,
  Calculator,
} from "lucide-react";

export const primaryNav = [
  { href: "/dashboard",  label: "Today",      shortLabel: "Today",  icon: LayoutDashboard },
  { href: "/wallet",     label: "Wallet",     shortLabel: "Wallet", icon: CreditCard },
  { href: "/ask",        label: "Ask",        shortLabel: "Ask",    icon: MessageCircleQuestion },
  { href: "/calculator", label: "Calculator", shortLabel: "Calc",   icon: Calculator },
] as const;
