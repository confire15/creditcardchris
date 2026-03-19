"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, SpendingCategory, CardTemplate } from "@/lib/types/database";
import { rankCardsForCategory, getCardName, getCardColor, getMultiplierForCategory } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/constants/categories";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, CreditCard, TrendingUp, ExternalLink, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { APPLY_LINKS } from "@/lib/constants/affiliate-links";

type CardSuggestion = {
  template: CardTemplate;
  projectedAnnualPts: number;
  upliftPts: number;
  netValueDollars: number;
};

export function RecommendTool({ userId, isPremium }: { userId: string; isPremium: boolean }) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SpendingCategory | null>(null);
  const [spendAmount, setSpendAmount] = useState("100");
  const [cpp] = useState("1.5");
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [cardsRes, catsRes] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*), rewards:user_card_rewards(*)")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("spending_categories")
        .select("*")
        .order("display_name"),
    ]);
    const userCards: UserCard[] = cardsRes.data ?? [];
    setCards(userCards);
    setCategories(catsRes.data ?? []);
    setLoading(false);

    const userTemplateIds = userCards
      .map((c) => c.card_template_id)
      .filter(Boolean) as string[];

    let templatesQuery = supabase
      .from("card_templates")
      .select("*, rewards:card_template_rewards(*)");
    if (userTemplateIds.length > 0) {
      templatesQuery = templatesQuery.not("id", "in", `(${userTemplateIds.join(",")})`);
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const [templatesRes, txRes] = await Promise.all([
      templatesQuery,
      supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("user_id", userId)
        .gte("transaction_date", twelveMonthsAgo.toISOString().slice(0, 10)),
    ]);

    const templates = (templatesRes.data ?? []) as CardTemplate[];
    const txData = txRes.data ?? [];

    if (txData.length === 0 || templates.length === 0) return;

    const catSpend: Record<string, number> = {};
    txData.forEach((tx) => {
      catSpend[tx.category_id] = (catSpend[tx.category_id] ?? 0) + tx.amount;
    });
    const totalSpend = Object.values(catSpend).reduce((s, v) => s + v, 0);
    if (totalSpend === 0) return;

    const currentRewards = Object.entries(catSpend).reduce((sum, [catId, spend]) => {
      const bestRate = userCards.length > 0
        ? Math.max(...userCards.map((c) => getMultiplierForCategory(c, catId)))
        : 1;
      return sum + spend * bestRate;
    }, 0);

    const scored: CardSuggestion[] = templates.map((template) => {
      const projectedAnnualPts = Object.entries(catSpend).reduce((sum, [catId, spend]) => {
        const rate =
          template.rewards?.find((r) => r.category_id === catId)?.multiplier ??
          template.base_reward_rate;
        return sum + spend * rate;
      }, 0);
      const upliftPts = projectedAnnualPts - currentRewards;
      const netValueDollars = (upliftPts * 1.5) / 100 - template.annual_fee;
      return { template, projectedAnnualPts, upliftPts, netValueDollars };
    });

    setSuggestions(
      scored.sort((a, b) => b.netValueDollars - a.netValueDollars).slice(0, 3)
    );
  }, [userId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAiQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/recommend-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "AI classification failed.");
      } else if (data.categoryId) {
        const match = categories.find((c) => c.id === data.categoryId);
        if (match) setSelectedCategory(match);
      } else {
        toast.error("Couldn't classify that purchase — try a different phrasing.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (selectedCategory && resultsRef.current) {
      const y = resultsRef.current.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [selectedCategory]);

  const ranked = selectedCategory ? rankCardsForCategory(cards, selectedCategory.id) : [];
  const amount = parseFloat(spendAmount) || 0;
  const cppValue = parseFloat(cpp) || 1.5;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 w-24 bg-muted animate-pulse rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Best Card Finder</h1>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <CreditCard className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-3">No cards in wallet</h3>
          <p className="text-muted-foreground text-base max-w-sm mx-auto">
            Add at least one card to your wallet to get recommendations.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Horizontal category scroll */}
          <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2.5 min-w-max">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon ?? "circle-dot"];
                const color = CATEGORY_COLORS[cat.name] ?? "#9ca3af";
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border text-center transition-all min-w-[84px] ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    {Icon && (
                      <Icon
                        className="w-6 h-6"
                        style={{ color: isSelected ? "white" : color }}
                      />
                    )}
                    <span className="text-[11px] font-medium leading-tight">
                      {cat.display_name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI query */}
          {isPremium ? (
            <form onSubmit={handleAiQuery} className="flex gap-2">
              <div className="relative flex-1">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder='Describe a purchase, e.g. "groceries at Whole Foods"'
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <button
                type="submit"
                disabled={aiLoading || !aiQuery.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-opacity"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask AI"}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">AI Purchase Classifier</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Premium</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Describe any purchase and AI picks the best card
                </p>
              </div>
              <a
                href="/settings"
                className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Upgrade
              </a>
            </div>
          )}

          {/* Results */}
          {selectedCategory && (
            <div ref={resultsRef} className="space-y-4">
              {/* Header + spend input */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-semibold text-base">
                  Best for{" "}
                  <span className="text-primary">{selectedCategory.display_name}</span>
                </h2>
                <div className="flex items-center gap-2">
                  <Label htmlFor="spendAmount" className="text-xs text-muted-foreground whitespace-nowrap">
                    Projected on
                  </Label>
                  <div className="relative w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="spendAmount"
                      type="number"
                      min="0"
                      value={spendAmount}
                      onChange={(e) => setSpendAmount(e.target.value)}
                      className="pl-6 h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Card rows */}
              <div className="space-y-3">
                {ranked.map(({ card, multiplier, rewardUnit }, index) => {
                  const projectedRewards = amount * multiplier;
                  const dollarValue = (projectedRewards * cppValue) / 100;
                  const isBest = index === 0;
                  const color = getCardColor(card);
                  const isCash =
                    rewardUnit === "%" ||
                    (card.card_template?.reward_type ?? "").toLowerCase().includes("cash");
                  const rewardLabel = isCash
                    ? `${multiplier}% back`
                    : `${multiplier}x ${rewardUnit}`;
                  const projectedLabel =
                    amount > 0
                      ? `Projected on $${amount}: ${
                          isCash
                            ? formatCurrency((amount * multiplier) / 100)
                            : formatCurrency(dollarValue)
                        }`
                      : null;

                  return (
                    <div
                      key={card.id}
                      className="flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-border bg-card transition-all"
                      style={
                        isBest
                          ? { borderLeftColor: "#d4621a", borderLeftWidth: "3px" }
                          : undefined
                      }
                    >
                      {/* Mini card visual */}
                      <div
                        className="w-16 h-11 rounded-lg flex-shrink-0 relative overflow-hidden shadow-md"
                        style={{ backgroundColor: color }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-black/30" />
                      </div>

                      {/* Card info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base truncate leading-tight">
                          {getCardName(card)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(card as any).card_template?.issuer ?? ""}
                          {card.last_four ? ` · ••${card.last_four}` : ""}
                        </p>
                      </div>

                      {/* Reward + Select */}
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                        <p
                          className={`font-bold text-sm sm:text-base leading-tight ${
                            isBest ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {rewardLabel}
                        </p>
                        {projectedLabel && (
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {projectedLabel}
                          </p>
                        )}
                        <button
                          onClick={() =>
                            toast.success(
                              `Use ${getCardName(card)} for ${selectedCategory.display_name}!`
                            )
                          }
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                            isBest
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  );
                })}

                {ranked.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No cards found. Add cards to your wallet to see recommendations.
                  </div>
                )}
              </div>

              {/* Comparison note */}
              {ranked.length > 1 && amount > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Using{" "}
                  <span className="font-medium">{getCardName(ranked[0].card)}</span>{" "}
                  instead of{" "}
                  <span className="font-medium">
                    {getCardName(ranked[ranked.length - 1].card)}
                  </span>{" "}
                  earns{" "}
                  <span className="font-medium text-primary">
                    {(
                      (ranked[0].multiplier - ranked[ranked.length - 1].multiplier) *
                      amount
                    ).toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
                    more {ranked[0].rewardUnit}
                  </span>{" "}
                  on {formatCurrency(amount)} spent
                </p>
              )}
            </div>
          )}

          {/* Cards to Consider */}
          {suggestions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Cards to Consider</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  Based on your last 12 months of spending, these could boost your rewards
                </p>
                <div className="space-y-3">
                  {suggestions.map(({ template, projectedAnnualPts, upliftPts }, index) => {
                    const netWithCpp = (upliftPts * cppValue) / 100 - template.annual_fee;
                    const isPositive = netWithCpp > 0;
                    return (
                      <div
                        key={template.id}
                        className={`flex items-center gap-4 p-5 rounded-2xl border transition-colors ${
                          index === 0
                            ? "border-primary/30 bg-primary/[0.04]"
                            : "border-border bg-card"
                        }`}
                      >
                        <div
                          className="w-12 h-8 rounded-lg flex-shrink-0 relative overflow-hidden"
                          style={{ backgroundColor: template.color ?? "#d4621a" }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-black/25" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-base truncate">{template.name}</p>
                            {index === 0 && <Badge className="text-xs py-0">Top Pick</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {template.issuer} ·{" "}
                            {template.annual_fee > 0
                              ? `$${template.annual_fee}/yr`
                              : "No fee"}{" "}
                            · {template.base_reward_rate}x base
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ~
                            {projectedAnnualPts.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}{" "}
                            pts/yr projected
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 space-y-1.5">
                          <p
                            className={`font-bold text-sm ${
                              isPositive ? "text-emerald-400" : "text-muted-foreground"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {formatCurrency(netWithCpp)}/yr
                          </p>
                          {APPLY_LINKS[template.name] && (
                            <a
                              href={APPLY_LINKS[template.name]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Apply <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
