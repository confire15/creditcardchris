import {
  LayoutDashboard,
  CreditCard,
  MessageCircleQuestion,
} from "lucide-react";

export const primaryNav = [
  { href: "/dashboard", label: "Today", shortLabel: "Today", icon: LayoutDashboard },
  { href: "/wallet",    label: "Wallet", shortLabel: "Wallet", icon: CreditCard },
  { href: "/ask",       label: "Ask",    shortLabel: "Ask",    icon: MessageCircleQuestion },
] as const;
