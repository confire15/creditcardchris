"use client";

import { useCallback, useEffect, useState } from "react";
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
import { DEFAULT_MONTHLY_SPEND, getDefaultCpp } from "@/lib/constants/default-spend";
import { Scale, CreditCard, Loader2 } from "lucide-react";
import { CardVerdict } from "./card-verdict";
import { ValueBreakdown } from "./value-breakdown";
import { SpendingInput } from "./spending-input";
import { AlternativeCard } from "./alternative-card";
import { DowngradePaths } from "./downgrade-paths";
import { ScenarioSlider } from "./scenario-slider";

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
  const [savedSpend, setSavedSpend] = useState<UserCategorySpend[]>([]);
  const [cppOverride, setCppOverride] = useState<number | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
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
    setSavedSpend(spendRes.data ?? []);

    // Build category spend map: saved > defaults
    const spendMap: Record<string, number> = {};
    const cats = catsRes.data ?? [];
    for (const cat of cats) {
      const saved = (spendRes.data ?? []).find((s: UserCategorySpend) => s.category_id === cat.id);
      spendMap[cat.id] = saved ? Number(saved.monthly_amount) : (DEFAULT_MONTHLY_SPEND[cat.name] ?? 100);
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
      const monthly = spend[cat.id] ?? 0;
      const annual = monthly * 12;
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
    const cpp = cppOverride ?? getDefaultCpp(rewardUnit);

    // Credits — use only credits the user plans to actually use for the verdict
    const cardCredits = credits.filter((c) => c.user_card_id === card.id);
    const creditsValue = cardCredits
      .filter((c) => c.will_use)
      .reduce((s, c) => s + c.annual_amount, 0);

    // Perks
    const cardPerks = perks.filter((p) => p.user_card_id === card.id);
    const perksValue = cardPerks.reduce((s, p) => s + (p.annual_value ?? 0), 0);

    // Rewards
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

  const handleSpendChange = async (categoryId: string, amount: number) => {
    setCategorySpend((prev) => ({ ...prev, [categoryId]: amount }));

    if (isPremium) {
      const existing = savedSpend.find((s) => s.category_id === categoryId);
      if (existing) {
        await supabase
          .from("user_category_spend")
          .update({ monthly_amount: amount, source: "manual", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_category_spend").insert({
          user_id: userId,
          category_id: categoryId,
          monthly_amount: amount,
          source: "manual",
        });
      }
    }
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-28">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Keep or Cancel</h1>
        <p className="text-muted-foreground text-base mt-2">
          Should you keep paying for your premium cards?
        </p>
      </div>

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
                    cppOverride={cppOverride}
                  />

                  {/* Spending Input (premium) */}
                  {isPremium && (
                    <SpendingInput
                      categories={categories}
                      categorySpend={categorySpend}
                      onSpendChange={handleSpendChange}
                    />
                  )}

                  {/* Scenario Slider (premium) */}
                  {isPremium && (
                    <ScenarioSlider
                      cppOverride={cppOverride}
                      rewardUnit={getRewardUnit(analysis.card)}
                      onCppChange={setCppOverride}
                    />
                  )}

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
    </div>
  );
}
