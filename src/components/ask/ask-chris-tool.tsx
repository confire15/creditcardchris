"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CreditCard, LayoutGrid, Loader2, MessageCircleQuestion, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CardPerk, SpendingCategory, StatementCredit, UserCard } from "@/lib/types/database";
import { RecommendTool } from "@/components/recommend/recommend-tool";
import { getDefaultCpp } from "@/lib/constants/default-spend";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import {
  calculateRewards,
  getCardColor,
  getCardName,
  getEffectiveCpp,
  getMultiplierForCategory,
  rankCardsForCategory,
} from "@/lib/utils/rewards";

type AskChrisResponse = {
  categoryId: string | null;
  categoryName: string | null;
  amount: number | null;
  merchant: string | null;
  reasoning: string;
  source: "ai" | "keyword";
};

type AskChrisToolProps = {
  userId: string;
  isPremium: boolean;
  cards: UserCard[];
  categories: SpendingCategory[];
  categoryLoadError?: string | null;
  credits: StatementCredit[];
  perks: CardPerk[];
};

type UnusedBenefit = {
  cardName: string;
  name: string;
  remaining: number;
};

const PLACEHOLDERS = ["Costco gas $84", "Dinner at Nobu", "Verizon bill"];
const SPEND_PRESETS = [25, 50, 100, 200];
const QUICK_CHIP_NAMES = ["dining", "groceries", "travel", "gas", "online_shopping", "streaming"];

function MiniCard({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("relative block flex-shrink-0 rounded-lg shadow-md shadow-black/30", className)}
      style={{ background: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color} 60%, black))` }}
      aria-hidden="true"
    >
      <span className="absolute bottom-1.5 left-1.5 h-2.5 w-3.5 rounded-[3px] bg-white/35" />
    </span>
  );
}

function isFullyUsed(perk: CardPerk): boolean {
  if (perk.value_type === "dollar") return (perk.used_value ?? 0) >= (perk.annual_value ?? 0);
  if (perk.value_type === "count") return (perk.used_count ?? 0) >= (perk.annual_count ?? 0);
  return perk.is_redeemed ?? false;
}

function creditMatchesCategory(credit: { name: string }, categoryName: string | null): boolean {
  if (!categoryName) return false;

  const name = credit.name.toLowerCase();
  const overrides: Record<string, string> = {
    uber: "dining",
    dining: "dining",
    travel: "travel",
    airline: "flights",
    hotel: "hotels",
    streaming: "streaming",
  };

  for (const [keyword, category] of Object.entries(overrides)) {
    if (name.includes(keyword)) return category === categoryName;
  }

  return name.includes(categoryName.replaceAll("_", " "));
}

function isAskChrisResponse(value: unknown): value is AskChrisResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AskChrisResponse>;
  return (
    (typeof data.categoryId === "string" || data.categoryId === null) &&
    (typeof data.categoryName === "string" || data.categoryName === null) &&
    (typeof data.amount === "number" || data.amount === null) &&
    (typeof data.merchant === "string" || data.merchant === null) &&
    typeof data.reasoning === "string" &&
    (data.source === "ai" || data.source === "keyword")
  );
}

function projectedDollarValue(amount: number, card: UserCard, categoryId: string, fallbackCategoryId?: string) {
  const directMultiplier = getMultiplierForCategory(card, categoryId);
  const fallbackMultiplier = fallbackCategoryId
    ? getMultiplierForCategory(card, categoryId, fallbackCategoryId)
    : directMultiplier;
  const rewards =
    fallbackCategoryId && fallbackMultiplier !== directMultiplier
      ? Math.round(amount * fallbackMultiplier * 100) / 100
      : calculateRewards(amount, card, categoryId);
  const rewardUnit = card.card_template?.reward_unit ?? card.custom_reward_unit ?? "points";
  const cpp = getEffectiveCpp(card, getDefaultCpp(rewardUnit));
  return (rewards * cpp) / 100;
}

export function AskChrisTool({
  userId,
  isPremium,
  cards,
  categories,
  categoryLoadError,
  credits,
  perks,
}: AskChrisToolProps) {
  const [mode, setMode] = useState<"ask" | "browse">("ask");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AskChrisResponse | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [spendOverride, setSpendOverride] = useState(100);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % PLACEHOLDERS.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

  const category = useMemo(() => {
    if (!lastResponse?.categoryId) return null;
    return categories.find((c) => c.id === lastResponse.categoryId) ?? null;
  }, [categories, lastResponse]);

  const fallbackCategoryId =
    category?.name === "fast_food" ? categories.find((c) => c.name === "dining")?.id : undefined;

  const ranked = useMemo(
    () => (category ? rankCardsForCategory(cards, category.id, fallbackCategoryId) : []),
    [cards, category, fallbackCategoryId]
  );
  const best = ranked[0];
  const displayAmount = lastResponse?.amount ?? spendOverride;
  const shouldShowSpendPills = lastResponse !== null && lastResponse.amount === null && category !== null;

  const unusedBenefit = useMemo<UnusedBenefit | null>(() => {
    if (!best || !lastResponse?.categoryName) return null;

    const matchingCredit = credits.find((credit) => {
      const remaining = (credit.annual_amount ?? 0) - (credit.used_amount ?? 0);
      return credit.user_card_id === best.card.id && remaining > 0 && creditMatchesCategory(credit, lastResponse.categoryName);
    });

    if (matchingCredit) {
      return {
        cardName: getCardName(best.card),
        name: matchingCredit.name,
        remaining: (matchingCredit.annual_amount ?? 0) - (matchingCredit.used_amount ?? 0),
      };
    }

    const matchingPerk = perks.find((perk) => {
      const remaining =
        perk.value_type === "dollar"
          ? (perk.annual_value ?? 0) - (perk.used_value ?? 0)
          : perk.annual_value ?? 0;

      return (
        perk.user_card_id === best.card.id &&
        remaining > 0 &&
        !isFullyUsed(perk) &&
        creditMatchesCategory(perk, lastResponse.categoryName)
      );
    });

    if (!matchingPerk) return null;

    return {
      cardName: getCardName(best.card),
      name: matchingPerk.name,
      remaining:
        matchingPerk.value_type === "dollar"
          ? (matchingPerk.annual_value ?? 0) - (matchingPerk.used_value ?? 0)
          : matchingPerk.annual_value ?? 0,
    };
  }, [best, credits, lastResponse, perks]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setInlineError(null);

    try {
      const res = await fetch("/api/ask-chris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Chris could not answer that one. Try again.";
        setInlineError(message);
        return;
      }

      if (!isAskChrisResponse(data)) {
        setInlineError("Chris returned an answer I couldn't read. Try again.");
        return;
      }

      setLastResponse(data);
      setSpendOverride(data.amount ?? 100);
    } catch {
      setInlineError("Chris could not answer that one. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const quickChips = useMemo(
    () =>
      QUICK_CHIP_NAMES.map((name) => categories.find((c) => c.name === name)).filter(
        (c): c is SpendingCategory => Boolean(c),
      ),
    [categories],
  );

  function quickAsk(c: SpendingCategory) {
    setInlineError(null);
    setQuery("");
    setLastResponse({
      categoryId: c.id,
      categoryName: c.name,
      amount: null,
      merchant: null,
      reasoning: `Top ${c.display_name.toLowerCase()} multiplier across your saved cards.`,
      source: "keyword",
    });
    setSpendOverride(100);
  }

  function saveRule() {
    if (!category || !best) return;
    try {
      const saved = JSON.parse(localStorage.getItem("cc-chris-swipe-rules") ?? "{}") as Record<string, string>;
      saved[category.id] = best.card.id;
      localStorage.setItem("cc-chris-swipe-rules", JSON.stringify(saved));
      toast.success(`Saved ${getCardName(best.card)} for ${category.display_name}`);
    } catch {
      toast.error("Could not save that rule");
    }
  }

  const modeTabs = (
    <div className="flex gap-1 rounded-xl border border-overlay-subtle bg-muted/30 p-1">
      <button
        type="button"
        onClick={() => setMode("ask")}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
          mode === "ask"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <MessageCircleQuestion className="h-3.5 w-3.5" />
        Ask
      </button>
      <button
        type="button"
        onClick={() => setMode("browse")}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
          mode === "browse"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Browse
      </button>
    </div>
  );

  if (mode === "browse") {
    return (
      <div className="animate-[fade-in_0.2s_ease_both] space-y-5">
        {modeTabs}
        <RecommendTool
          userId={userId}
          isPremium={isPremium}
          initialCards={cards}
          initialCategories={categories}
          categoryLoadError={categoryLoadError}
        />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="animate-[fade-in_0.3s_ease_both] space-y-5">
        {modeTabs}
        <div className="text-center py-16 px-6 border border-dashed border-border rounded-2xl">
          <CreditCard className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-2">Add a card to get answers</h3>
          <p className="text-muted-foreground text-base max-w-sm mx-auto mb-6">
            Ask Chris compares the cards in your wallet to tell you which one earns the
            most on any purchase. Add at least one card to start.
          </p>
          <Button asChild>
            <Link href="/wallet">Add a card in Wallet</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.3s_ease_both] space-y-8">
      <div className="flex justify-end">{modeTabs}</div>

      <section
        className="rounded-2xl border border-overlay-subtle bg-card px-4 py-8 text-center sm:px-8"
        style={{
          backgroundImage:
            "radial-gradient(30rem 14rem at 50% -10%, oklch(0.64 0.17 42 / 0.12), transparent 70%)",
        }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Free · works with your saved cards
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight sm:text-3xl">What are you buying?</h1>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          One question before checkout. Chris answers with the card that earns the most.
        </p>
        <form onSubmit={handleSubmit} className="relative mx-auto mt-6 max-w-xl">
          <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIndex]}
            maxLength={500}
            className="h-14 rounded-2xl pl-12 pr-24 text-base shadow-lg shadow-black/10"
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-xl px-4"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </Button>
        </form>
        {quickChips.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="Quick categories">
            {quickChips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => quickAsk(c)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  category?.id === c.id && lastResponse?.source === "keyword"
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {c.display_name}
              </button>
            ))}
          </div>
        )}
        {categoryLoadError && (
          <p className="mt-3 text-xs font-medium text-destructive">{categoryLoadError}</p>
        )}
        {inlineError && (
          <div className="mx-auto mt-3 flex max-w-xl items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{inlineError}</p>
          </div>
        )}
      </section>

      {lastResponse && lastResponse.categoryId && !category && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold">I found a category, but it is not available on this page.</p>
            <p className="mt-1 text-muted-foreground">Refresh and try again.</p>
          </div>
        </div>
      )}

      {lastResponse && !lastResponse.categoryId && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold">I couldn&apos;t pin down a category.</p>
            <p className="mt-1 text-muted-foreground">
              Try rephrasing or{" "}
              <button type="button" onClick={() => setMode("browse")} className="text-primary hover:underline">
                browse by category
              </button>
              .
            </p>
          </div>
        </div>
      )}

      {lastResponse && category && best && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/10 sm:p-6">
          <Badge className="mb-4 w-fit rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10">
            Best card for {category.display_name.toLowerCase()}
          </Badge>
          <div className="flex items-center gap-4">
            <MiniCard color={getCardColor(best.card)} className="h-12 w-[4.5rem]" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-xl font-bold">{getCardName(best.card)}</p>
              <p className="text-sm text-muted-foreground">{lastResponse.reasoning}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="font-heading text-3xl font-bold leading-none text-primary">{best.multiplier}×</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ≈ {formatCurrency(projectedDollarValue(100, best.card, category.id, fallbackCategoryId))} per $100
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1.25fr]">
            <div className="rounded-xl bg-muted/35 p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Projected rewards</p>
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {formatCurrency(projectedDollarValue(displayAmount, best.card, category.id, fallbackCategoryId))}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on {formatCurrency(displayAmount)} of spend.
              </p>
              {shouldShowSpendPills && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {SPEND_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSpendOverride(preset)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        spendOverride === preset
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {unusedBenefit && (
                <div className="rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm">
                  <p className="font-medium">
                    You still have {formatCurrency(unusedBenefit.remaining)} unused on {unusedBenefit.cardName}:{" "}
                    {unusedBenefit.name}.
                  </p>
                  <Link href="/wallet?tab=credits-benefits" className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">
                    View benefits
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="h-9" onClick={saveRule}>
                  Save as default
                </Button>
                <Button asChild type="button" size="sm" variant="outline" className="h-9">
                  <Link href="/alerts">View alerts</Link>
                </Button>
                {unusedBenefit ? (
                  <Button asChild type="button" size="sm" variant="outline" className="h-9">
                    <Link href="/wallet?tab=credits-benefits">View benefit</Link>
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => setMode("browse")}>
                    Browse by category
                  </Button>
                )}
              </div>
            </div>
          </div>

          {ranked.length > 1 && (
            <div className="mt-6">
              {ranked.slice(1, 3).map(({ card, multiplier }) => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 border-t border-overlay-subtle py-3 text-sm"
                >
                  <MiniCard color={getCardColor(card)} className="h-8 w-[3.25rem]" />
                  <p className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{getCardName(card)}</span>{" "}
                    <span className="text-muted-foreground">
                      · {multiplier}× {category.display_name.toLowerCase()}
                    </span>
                  </p>
                  <p className="flex-shrink-0 font-bold tabular-nums text-muted-foreground">{multiplier}×</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
