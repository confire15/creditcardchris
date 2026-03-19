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
import { Sparkles, CreditCard, Trophy, TrendingUp, ExternalLink, Loader2, Lock, ArrowUp } from "lucide-react";
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
  const [cpp, setCpp] = useState("1.5"); // cents per point
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
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

    // Compute AI card suggestions
    const userTemplateIds = userCards
      .map((c) => c.card_template_id)
      .filter(Boolean) as string[];

    // Fetch card templates NOT already in wallet
    let templatesQuery = supabase
      .from("card_templates")
      .select("*, rewards:card_template_rewards(*)");
    if (userTemplateIds.length > 0) {
      templatesQuery = templatesQuery.not(
        "id",
        "in",
        `(${userTemplateIds.join(",")})`
      );
    }

    // Fetch user's last 12 months of spending
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

    // Build spending by category
    const catSpend: Record<string, number> = {};
    txData.forEach((tx) => {
      catSpend[tx.category_id] = (catSpend[tx.category_id] ?? 0) + tx.amount;
    });
    const totalSpend = Object.values(catSpend).reduce((s, v) => s + v, 0);
    if (totalSpend === 0) return;

    // Compute current best rewards per category
    const currentRewards = Object.entries(catSpend).reduce((sum, [catId, spend]) => {
      const bestRate = userCards.length > 0
        ? Math.max(...userCards.map((c) => getMultiplierForCategory(c, catId)))
        : 1;
      return sum + spend * bestRate;
    }, 0);

    // Score each template
    const scored: CardSuggestion[] = templates.map((template) => {
      const projectedAnnualPts = Object.entries(catSpend).reduce(
        (sum, [catId, spend]) => {
          const rate =
            template.rewards?.find((r) => r.category_id === catId)?.multiplier ??
            template.base_reward_rate;
          return sum + spend * rate;
        },
        0
      );
      const upliftPts = projectedAnnualPts - currentRewards;
      const cppVal = 1.5; // use default 1.5¢/pt for suggestion scoring
      const netValueDollars = (upliftPts * cppVal) / 100 - template.annual_fee;
      return { template, projectedAnnualPts, upliftPts, netValueDollars };
    });

    // Top 3 by net value
    const top3 = scored
      .sort((a, b) => b.netValueDollars - a.netValueDollars)
      .slice(0, 3);

    setSuggestions(top3);
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
        toast.error(data.error ?? "AI classification failed. Check that ANTHROPIC_API_KEY is set.");
      } else if (data.categoryId) {
        const match = categories.find((c) => c.id === data.categoryId);
        if (match) setSelectedCategory(match);
      } else {
        toast.error("Couldn't classify that purchase — try rephrasing or pick a category manually.");
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

  const ranked = selectedCategory
    ? rankCardsForCategory(cards, selectedCategory.id)
    : [];

  const amount = parseFloat(spendAmount) || 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Best Card</h1>
        <p className="text-muted-foreground text-base mt-2">
          Pick a spending category to see which card earns the most rewards
        </p>
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
        <div className="space-y-8">
          {/* AI query */}
          {isPremium ? (
            <form onSubmit={handleAiQuery} className="flex gap-2">
              <div className="relative flex-1">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder='Describe a purchase, e.g. "groceries at Whole Foods" or "United flight to NYC"'
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
            <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">AI Assistant</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Premium</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Describe any purchase and AI will find the best card to use
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

          {/* Category grid */}
          <div ref={categoriesRef}>
            <p className="text-sm font-medium mb-3">Or select a category</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon ?? "circle-dot"];
                const color = CATEGORY_COLORS[cat.name] ?? "#9ca3af";
                const isSelected = selectedCategory?.id === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                        : "border-border bg-card hover:bg-muted/30 hover:border-muted-foreground/20"
                    }`}
                  >
                    {Icon && (
                      <Icon
                        className="w-8 h-8"
                        style={{ color: isSelected ? "var(--color-primary)" : color }}
                      />
                    )}
                    <span className="text-xs sm:text-sm font-medium leading-tight">
                      {cat.display_name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results */}
          {selectedCategory && (
            <div ref={resultsRef} className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">
                    Best cards for{" "}
                    <span className="text-primary">{selectedCategory.display_name}</span>
                  </h2>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="spendAmount" className="text-sm whitespace-nowrap">
                      Spend:
                    </Label>
                    <div className="relative w-28">
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
                  <div className="flex items-center gap-2">
                    <Label htmlFor="cpp" className="text-sm whitespace-nowrap text-muted-foreground">
                      ¢/pt:
                    </Label>
                    <Input
                      id="cpp"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={cpp}
                      onChange={(e) => setCpp(e.target.value)}
                      className="w-16 h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                {/* Sticky scroll-back button */}
                <div className="sticky top-20 flex-shrink-0">
                  <button
                    onClick={() => {
                      const el = categoriesRef.current;
                      if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 88;
                        window.scrollTo({ top: y, behavior: "smooth" });
                      }
                    }}
                    title="Back to categories"
                    className="flex flex-col items-center gap-1.5 px-1.5 sm:px-2 py-2.5 sm:py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span
                      className="hidden sm:block text-[10px] font-medium leading-none"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    >
                      Categories
                    </span>
                  </button>
                </div>

                {/* Card rows */}
                <div className="flex-1 space-y-3">
                {ranked.map(({ card, multiplier, rewardUnit }, index) => {
                  const projectedRewards = amount * multiplier;
                  const cppValue = parseFloat(cpp) || 0;
                  const dollarValue = (projectedRewards * cppValue) / 100;
                  const isBest = index === 0;
                  const annualFee = card.card_template?.annual_fee ?? 0;
                  // Annual spend needed in this category to break even on the annual fee
                  const breakEvenSpend = annualFee > 0 && multiplier > 1
                    ? Math.ceil(annualFee / ((multiplier - 1) * 0.01))
                    : 0;

                  return (
                    <div
                      key={card.id}
                      className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-5 rounded-2xl border transition-colors ${
                        isBest
                          ? "border-primary/30 bg-primary/[0.06]"
                          : "border-border bg-card"
                      }`}
                    >
                      {/* Rank */}
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 ${
                          isBest
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isBest ? <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : index + 1}
                      </div>

                      {/* Card color swatch — desktop only */}
                      <div
                        className="hidden sm:block w-12 h-8 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: getCardColor(card) }}
                      />

                      {/* Card info + rewards (rewards inline on mobile) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-sm sm:text-base truncate">
                                {getCardName(card)}
                              </p>
                              {isBest && (
                                <Badge className="text-xs py-0 flex-shrink-0">Best Pick</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {multiplier}x {rewardUnit}
                              {card.last_four ? ` · ••${card.last_four}` : ""}
                              {annualFee > 0 ? ` · $${annualFee}/yr` : " · No fee"}
                            </p>
                            {annualFee > 0 && breakEvenSpend > 0 && (
                              <p className="text-xs text-amber-500/80 mt-0.5 hidden sm:block">
                                Need ${breakEvenSpend.toLocaleString()}/yr here to offset fee
                              </p>
                            )}
                          </div>

                          {/* Rewards — always visible, inline on right */}
                          <div className="text-right flex-shrink-0">
                            {amount > 0 ? (
                              <>
                                <p className={`font-bold text-sm sm:text-base ${isBest ? "text-primary" : "text-foreground"}`}>
                                  +{projectedRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                                {cppValue > 0 && (
                                  <p className="text-xs text-emerald-400 font-medium">
                                    ≈ {formatCurrency(dollarValue)}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground hidden sm:block">{rewardUnit}</p>
                              </>
                            ) : (
                              <p className="font-bold text-sm">{multiplier}x</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {ranked.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No cards found. Add cards to your wallet to see recommendations.
                  </div>
                )}
                </div>{/* end flex-1 card rows */}
              </div>{/* end flex gap-3 */}

              {ranked.length > 1 && amount > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Using{" "}
                  <span className="font-medium">{getCardName(ranked[0].card)}</span>{" "}
                  instead of{" "}
                  <span className="font-medium">{getCardName(ranked[ranked.length - 1].card)}</span>{" "}
                  earns you{" "}
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

          {/* AI Card Suggestions */}
          {suggestions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Cards to Consider</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  Based on your last 12 months of spending, these cards could boost your rewards
                </p>

                <div className="space-y-3">
                  {suggestions.map(({ template, projectedAnnualPts, upliftPts, netValueDollars }, index) => {
                    const cppVal = parseFloat(cpp) || 1.5;
                    const netWithCpp = (upliftPts * cppVal) / 100 - template.annual_fee;
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
                        {/* Color swatch */}
                        <div
                          className="w-12 h-8 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: template.color ?? "#d4621a" }}
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-base truncate">{template.name}</p>
                            {index === 0 && (
                              <Badge className="text-xs py-0">Top Pick</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {template.issuer} ·{" "}
                            {template.annual_fee > 0 ? `$${template.annual_fee}/yr` : "No fee"} ·{" "}
                            {template.base_reward_rate}x base
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ~{projectedAnnualPts.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts/yr projected
                          </p>
                        </div>

                        {/* Value + Apply */}
                        <div className="text-right flex-shrink-0 space-y-1.5">
                          <p className={`font-bold text-sm ${isPositive ? "text-emerald-400" : "text-muted-foreground"}`}>
                            {isPositive ? "+" : ""}{formatCurrency(netWithCpp)}/yr
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {upliftPts > 0 ? "+" : ""}{upliftPts.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts uplift
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
                <p className="text-xs text-muted-foreground text-center">
                  Net value = (extra pts × {cpp}¢) − annual fee · based on your actual spending
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
