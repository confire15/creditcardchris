"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  UserCard,
  SpendingCategory,
  StatementCredit,
  CardPerk,
  CardTemplate,
  CardDowngradePath,
  UserCategorySpend,
} from "@/lib/types/database";
import {
  getCardName,
  getCardColor,
  getMultiplierForCategory,
  getRewardUnit,
} from "@/lib/utils/rewards";
import { getDefaultCpp } from "@/lib/constants/default-spend";
import { Scale, CreditCard, Loader2, LayoutList, LayoutGrid } from "lucide-react";
import { CardVerdict } from "./card-verdict";
import { ValueBreakdown } from "./value-breakdown";
import { AlternativeCard } from "./alternative-card";
import { DowngradePaths } from "./downgrade-paths";

export type CardAnalysis = {
  card: UserCard;
  annualFee: number;
  creditsValue: number;
  credits: StatementCredit[];
  perks: CardPerk[];
  perksValue: number;
  benefitsValue: number; // creditsValue + perksValue
  rewardsValue: number;
  totalValue: number;
  netValue: number;
  bestAlternative: AlternativeAnalysis | null;
  allAlternatives: AlternativeAnalysis[];
  downgradePaths: CardDowngradePath[];
  verdict: "keep" | "cancel" | "close_call";
};

export type AlternativeAnalysis = {
  template: CardTemplate;
  rewardsValue: number;
};

export function KeepOrCancelPage({
  userId,
  isPremium,
}: {
  userId: string;
  isPremium: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [credits, setCredits] = useState<StatementCredit[]>([]);
  const [perks, setPerks] = useState<CardPerk[]>([]);
  const [freeTemplates, setFreeTemplates] = useState<CardTemplate[]>([]);
  const [downgradePaths, setDowngradePaths] = useState<CardDowngradePath[]>([]);
  const [categorySpend, setCategorySpend] = useState<Record<string, number>>({});
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "table">("list");
  const spendSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [cardsRes, catsRes, creditsRes, perksRes, templatesRes, pathsRes, spendRes] =
      await Promise.all([
        supabase
          .from("user_cards")
          .select("*, card_template:card_templates(*, rewards:card_template_rewards(*)), rewards:user_card_rewards(*)")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase.from("spending_categories").select("*").order("display_name"),
        supabase.from("statement_credits").select("*").eq("user_id", userId),
        supabase
          .from("card_perks")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true),
        supabase
          .from("card_templates")
          .select("*, rewards:card_template_rewards(*)")
          .eq("annual_fee", 0),
        supabase
          .from("card_downgrade_paths")
          .select("*, from_template:card_templates!card_downgrade_paths_from_template_id_fkey(*), to_template:card_templates!card_downgrade_paths_to_template_id_fkey(*)"),
        supabase
          .from("user_category_spend")
          .select("*")
          .eq("user_id", userId),
      ]);

    setCards(cardsRes.data ?? []);
    setCategories(catsRes.data ?? []);
    setCredits(creditsRes.data ?? []);
    setPerks(perksRes.data ?? []);
    setFreeTemplates(templatesRes.data ?? []);
    setDowngradePaths(pathsRes.data ?? []);

    // Build category spend map from saved data only (no defaults — 0 if not set)
    const spendMap: Record<string, number> = {};
    const cats = catsRes.data ?? [];
    for (const cat of cats) {
      const saved = (spendRes.data ?? []).find((s: UserCategorySpend) => s.category_id === cat.id);
      spendMap[cat.id] = saved ? Number(saved.monthly_amount) : 0;
    }
    setCategorySpend(spendMap);

    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute analysis for each annual-fee card
  const annualFeeCards = cards.filter(
    (c) => (c.card_template?.annual_fee ?? 0) > 0
  );

  function computeRewardsValue(
    card: UserCard | { card_template?: CardTemplate | null; rewards?: { category_id: string; multiplier: number }[]; custom_base_reward_rate?: number | null },
    cats: SpendingCategory[],
    spend: Record<string, number>,
    cpp: number
  ): number {
    let total = 0;
    for (const cat of cats) {
      const annual = spend[cat.id] ?? 0;
      if (annual === 0) continue; // Skip categories with no stated spend
      const multiplier =
        "user_id" in card
          ? getMultiplierForCategory(card as UserCard, cat.id)
          : getTemplateMultiplier(card as CardTemplate, cat.id);
      total += annual * multiplier * (cpp / 100);
    }
    return Math.round(total * 100) / 100;
  }

  function getTemplateMultiplier(template: CardTemplate, categoryId: string): number {
    const reward = template.rewards?.find((r) => r.category_id === categoryId);
    return reward?.multiplier ?? template.base_reward_rate;
  }

  function analyzeCard(card: UserCard): CardAnalysis {
    const annualFee = card.card_template?.annual_fee ?? 0;
    const rewardUnit = getRewardUnit(card);
    const cpp = getDefaultCpp(rewardUnit);

    // Credits — use only credits the user plans to actually use for the verdict
    const cardCredits = credits.filter((c) => c.user_card_id === card.id);
    const creditsValue = cardCredits
      .filter((c) => c.will_use)
      .reduce((s, c) => s + c.annual_amount, 0);

    // Perks
    const cardPerks = perks.filter((p) => p.user_card_id === card.id);
    const perksValue = cardPerks.reduce((s, p) => s + (p.annual_value ?? 0), 0);

    // Rewards — based on user's saved category spend
    const rewardsValue = computeRewardsValue(card, categories, categorySpend, cpp);

    // Find best free alternatives
    const alternatives: AlternativeAnalysis[] = freeTemplates
      .map((template) => ({
        template,
        rewardsValue: computeRewardsValue(
          template,
          categories,
          categorySpend,
          getDefaultCpp(template.reward_unit)
        ),
      }))
      .sort((a, b) => b.rewardsValue - a.rewardsValue);

    const bestAlternative = alternatives[0] ?? null;

    // Downgrade paths for this card's template
    const cardPaths = card.card_template_id
      ? downgradePaths.filter((p) => p.from_template_id === card.card_template_id)
      : [];

    const benefitsValue = creditsValue + perksValue;
    const totalValue = benefitsValue + rewardsValue;
    const netValue = totalValue - annualFee;
    const altValue = bestAlternative?.rewardsValue ?? 0;
    const advantage = netValue - altValue;

    let verdict: "keep" | "cancel" | "close_call";
    if (advantage >= 50) verdict = "keep";
    else if (advantage <= -50) verdict = "cancel";
    else verdict = "close_call";

    return {
      card,
      annualFee,
      creditsValue,
      credits: cardCredits,
      perks: cardPerks,
      perksValue,
      benefitsValue,
      rewardsValue,
      totalValue,
      netValue,
      bestAlternative,
      allAlternatives: alternatives.slice(0, 3),
      downgradePaths: cardPaths,
      verdict,
    };
  }

  const analyses = annualFeeCards.map(analyzeCard);

  const handleSpendChange = (categoryId: string, amount: number) => {
    setCategorySpend((prev) => ({ ...prev, [categoryId]: amount }));
    if (spendSaveTimer.current) clearTimeout(spendSaveTimer.current);
    spendSaveTimer.current = setTimeout(() => {
      supabase
        .from("user_category_spend")
        .upsert(
          { user_id: userId, category_id: categoryId, monthly_amount: amount, source: "manual" as const },
          { onConflict: "user_id,category_id" }
        );
    }, 600);
  };

  const handleToggleCredit = async (creditId: string) => {
    const credit = credits.find((c) => c.id === creditId);
    if (!credit) return;
    const newWillUse = !credit.will_use;
    setCredits((prev) => prev.map((c) => (c.id === creditId ? { ...c, will_use: newWillUse } : c)));
    await supabase.from("statement_credits").update({ will_use: newWillUse }).eq("id", creditId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (annualFeeCards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Keep or Cancel</h1>
          <p className="text-muted-foreground text-base mt-2">
            Analyze whether your annual-fee cards are worth keeping
          </p>
        </div>
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <CreditCard className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-3">No annual-fee cards</h3>
          <p className="text-muted-foreground text-base max-w-sm mx-auto">
            Add cards with annual fees to your wallet to analyze whether they're worth keeping.
          </p>
        </div>
      </div>
    );
  }

  // Auto-expand if only one card
  const effectiveExpanded = annualFeeCards.length === 1 ? annualFeeCards[0].id : expandedCardId;

  const totalFees = analyses.reduce((s, a) => s + a.annualFee, 0);
  const totalNet = analyses.reduce((s, a) => s + a.netValue, 0);
  const keepCount = analyses.filter((a) => a.verdict === "keep").length;
  const cancelCount = analyses.filter((a) => a.verdict === "cancel").length;
  const closeCount = analyses.filter((a) => a.verdict === "close_call").length;
  const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString("en-US");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-28">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Keep or Cancel</h1>
        <p className="text-muted-foreground text-base mt-2">
          Should you keep paying for your premium cards?
        </p>
      </div>

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border/60 rounded-2xl px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Annual Fees</p>
          <p className="text-xl font-bold text-red-400">${fmt(totalFees)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Net Value</p>
          <p className={`text-xl font-bold ${totalNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalNet >= 0 ? "+" : "-"}${fmt(totalNet)}
          </p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Verdicts</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {keepCount > 0 && <span className="text-xs font-bold text-emerald-400">{keepCount}K</span>}
            {cancelCount > 0 && <span className="text-xs font-bold text-red-400">{cancelCount}C</span>}
            {closeCount > 0 && <span className="text-xs font-bold text-amber-400">{closeCount}?</span>}
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex justify-end mb-2">
        <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-xl border border-border/50">
          <button
            onClick={() => setViewMode("list")}
            title="List view"
            className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            title="Table view"
            className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
          <div className="divide-y divide-border/40">
            {analyses.map((analysis) => {
              const verdictColor = { keep: "#22c55e", cancel: "#ef4444", close_call: "#f59e0b" }[analysis.verdict];
              const verdictLabel = { keep: "KEEP", cancel: "CANCEL", close_call: "CLOSE CALL" }[analysis.verdict];
              const verdictClass = {
                keep: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
                cancel: "bg-red-500/15 text-red-500 border-red-500/30",
                close_call: "bg-amber-500/15 text-amber-500 border-amber-500/30",
              }[analysis.verdict];
              return (
                <div key={analysis.card.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: verdictColor }} />
                  <div className="w-8 h-5 rounded-md flex-shrink-0" style={{ backgroundColor: getCardColor(analysis.card) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getCardName(analysis.card)}</p>
                    <p className="text-xs text-muted-foreground">${fmt(analysis.annualFee)}/yr</p>
                  </div>
                  <span className={`text-xs font-semibold ${analysis.netValue >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                    {analysis.netValue >= 0 ? "+" : "-"}${fmt(analysis.netValue)}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${verdictClass}`}>
                    {verdictLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      <div className="space-y-4">
        {analyses.map((analysis) => {
          const isExpanded = effectiveExpanded === analysis.card.id;

          return (
            <div
              key={analysis.card.id}
              className="rounded-2xl bg-card border border-border/60 overflow-hidden"
            >
              {/* Verdict header — always visible */}
              <CardVerdict
                analysis={analysis}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpandedCardId(isExpanded ? null : analysis.card.id)
                }
              />

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-border/60">
                  {/* Value Breakdown (premium gets full detail) */}
                  <ValueBreakdown
                    analysis={analysis}
                    isPremium={isPremium}
                    categories={categories}
                    categorySpend={categorySpend}
                    onSpendChange={handleSpendChange}
                    onToggleCredit={handleToggleCredit}
                  />

                  {/* Best Alternative */}
                  <AlternativeCard
                    analysis={analysis}
                    isPremium={isPremium}
                  />

                  {/* Downgrade Paths (premium) */}
                  {analysis.downgradePaths.length > 0 && (
                    <DowngradePaths
                      paths={analysis.downgradePaths}
                      isPremium={isPremium}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
