"use client";

import { UserCard, StatementCredit, SpendingCategory, CardPerk } from "@/lib/types/database";
import { getCardName, getMultiplierForCategory, rankCardsForCategory } from "@/lib/utils/rewards";
import { analyzeCardSimple } from "@/lib/utils/card-analysis";
import {
  Clock,
  Calendar,
  TrendingDown,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { differenceInDays, parseISO, endOfMonth } from "date-fns";

type Nudge = {
  key: string;
  href: string;
  icon: React.ElementType;
  message: string;
  colorClass: string;
  priority: number;
};

type Props = {
  cards: UserCard[];
  credits: StatementCredit[];
  perks: CardPerk[];
  categories: SpendingCategory[];
  globalSpend: Record<string, number>;
};

function inferCadence(name: string): "Monthly" | "Semi-Annual" | "Annual" {
  const n = name.toLowerCase();
  if (n.includes("monthly") || n.includes("/mo") || n.includes("per month") || n.includes("each month")) return "Monthly";
  if (n.includes("semi-annual") || n.includes("semi annual") || n.includes("every six months") || n.includes("biannual") || n.includes("twice a year")) return "Semi-Annual";
  return "Annual";
}

export function SmartNudges({ cards, credits, perks, categories, globalSpend }: Props) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const daysLeft = differenceInDays(endOfMonth(now), now) + 1;
  const isSemiAnnualExpiry = currentMonth === 6 || currentMonth === 12;

  const nudges: Nudge[] = [];

  // 1. Expiring credits
  const expiringCredits = credits.filter((c) => {
    if (c.used_amount >= c.annual_amount) return false;
    const cadence = inferCadence(c.name);
    if (cadence === "Monthly") return c.reset_month === currentMonth;
    if (cadence === "Semi-Annual") return isSemiAnnualExpiry;
    return false;
  });

  if (expiringCredits.length > 0) {
    const expiringTotal = expiringCredits.reduce((s, c) => s + (c.annual_amount - c.used_amount), 0);
    nudges.push({
      key: "expiring",
      href: "/benefits",
      icon: Clock,
      message: `${expiringCredits.length} credit${expiringCredits.length > 1 ? "s" : ""} expiring · $${Math.round(expiringTotal).toLocaleString()} · ${daysLeft}d left`,
      colorClass: "bg-amber-500/10 border-amber-500/20 border-l-amber-400 text-amber-400 hover:bg-amber-500/15",
      priority: 100,
    });
  }

  // 2. Upcoming annual fee renewals (within 60 days)
  const upcomingRenewals = cards
    .filter((c) => (c.custom_annual_fee ?? c.card_template?.annual_fee ?? 0) > 0 && c.annual_fee_date)
    .map((c) => ({ card: c, days: differenceInDays(parseISO(c.annual_fee_date!), now) }))
    .filter(({ days }) => days >= 0 && days <= 60)
    .sort((a, b) => a.days - b.days);

  if (upcomingRenewals.length > 0) {
    const first = upcomingRenewals[0];
    nudges.push({
      key: "renewal",
      href: "/keep-or-cancel",
      icon: Calendar,
      message: `${getCardName(first.card)} fee in ${first.days}d${upcomingRenewals.length > 1 ? ` +${upcomingRenewals.length - 1}` : ""}`,
      colorClass: "bg-blue-500/10 border-blue-500/20 border-l-blue-400 text-blue-400 hover:bg-blue-500/15",
      priority: 90,
    });
  }

  // 3. Cancel candidates (negative net value)
  const annualFeeCards = cards.filter(
    (c) => (c.custom_annual_fee ?? c.card_template?.annual_fee ?? 0) > 0
  );
  const cancelCards = annualFeeCards.filter((card) => {
    const { verdict } = analyzeCardSimple(card, credits, perks, categories, globalSpend);
    return verdict === "cancel";
  });

  if (cancelCards.length > 0) {
    nudges.push({
      key: "cancel",
      href: "/keep-or-cancel",
      icon: TrendingDown,
      message: `${cancelCards.length} card${cancelCards.length > 1 ? "s" : ""} not worth ${cancelCards.length > 1 ? "their fees" : "its fee"}`,
      colorClass: "bg-red-500/10 border-red-500/20 border-l-red-400 text-red-400 hover:bg-red-500/15",
      priority: 80,
    });
  }

  // 4. Unused credits (past Q1)
  if (currentMonth > 3) {
    const unusedCredits = credits.filter((c) => c.used_amount === 0);
    if (unusedCredits.length > 0) {
      const unusedTotal = unusedCredits.reduce((s, c) => s + c.annual_amount, 0);
      nudges.push({
        key: "unused",
        href: "/benefits",
        icon: AlertCircle,
        message: `${unusedCredits.length} credit${unusedCredits.length > 1 ? "s" : ""} untouched · $${Math.round(unusedTotal).toLocaleString()} at risk`,
        colorClass: "bg-orange-500/10 border-orange-500/20 border-l-orange-400 text-orange-400 hover:bg-orange-500/15",
        priority: 70,
      });
    }
  }

  // 5. Reward gap (user has a better card for a high-spend category)
  const topCategories = categories
    .filter((c) => (globalSpend[c.id] ?? 0) > 0)
    .sort((a, b) => (globalSpend[b.id] ?? 0) - (globalSpend[a.id] ?? 0))
    .slice(0, 5);

  for (const cat of topCategories) {
    const ranked = rankCardsForCategory(cards, cat.id);
    if (ranked.length >= 2) {
      const best = ranked[0];
      const worst = ranked[ranked.length - 1];
      if (best.multiplier > worst.multiplier && best.multiplier >= 2 && worst.multiplier <= 1.5) {
        nudges.push({
          key: `gap-${cat.id}`,
          href: "/best-card",
          icon: ArrowUpRight,
          message: `Use ${getCardName(best.card)} for ${cat.display_name} (${best.multiplier}x vs ${worst.multiplier}x)`,
          colorClass: "bg-emerald-500/10 border-emerald-500/20 border-l-emerald-400 text-emerald-400 hover:bg-emerald-500/15",
          priority: 60,
        });
        break; // Only show one reward gap
      }
    }
  }

  // 6. Missing spend data
  const hasSpendData = Object.values(globalSpend).some((v) => v > 0);
  if (!hasSpendData && cards.length > 0) {
    nudges.push({
      key: "spend",
      href: "/keep-or-cancel",
      icon: BarChart3,
      message: "Add spending to see card values",
      colorClass: "bg-muted/60 border-border/40 border-l-muted-foreground/40 text-muted-foreground hover:bg-muted",
      priority: 50,
    });
  }

  if (nudges.length === 0) return null;

  const sorted = nudges.sort((a, b) => b.priority - a.priority).slice(0, 4);

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((nudge) => {
        const Icon = nudge.icon;
        return (
          <Link
            key={nudge.key}
            href={nudge.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-l-[3px] text-xs transition-colors ${nudge.colorClass}`}
          >
            <Icon className="w-3 h-3 flex-shrink-0" />
            {nudge.message}
          </Link>
        );
      })}
    </div>
  );
}
