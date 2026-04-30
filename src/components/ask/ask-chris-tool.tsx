"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CardPerk, SpendingCategory, StatementCredit, UserCard } from "@/lib/types/database";
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
  userId: _userId,
  isPremium,
  cards,
  categories,
  categoryLoadError,
  credits,
  perks,
}: AskChrisToolProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AskChrisResponse | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [spendOverride, setSpendOverride] = useState(100);
  const [showOtherCards, setShowOtherCards] = useState(false);
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
  }, [categories, lastResponse?.categoryId]);

  const fallbackCategoryId =
    category?.name === "fast_food" ? categories.find((c) => c.name === "dining")?.id : undefined;

  const ranked = category ? rankCardsForCategory(cards, category.id, fallbackCategoryId) : [];
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
  }, [best, credits, lastResponse?.categoryName, perks]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setShowOtherCards(false);
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
        toast.error(message);
        return;
      }

      if (!isAskChrisResponse(data)) {
        const message = "Chris returned an answer I couldn't read. Try again.";
        setInlineError(message);
        toast.error(message);
        return;
      }

      setLastResponse(data);
      setSpendOverride(data.amount ?? 100);
    } catch {
      const message = "Chris could not answer that one. Try again.";
      setInlineError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (cards.length === 0) {
    return (
      <div className="animate-[fade-in_0.3s_ease_both]">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Ask Chris before you swipe</h1>
          <p className="text-muted-foreground text-base mt-2">
            Tell me what you&apos;re buying. I&apos;ll tell you which card to use.
          </p>
        </div>
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <CreditCard className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-3">Add a card to your wallet first.</h3>
          <Button asChild>
            <Link href="/wallet">Go to Wallet</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.3s_ease_both] space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Ask Chris before you swipe</h1>
        <p className="text-muted-foreground text-base mt-2">
          Tell me what you&apos;re buying. I&apos;ll tell you which card to use.
        </p>
      </div>

      <div className="space-y-2">
        <form onSubmit={handleSubmit} className="relative">
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
        {!isPremium && (
          <p className="px-1 text-xs text-muted-foreground">
            <Link href="/settings" className="font-medium text-primary hover:underline">
              Upgrade for AI matching
            </Link>
          </p>
        )}
        {categoryLoadError && (
          <p className="px-1 text-xs font-medium text-destructive">{categoryLoadError}</p>
        )}
        {inlineError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{inlineError}</p>
          </div>
        )}
      </div>

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
              Try rephrasing or pick from{" "}
              <Link href="/best-card" className="text-primary hover:underline">
                Best Card
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {lastResponse && category && best && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/10 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-14 w-20 flex-shrink-0 items-end rounded-xl p-2 shadow-md shadow-black/20"
                style={{ backgroundColor: getCardColor(best.card) }}
              >
                <span className="text-[10px] font-semibold text-white/90 drop-shadow">
                  {best.card.last_four ? `••${best.card.last_four}` : "CARD"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{getCardName(best.card)}</p>
                <p className="text-sm text-muted-foreground">
                  {best.card.last_four ? `Ending in ${best.card.last_four}` : "Best card in your wallet"}
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-lg px-3 py-1 text-sm">
              {best.multiplier}× on {category.display_name.toLowerCase()}
            </Badge>
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
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Why</p>
                <p className="mt-1 text-sm font-medium">{lastResponse.reasoning}</p>
              </div>

              {unusedBenefit && (
                <div className="rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm">
                  <p className="font-medium">
                    You still have {formatCurrency(unusedBenefit.remaining)} unused on {unusedBenefit.cardName}:{" "}
                    {unusedBenefit.name}.
                  </p>
                  <Link href="/benefits" className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">
                    View benefits
                  </Link>
                </div>
              )}
            </div>
          </div>

          {ranked.length > 1 && (
            <div className="mt-6 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowOtherCards((current) => !current)}
                className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>See other cards</span>
                {showOtherCards ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showOtherCards && (
                <div className="mt-3 space-y-2">
                  {ranked.slice(1, 3).map(({ card, multiplier }) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-muted/35 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{getCardName(card)}</p>
                        <p className="text-xs text-muted-foreground">
                          {multiplier}× on {category.display_name.toLowerCase()}
                        </p>
                      </div>
                      <p className="flex-shrink-0 font-semibold tabular-nums">
                        {formatCurrency(projectedDollarValue(displayAmount, card, category.id, fallbackCategoryId))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
