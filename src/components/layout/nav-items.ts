import {
  LayoutDashboard,
  CreditCard,
  MessageCircleQuestion,
  Scale,
} from "lucide-react";

export const primaryNav = [
  { href: "/dashboard",      label: "Today",          shortLabel: "Today",  icon: LayoutDashboard },
  { href: "/ask",            label: "Ask",            shortLabel: "Ask",    icon: MessageCircleQuestion },
  { href: "/wallet",         label: "Wallet",         shortLabel: "Wallet", icon: CreditCard },
  { href: "/keep-or-cancel", label: "Keep or Cancel", shortLabel: "Keep?",  icon: Scale },
] as const;
