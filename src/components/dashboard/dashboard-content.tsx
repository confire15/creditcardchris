"use client";

import { useCallback, useEffect, useMemo, useState, type ElementType } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, StatementCredit, SpendingCategory, CardPerk, UserCategorySpend } from "@/lib/types/database";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CreditCard,
  Gift,
  MessageCircleQuestion,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { analyzeCardSimple } from "@/lib/utils/card-analysis";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { differenceInDays, endOfMonth, parseISO } from "date-fns";

type HomeAction = {
  key: string;
  href: string;
  label: string;
  detail: string;
  icon: ElementType;
  tone: "amber" | "blue" | "red" | "green" | "muted";
  priority: number;
};

const toneClasses: Record<HomeAction["tone"], string> = {
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  blue: "border-blue-500/25 bg-blue-500/10 text-blue-400",
  red: "border-red-500/25 bg-red-500/10 text-red-400",
  green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  muted: "border-border bg-muted/30 text-muted-foreground",
};

function inferCadence(name: string): "Monthly" | "Semi-Annual" | "Annual" {
  const normalized = name.toLowerCase();
  if (normalized.includes("monthly") || normalized.includes("/mo") || normalized.includes("per month")) return "Monthly";
  if (normalized.includes("semi-annual") || normalized.includes("semi annual") || normalized.includes("biannual")) return "Semi-Annual";
  return "Annual";
}

export function DashboardContent({ userId, isPremium }: { userId: string; isPremium: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const shouldReduceMotion = useReducedMotion();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [credits, setCredits] = useState<StatementCredit[]>([]);
  const [perks, setPerks] = useState<CardPerk[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [globalSpend, setGlobalSpend] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const scopedIds = await getHouseholdMemberIds(supabase, userId);
    const [cardsRes, creditsRes, perksRes, catsRes, spendRes] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*, rewards:card_template_rewards(*)), rewards:user_card_rewards(*)")
        .in("user_id", scopedIds)
        .eq("is_active", true)
        .order("sort_order")
        .limit(100),
      supabase
        .from("statement_credits")
        .select("*")
        .in("user_id", scopedIds)
        .order("created_at")
        .limit(500),
      supabase
        .from("card_perks")
        .select("*")
        .in("user_id", scopedIds)
        .eq("is_active", true)
        .limit(500),
      supabase.from("spending_categories").select("*").order("display_name").limit(50),
      supabase
        .from("user_category_spend")
        .select("*")
        .in("user_id", scopedIds)
        .limit(50),
    ]);

    setCards((cardsRes.data as UserCard[]) ?? []);
    setCredits((creditsRes.data as StatementCredit[]) ?? []);
    setPerks((perksRes.data as CardPerk[]) ?? []);
    setCategories((catsRes.data as SpendingCategory[]) ?? []);

    // Build global spend map (aggregate across all cards per category)
    const spendMap: Record<string, number> = {};
    for (const row of (spendRes.data ?? []) as UserCategorySpend[]) {
      spendMap[row.category_id] = Math.max(spendMap[row.category_id] ?? 0, Number(row.monthly_amount));
    }
    setGlobalSpend(spendMap);

    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <PageHeader className="mb-0" title="Home" />
        <div className="rounded-2xl bg-card border border-border/60 px-6 py-8 text-center">
          <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Add your first card</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Build your wallet to start seeing rewards, credits, and card value.
          </p>
          <Link href="/wallet">
            <Button size="sm" className="h-10 gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              Go to Wallet
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const sectionMotion = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: "easeOut" as const },
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const daysLeftInMonth = differenceInDays(endOfMonth(now), now) + 1;
  const isSemiAnnualExpiry = currentMonth === 6 || currentMonth === 12;
  const annualFeeCards = cards.filter((card) => (card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0) > 0);
  const analyses = annualFeeCards.map((card) => analyzeCardSimple(card, credits, perks, categories, globalSpend));
  const totalAnnualValue = analyses.reduce(
    (sum, analysis) => sum + analysis.creditsValue + analysis.perksValue + analysis.rewardsValue - analysis.annualFee,
    0,
  );
  const totalCreditsValue = credits.reduce((sum, credit) => sum + (credit.annual_amount ?? 0), 0);
  const totalCreditsUsed = credits.reduce((sum, credit) => sum + (credit.used_amount ?? 0), 0);
  const totalCreditsRemaining = Math.max(totalCreditsValue - totalCreditsUsed, 0);
  const expiringCredits = credits.filter((credit) => {
    if ((credit.used_amount ?? 0) >= (credit.annual_amount ?? 0)) return false;
    const cadence = inferCadence(credit.name);
    if (cadence === "Monthly") return credit.reset_month === currentMonth;
    if (cadence === "Semi-Annual") return isSemiAnnualExpiry;
    return false;
  });
  const expiringCreditValue = expiringCredits.reduce(
    (sum, credit) => sum + Math.max((credit.annual_amount ?? 0) - (credit.used_amount ?? 0), 0),
    0,
  );
  const upcomingRenewal = annualFeeCards
    .filter((card) => card.annual_fee_date)
    .map((card) => ({ card, days: differenceInDays(parseISO(card.annual_fee_date!), now) }))
    .filter(({ days }) => days >= 0 && days <= 60)
    .sort((a, b) => a.days - b.days)[0];
  const cancelCandidateCount = analyses.filter((analysis) => analysis.verdict === "cancel").length;
  const hasSpendData = Object.values(globalSpend).some((amount) => amount > 0);

  const actions: HomeAction[] = [
    ...(expiringCredits.length > 0
      ? [{
          key: "expiring-credits",
          href: "/benefits",
          label: "Log expiring credits",
          detail: `${expiringCredits.length} credit${expiringCredits.length === 1 ? "" : "s"} · ${formatCurrency(expiringCreditValue)} · ${daysLeftInMonth}d left`,
          icon: Gift,
          tone: "amber" as const,
          priority: 100,
        }]
      : []),
    ...(upcomingRenewal
      ? [{
          key: "annual-fee",
          href: "/keep-or-cancel",
          label: "Run Keep or Cancel",
          detail: `${upcomingRenewal.card.nickname || upcomingRenewal.card.card_template?.name || "Card"} renews in ${upcomingRenewal.days}d`,
          icon: Scale,
          tone: "blue" as const,
          priority: 90,
        }]
      : []),
    ...(cancelCandidateCount > 0
      ? [{
          key: "cancel-candidates",
          href: "/keep-or-cancel",
          label: "Review cards with weak value",
          detail: `${cancelCandidateCount} card${cancelCandidateCount === 1 ? "" : "s"} may not be worth the fee`,
          icon: AlertTriangle,
          tone: "red" as const,
          priority: 80,
        }]
      : []),
    ...(credits.length === 0
      ? [{
          key: "setup-credits",
          href: "/benefits",
          label: "Set up credits",
          detail: "Track credits and protections before they expire.",
          icon: Gift,
          tone: "green" as const,
          priority: 70,
        }]
      : []),
    ...(!hasSpendData
      ? [{
          key: "ask-card",
          href: "/ask",
          label: "Ask which card to use",
          detail: "Type a merchant or purchase and get a quick answer.",
          icon: MessageCircleQuestion,
          tone: "muted" as const,
          priority: 60,
        }]
      : []),
    {
      key: "alerts",
      href: "/alerts",
      label: isPremium ? "Check upcoming alerts" : "Preview Smart Alerts",
      detail: "Fees, credits, budgets, and card changes in one place.",
      icon: Bell,
      tone: "muted" as const,
      priority: 30,
    },
  ].sort((a, b) => b.priority - a.priority).slice(0, 3);

  const primaryAction = actions[0] ?? {
    key: "ask",
    href: "/ask",
    label: "Ask which card to use",
    detail: "Get a simple answer for your next purchase.",
    icon: MessageCircleQuestion,
    tone: "muted" as const,
    priority: 0,
  };
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-3 animate-[fade-in_0.25s_ease_both] sm:space-y-5">
      <PageHeader
        className="mb-0"
        title="Home"
        description="The next few things worth paying attention to."
        actions={
          <Link href={primaryAction.href}>
            <Button className="h-10 w-full gap-1.5 sm:w-auto">
              <PrimaryIcon className="h-4 w-4" />
              {primaryAction.label}
            </Button>
          </Link>
        }
      />

      {isPremium && new Date().getMonth() === 11 && (
        <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
          <p className="text-sm font-semibold">Your year-end recap is ready</p>
          <p className="text-sm text-muted-foreground mt-1">See your annual net value, top card, and credits captured.</p>
          <Link href="/recap" className="inline-flex mt-3">
            <Button size="sm">Open Year in Review</Button>
          </Link>
        </div>
      )}

      <motion.div {...sectionMotion}>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="min-h-[104px] rounded-2xl border border-border/50 bg-card px-3 py-3.5 shadow-sm shadow-black/10">
            <p className="text-[11px] font-semibold leading-tight text-muted-foreground">Annual Value</p>
            <p className={totalAnnualValue >= 0 ? "mt-3 text-2xl font-bold text-emerald-400" : "mt-3 text-2xl font-bold text-red-400"}>
              {totalAnnualValue >= 0 ? "+" : "-"}{formatCurrency(Math.abs(totalAnnualValue))}
            </p>
            <p className="mt-2 text-[11px] leading-tight text-muted-foreground">{annualFeeCards.length} fee card{annualFeeCards.length === 1 ? "" : "s"}</p>
          </div>
          <div className="min-h-[104px] rounded-2xl border border-border/50 bg-card px-3 py-3.5 shadow-sm shadow-black/10">
            <p className="text-[11px] font-semibold leading-tight text-muted-foreground">Credits Left</p>
            <p className="mt-3 text-2xl font-bold text-primary">{formatCurrency(totalCreditsRemaining)}</p>
            <p className="mt-2 text-[11px] leading-tight text-muted-foreground">of {formatCurrency(totalCreditsValue)}</p>
          </div>
          <div className="min-h-[104px] rounded-2xl border border-border/50 bg-card px-3 py-3.5 shadow-sm shadow-black/10">
            <p className="text-[11px] font-semibold leading-tight text-muted-foreground">Wallet</p>
            <p className="mt-3 text-2xl font-bold">{cards.length}</p>
            <p className="mt-2 text-[11px] leading-tight text-muted-foreground">active card{cards.length === 1 ? "" : "s"}</p>
          </div>
        </div>
      </motion.div>

      <motion.div {...sectionMotion}>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Next actions</p>
              <p className="text-sm text-muted-foreground">Only the top priorities for now.</p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.key}
                  href={action.href}
                  className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-background/50 p-3 transition-colors hover:bg-muted/40"
                >
                  <span className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border", toneClasses[action.tone])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{action.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{action.detail}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
