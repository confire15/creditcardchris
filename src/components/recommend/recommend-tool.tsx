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
import {
  Sparkles,
  CreditCard,
  Trophy,
  TrendingUp,
  ExternalLink,
  Loader2,
  Lock,
  ArrowUp,
  Search,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { APPLY_LINKS } from "@/lib/constants/affiliate-links";
import { getDefaultCpp } from "@/lib/constants/default-spend";
import { isBelowBreakEven, breakEvenAnnualSpend } from "./recommend-math";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const KEYWORD_MAP: Record<string, string> = {
  starbucks: "dining", coffee: "dining", cafe: "dining", restaurant: "dining",
  dinner: "dining", lunch: "dining", breakfast: "dining", bar: "dining", food: "dining",
  "fast food": "fast_food", mcdonalds: "fast_food", burger: "fast_food",
  "taco bell": "fast_food", wendy: "fast_food", chick: "fast_food",
  grocery: "groceries", groceries: "groceries", supermarket: "groceries",
  "whole foods": "groceries", "trader joe": "groceries", kroger: "groceries",
  safeway: "groceries", publix: "groceries",
  gas: "gas", "gas station": "gas", shell: "gas", chevron: "gas", bp: "gas",
  exxon: "gas", mobil: "gas", "filling station": "gas",
  hotel: "hotels", marriott: "hotels", hilton: "hotels", hyatt: "hotels",
  airbnb: "hotels", "four seasons": "hotels",
  flight: "flights", airline: "flights", delta: "flights", united: "flights",
  american: "flights", southwest: "flights", jetblue: "flights",
  "car rental": "car_rental", hertz: "car_rental", enterprise: "car_rental",
  avis: "car_rental", national: "car_rental",
  uber: "transit", lyft: "transit", taxi: "transit", subway: "transit",
  metro: "transit", train: "transit", amtrak: "transit",
  netflix: "streaming", spotify: "streaming", hulu: "streaming", disney: "streaming",
  "apple music": "streaming", "apple tv": "streaming", hbo: "streaming", peacock: "streaming",
  amazon: "online_shopping", target: "online_shopping", walmart: "online_shopping",
  "best buy": "online_shopping", ebay: "online_shopping", etsy: "online_shopping",
  cvs: "drugstores", walgreens: "drugstores", pharmacy: "drugstores", "rite aid": "drugstores",
  "home depot": "home_improvement", "lowe": "home_improvement", hardware: "home_improvement",
  concert: "entertainment", movie: "entertainment", theater: "entertainment",
  amc: "entertainment", ticketmaster: "entertainment",
  costco: "wholesale_clubs", "sam's club": "wholesale_clubs", "bj's": "wholesale_clubs",
  gym: "gym_fitness", fitness: "gym_fitness", "planet fitness": "gym_fitness",
  equinox: "gym_fitness", peloton: "gym_fitness",
  electric: "utilities", utilities: "utilities", internet: "utilities",
  "cell phone": "utilities", wireless: "utilities",
};

const KEYWORD_ALIASES: Record<string, string> = {
  tjs: "trader joe",
  tj: "trader joe",
  "trader joes": "trader joe",
  "wholefood": "whole foods",
  wholefoods: "whole foods",
  "wholefoods market": "whole foods",
  "mcdonald": "mcdonalds",
};

type KeywordEntry = {
  keyword: string;
  categoryName: string;
  normalizedKeyword: string;
  compactKeyword: string;
};

type KeywordSuggestion = {
  keyword: string;
  categoryName: string;
};

const KEYWORD_MIN_FUZZY_SCORE = 0.52;
const KEYWORD_AUTO_MATCH_SCORE = 0.78;

const normalizeKeyword = (value: string) =>
  value
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const compactKeyword = (value: string) => value.replace(/\s+/g, "");

const KEYWORD_ENTRIES: KeywordEntry[] = Object.entries(KEYWORD_MAP).map(([keyword, categoryName]) => {
  const normalizedKeyword = normalizeKeyword(keyword);
  return {
    keyword,
    categoryName,
    normalizedKeyword,
    compactKeyword: compactKeyword(normalizedKeyword),
  };
});

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return curr[b.length];
}

function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

export function resolveKeywordMatch(rawQuery: string): {
  categoryName?: string;
  suggestion?: KeywordSuggestion;
} {
  const query = rawQuery.trim();
  if (!query) return {};

  const normalizedQuery = normalizeKeyword(query);
  const aliasQuery = KEYWORD_ALIASES[normalizedQuery] ?? normalizedQuery;
  const compactQuery = compactKeyword(aliasQuery);

  const exactMatch = KEYWORD_ENTRIES.find(
    (entry) =>
      entry.normalizedKeyword === aliasQuery ||
      entry.compactKeyword === compactQuery
  );
  if (exactMatch) return { categoryName: exactMatch.categoryName };

  let bestEntry: KeywordEntry | null = null;
  let bestScore = 0;
  let usedContainsMatch = false;

  for (const entry of KEYWORD_ENTRIES) {
    const containsMatch =
      aliasQuery.includes(entry.normalizedKeyword) ||
      entry.normalizedKeyword.includes(aliasQuery) ||
      compactQuery.includes(entry.compactKeyword) ||
      entry.compactKeyword.includes(compactQuery);

    const score = containsMatch
      ? 0.9
      : Math.max(
          similarityScore(aliasQuery, entry.normalizedKeyword),
          similarityScore(compactQuery, entry.compactKeyword)
        );

    if (score > bestScore) {
      bestEntry = entry;
      bestScore = score;
      usedContainsMatch = containsMatch;
    }
  }

  if (!bestEntry || bestScore < KEYWORD_MIN_FUZZY_SCORE) return {};

  if (usedContainsMatch || bestScore >= KEYWORD_AUTO_MATCH_SCORE) {
    return { categoryName: bestEntry.categoryName };
  }

  return {
    suggestion: {
      keyword: bestEntry.keyword,
      categoryName: bestEntry.categoryName,
    },
  };
}

function getBaseRate(card: UserCard): number {
  return card.card_template?.base_reward_rate ?? card.custom_base_reward_rate ?? 1;
}

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
  const [isBaseRateFallback, setIsBaseRateFallback] = useState(false);
  const [fallbackQuery, setFallbackQuery] = useState("");
  const [spendAmount, setSpendAmount] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("best-card-spend") ?? "100") : "100"
  );
  const [cpp, setCpp] = useState("1.0"); // cents per point
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [keywordSearch, setKeywordSearch] = useState("");
  const [keywordSuggestion, setKeywordSuggestion] = useState<KeywordSuggestion | null>(null);

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
      const cppVal = 1.0; // use default 1¢/pt for suggestion scoring
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

  useEffect(() => {
    if (!selectedCategory || ranked.length === 0) return;
    setCpp(String(getDefaultCpp(ranked[0].rewardUnit)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory?.id]);

  function selectCategory(cat: SpendingCategory) {
    setSelectedCategory(cat);
    setIsBaseRateFallback(false);
    setFallbackQuery("");
    setKeywordSuggestion(null);
  }

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
        if (match) selectCategory(match);
      } else {
        toast.error("Couldn't classify that purchase — try rephrasing or pick a category manually.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleKeywordSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = keywordSearch.trim();
    if (!query) return;
    const { categoryName, suggestion } = resolveKeywordMatch(query);

    if (categoryName) {
      const match = categories.find((c) => c.name === categoryName);
      if (match) {
        selectCategory(match);
        setKeywordSearch("");
        return;
      }
    }

    setKeywordSuggestion(suggestion ?? null);
    setSelectedCategory(null);
    setIsBaseRateFallback(true);
    setFallbackQuery(query);
  }

  function applyKeywordSuggestion() {
    if (!keywordSuggestion) return;
    const match = categories.find((c) => c.name === keywordSuggestion.categoryName);
    if (!match) return;
    selectCategory(match);
    setKeywordSearch("");
  }

  useEffect(() => {
    if ((selectedCategory || isBaseRateFallback) && resultsRef.current) {
      const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 88;
      const y = resultsRef.current.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [isBaseRateFallback, selectedCategory]);

  // For fast_food, fall back to the dining rate for any card that has no specific fast_food entry
  const diningCategoryId = selectedCategory?.name === "fast_food"
    ? categories.find((c) => c.name === "dining")?.id
    : undefined;

  const ranked = selectedCategory
    ? rankCardsForCategory(cards, selectedCategory.id, diningCategoryId)
    : isBaseRateFallback
      ? cards
        .filter((card) => card.is_active)
        .map((card) => ({
          card,
          multiplier: getBaseRate(card),
          rewardUnit: card.card_template?.reward_unit ?? card.custom_reward_unit ?? "points",
        }))
        .sort((a, b) => {
          if (b.multiplier !== a.multiplier) return b.multiplier - a.multiplier;

          const feeA = a.card.card_template?.annual_fee ?? a.card.custom_annual_fee ?? 0;
          const feeB = b.card.card_template?.annual_fee ?? b.card.custom_annual_fee ?? 0;
          if (feeA !== feeB) return feeA - feeB;

          return getCardName(a.card).localeCompare(getCardName(b.card));
        })
      : [];

  const amount = parseFloat(spendAmount) || 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="mb-10">
          <div className="h-9 w-36 bg-muted animate-pulse rounded-xl mb-2" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.3s_ease_both]">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Best Card</h1>
        <p className="text-muted-foreground text-base mt-2">
          Tap a category to see your best card →
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <CreditCard className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-3">No cards in wallet</h3>
          <p className="text-muted-foreground text-base max-w-sm mx-auto mb-6">
            Add at least one card to your wallet to get recommendations.
          </p>
          <a
            href="/wallet"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to Wallet
          </a>
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
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-opacity"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask AI"}
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              <form onSubmit={handleKeywordSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder='Search a purchase, e.g. "Starbucks", "gas station", "Netflix"'
                    value={keywordSearch}
                    onChange={(e) => {
                      setKeywordSearch(e.target.value);
                      setKeywordSuggestion(null);
                    }}
                    className="pl-9"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!keywordSearch.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-opacity"
                >
                  Search
                </button>
              </form>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3 h-3 flex-shrink-0" />
                <span>Want AI-powered matching? <a href="/settings" className="text-primary font-medium hover:underline">Upgrade to Premium</a></span>
              </p>
              {keywordSuggestion && (
                <button
                  type="button"
                  onClick={applyKeywordSuggestion}
                  className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-300"
                >
                  Did you mean{" "}
                  <span className="font-semibold">{keywordSuggestion.keyword}</span>?
                  {categories.find((c) => c.name === keywordSuggestion.categoryName)?.display_name && (
                    <>
                      {" "}Try{" "}
                      <span className="font-semibold">
                        {categories.find((c) => c.name === keywordSuggestion.categoryName)?.display_name}
                      </span>
                      .
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Category pill row */}
          <div ref={categoriesRef}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/[0.08] text-primary">
                <MousePointerClick className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">Choose a purchase category</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Tap one to rank your cards instantly
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon ?? "circle-dot"];
                const color = CATEGORY_COLORS[cat.name] ?? "#9ca3af";
                const isSelected = selectedCategory?.id === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => selectCategory(cat)}
                    className={cn(
                      "ripple-container group inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold shadow-sm transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/40 ring-offset-1 ring-offset-background"
                        : "border-border/80 bg-card/95 text-foreground shadow-black/10 hover:border-primary/50 hover:bg-primary/[0.08] hover:shadow-md hover:shadow-black/20"
                    )}
                  >
                    {Icon && (
                      <Icon
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: isSelected ? "currentColor" : color }}
                      />
                    )}
                    {cat.display_name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results */}
          {(selectedCategory || isBaseRateFallback) && (
            <div key={selectedCategory?.id ?? `base-rate-${fallbackQuery.toLowerCase()}`} ref={resultsRef} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">
                      Best cards for{" "}
                      <span className="text-primary">
                        {selectedCategory ? selectedCategory.display_name : "this purchase"}
                      </span>
                    </h2>
                  </div>
                  {isBaseRateFallback && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      No direct category match for &quot;{fallbackQuery}&quot;. Showing the highest base-rate cards instead.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor="spendAmount" className="text-sm whitespace-nowrap">
                      Spend:
                    </Label>
                    <div className="flex items-center gap-1">
                      {[25, 50, 100, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setSpendAmount(String(preset));
                            localStorage.setItem("best-card-spend", String(preset));
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-xs font-medium border transition-all",
                            spendAmount === String(preset)
                              ? "bg-primary/20 border-primary/40 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          ${preset}
                        </button>
                      ))}
                    </div>
                    <div className="relative w-20">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        $
                      </span>
                      <Input
                        id="spendAmount"
                        type="number"
                        min="0"
                        value={spendAmount}
                        onChange={(e) => {
                          setSpendAmount(e.target.value);
                          localStorage.setItem("best-card-spend", e.target.value);
                        }}
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
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    title="Back to categories"
                    className="flex flex-col items-center gap-1.5 px-1.5 sm:px-2 py-2.5 sm:py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span
                      className="text-[10px] font-medium leading-none"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    >
                      Back to Categories
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
                  const breakEvenSpend = annualFee > 0 && multiplier > 1
                    ? Math.ceil(annualFee / ((multiplier - 1) * 0.01))
                    : 0;
                  const belowBreakEven = isBelowBreakEven(amount, annualFee, multiplier);
                  const categoryLabel = selectedCategory?.display_name ?? "this category";

                  return (
                    <div
                      key={card.id}
                      style={{ animationDelay: `${index * 60}ms` }}
                      className={cn(
                        "flex items-center gap-2 sm:gap-4 p-3 sm:p-5 rounded-2xl transition-colors animate-[slide-up-fade_0.35s_ease_both]",
                        isBest
                          ? "bg-primary/[0.10] shadow-lg shadow-black/30"
                          : "bg-card shadow-sm shadow-black/20"
                      )}
                    >
                      {/* Rank */}
                      <div
                        className={cn(
                          "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0",
                          isBest
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isBest ? <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : index + 1}
                      </div>

                      {/* Card color swatch — desktop only */}
                      <div
                        className="hidden sm:block w-12 h-8 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: getCardColor(card) }}
                      />

                      {/* Card info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base">
                                {getCardName(card)}
                              </p>
                              {isBest && (
                                <Badge className="text-[11px] px-2 py-0.5 font-semibold flex-shrink-0 shadow-sm animate-[pop-in_0.25s_cubic-bezier(0.34,1.56,0.64,1)_both]">Best Pick</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {card.last_four ? `••${card.last_four} · ` : ""}
                              {annualFee > 0 ? `$${fmt(annualFee)}/yr` : "No fee"}
                            </p>
                            {belowBreakEven && (
                              <p className="text-xs text-amber-500/90 mt-0.5">
                                Needs ${breakEvenSpend.toLocaleString()}/yr in {categoryLabel} to offset the ${fmt(annualFee)} fee
                              </p>
                            )}
                            {isBest && ranked.length > 1 && multiplier > ranked[1].multiplier && (
                              <p className="text-xs text-emerald-500 font-medium mt-0.5">
                                {(multiplier - ranked[1].multiplier).toFixed(1)}x ahead of {getCardName(ranked[1].card)}
                              </p>
                            )}
                            {isBest && ranked.length > 1 && multiplier === ranked[1].multiplier && (() => {
                              const tied = ranked
                                .slice(1)
                                .filter(r => r.multiplier === multiplier)
                                .slice(0, 2);
                              return (
                                <div className="mt-1 space-y-0.5">
                                  {tied.map(({ card: tCard, multiplier: tMult }) => {
                                    const tFee = tCard.card_template?.annual_fee ?? 0;
                                    const tBreakEven = breakEvenAnnualSpend(tFee, tMult);
                                    let note: string;
                                    if (annualFee < tFee) {
                                      note = `lower fee — save $${fmt(tFee - annualFee)}/yr`;
                                    } else if (annualFee > tFee) {
                                      const ownBreakEven = breakEvenAnnualSpend(annualFee, multiplier);
                                      note = `higher fee — needs $${ownBreakEven.toLocaleString()}/yr to justify`;
                                    } else {
                                      note = tBreakEven > 0
                                        ? `same fee — break even at $${tBreakEven.toLocaleString()}/yr`
                                        : `same rate, no fee — compare benefits`;
                                    }
                                    return (
                                      <p key={tCard.id} className="text-xs text-amber-400 font-medium">
                                        Tied · {getCardName(tCard)} · {note}
                                      </p>
                                    );
                                  })}
                                  {ranked.slice(1).filter(r => r.multiplier === multiplier).length > 2 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{ranked.slice(1).filter(r => r.multiplier === multiplier).length - 2} more tied below
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                            {isBest && amount > 0 && cppValue > 0 && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5">
                                ~{formatCurrency(dollarValue * 12)}/yr if ${fmt(amount)}/mo
                              </p>
                            )}
                          </div>

                          {/* Big multiplier callout */}
                          <div className="text-right flex-shrink-0">
                            <p className={cn(
                              "text-2xl sm:text-3xl font-bold tabular-nums leading-none",
                              isBest ? "text-primary" : "text-foreground"
                            )}>
                              {multiplier}x
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 leading-none">
                              {rewardUnit.split(" ").slice(-1)[0]}
                            </p>
                            {amount > 0 && cppValue > 0 && (
                              <p className={cn(
                                "text-sm font-semibold mt-1.5 tabular-nums",
                                isBest ? "text-primary/80" : "text-muted-foreground"
                              )}>
                                {formatCurrency(dollarValue)}
                              </p>
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
              <div className="border-t border-border/50 pt-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Based on your spending</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Cards to Consider</h2>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  These cards could boost your rewards based on your last 12 months of spending
                </p>

                <div className="space-y-3">
                  {suggestions.map(({ template, projectedAnnualPts, upliftPts, netValueDollars }, index) => {
                    const cppVal = parseFloat(cpp) || 1.5;
                    const netWithCpp = (upliftPts * cppVal) / 100 - template.annual_fee;
                    const isPositive = netWithCpp > 0;
                    return (
                      <div
                        key={template.id}
                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-5 rounded-2xl border transition-colors ${
                          index === 0
                            ? "border-primary/30 bg-primary/[0.04]"
                            : "border-border bg-card"
                        }`}
                      >
                        {/* Color swatch — desktop only */}
                        <div
                          className="hidden sm:block w-12 h-8 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: template.color ?? "#d4621a" }}
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-base">{template.name}</p>
                            {index === 0 && (
                              <Badge className="text-xs py-0">Top Pick</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {template.issuer} ·{" "}
                            {template.annual_fee > 0 ? `$${fmt(template.annual_fee)}/yr` : "No fee"} ·{" "}
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
