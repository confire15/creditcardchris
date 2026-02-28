"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, SpendingCategory } from "@/lib/types/database";
import {
  getCardName,
  getCardColor,
  getMultiplierForCategory,
  getRewardUnit,
} from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GitCompareArrows, CreditCard, Trophy, TrendingUp } from "lucide-react";

export function CardCompare({ userId }: { userId: string }) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [cardAId, setCardAId] = useState<string>("");
  const [cardBId, setCardBId] = useState<string>("");
  const [monthlySpend, setMonthlySpend] = useState("2000");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [cardsRes, catsRes] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*), rewards:user_card_rewards(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("spending_categories")
        .select("*")
        .order("display_name"),
    ]);
    const userCards = cardsRes.data ?? [];
    setCards(userCards);
    setCategories(catsRes.data ?? []);
    if (userCards.length >= 2) {
      setCardAId(userCards[0].id);
      setCardBId(userCards[1].id);
    } else if (userCards.length === 1) {
      setCardAId(userCards[0].id);
    }
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cardA = cards.find((c) => c.id === cardAId) ?? null;
  const cardB = cards.find((c) => c.id === cardBId) ?? null;

  const sharedCategories = categories.filter((cat) => cat.name !== "other");

  // Spend simulator calculations
  const monthly = parseFloat(monthlySpend) || 0;
  const annual = monthly * 12;
  const perCategory = sharedCategories.length > 0 ? annual / sharedCategories.length : 0;
  const CPP = 0.015;

  const projectedPtsA = cardA
    ? sharedCategories.reduce((sum, cat) => sum + perCategory * getMultiplierForCategory(cardA, cat.id), 0)
    : 0;
  const projectedPtsB = cardB
    ? sharedCategories.reduce((sum, cat) => sum + perCategory * getMultiplierForCategory(cardB, cat.id), 0)
    : 0;

  const annualFeeA = cardA?.card_template?.annual_fee ?? 0;
  const annualFeeB = cardB?.card_template?.annual_fee ?? 0;
  const netValueA = projectedPtsA * CPP - annualFeeA;
  const netValueB = projectedPtsB * CPP - annualFeeB;

  const winsA = cardA && cardB
    ? sharedCategories.filter((cat) => getMultiplierForCategory(cardA, cat.id) > getMultiplierForCategory(cardB!, cat.id)).length
    : 0;
  const winsB = cardA && cardB
    ? sharedCategories.filter((cat) => getMultiplierForCategory(cardB!, cat.id) > getMultiplierForCategory(cardA, cat.id)).length
    : 0;

  const overallWinner = netValueA > netValueB ? "A" : netValueB > netValueA ? "B" : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (cards.length < 2) {
    return (
      <div className="text-center py-20 border border-dashed border-border rounded-2xl">
        <CreditCard className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
        <h3 className="text-xl font-semibold mb-3">Need at least 2 cards</h3>
        <p className="text-muted-foreground text-base max-w-sm mx-auto">
          Add more cards to your wallet to compare them side by side.
        </p>
      </div>
    );
  }

  function CardHeader({ card, wins, isWinner }: { card: UserCard | null; wins: number; isWinner: boolean }) {
    if (!card) return <div className="text-muted-foreground text-sm">Select a card</div>;
    const annualFee = card.card_template?.annual_fee ?? 0;
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="w-16 h-10 rounded-xl shadow-lg"
          style={{ backgroundColor: getCardColor(card) }}
        />
        <p className="font-semibold text-sm">{getCardName(card)}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          <Badge variant="secondary" className="text-xs">
            {annualFee > 0 ? `$${annualFee}/yr` : "No fee"}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {card.card_template?.reward_type ?? card.custom_reward_type ?? "points"}
          </Badge>
        </div>
        {cardA && cardB && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
            {isWinner && <Trophy className="w-3.5 h-3.5" />}
            {wins} {wins === 1 ? "category" : "categories"} won
          </div>
        )}
      </div>
    );
  }

  function MultiplierCell({
    card,
    categoryId,
    compareCard,
  }: {
    card: UserCard | null;
    categoryId: string;
    compareCard: UserCard | null;
  }) {
    if (!card) return <div className="text-center text-muted-foreground">—</div>;
    const multiplier = getMultiplierForCategory(card, categoryId);
    const otherMultiplier = compareCard
      ? getMultiplierForCategory(compareCard, categoryId)
      : null;
    const isBetter = otherMultiplier !== null && multiplier > otherMultiplier;
    const isWorse = otherMultiplier !== null && multiplier < otherMultiplier;
    const unit = getRewardUnit(card);

    return (
      <div className={`text-center py-2 ${isBetter ? "text-emerald-400 font-bold" : isWorse ? "text-muted-foreground" : ""}`}>
        {multiplier}x
        {multiplier > 1 && (
          <span className="block text-xs font-normal">{unit}</span>
        )}
        {isBetter && <span className="block text-[10px] text-emerald-400">Best</span>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Compare Cards</h1>
        <p className="text-muted-foreground text-base mt-2">
          Compare your cards side by side across all spending categories
        </p>
      </div>

      {/* Card selectors + spend input */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select value={cardAId} onValueChange={setCardAId}>
            <SelectTrigger>
              <SelectValue placeholder="Card A" />
            </SelectTrigger>
            <SelectContent>
              {cards.filter((c) => c.id !== cardBId).map((c) => (
                <SelectItem key={c.id} value={c.id}>{getCardName(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cardBId} onValueChange={setCardBId}>
            <SelectTrigger>
              <SelectValue placeholder="Card B" />
            </SelectTrigger>
            <SelectContent>
              {cards.filter((c) => c.id !== cardAId).map((c) => (
                <SelectItem key={c.id} value={c.id}>{getCardName(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Spend simulator */}
        {cardA && cardB && (
          <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
            <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Monthly spend:</span>
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(e.target.value)}
                className="pl-7 h-8 text-sm"
                min="0"
              />
            </div>
            <span className="text-xs text-muted-foreground">distributed across all categories</span>
          </div>
        )}
      </div>

      {cardA && cardB ? (
        <>
          {/* Overall winner banner */}
          {overallWinner && monthly > 0 && (
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-primary/[0.06] border border-primary/20 mb-4">
              <Trophy className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm font-medium">
                <span className="text-primary font-bold">
                  {overallWinner === "A" ? getCardName(cardA) : getCardName(cardB)}
                </span>
                {" "}earns more net value at this spend level — {formatCurrency(overallWinner === "A" ? netValueA : netValueB)}/yr after fees
              </p>
            </div>
          )}

          <div className="border border-border rounded-2xl overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-3 border-b border-border bg-card">
              <div className="p-5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <GitCompareArrows className="w-4 h-4" />
                Category
              </div>
              <div className="p-5 border-l border-border">
                <CardHeader card={cardA} wins={winsA} isWinner={overallWinner === "A"} />
              </div>
              <div className="p-5 border-l border-border">
                <CardHeader card={cardB} wins={winsB} isWinner={overallWinner === "B"} />
              </div>
            </div>

            {/* Annual fee row */}
            <div className="grid grid-cols-3 border-b border-border bg-muted/10">
              <div className="px-5 py-3 text-sm text-muted-foreground flex items-center">Annual Fee</div>
              <div className="px-5 py-3 border-l border-border text-center text-sm font-medium">
                {annualFeeA > 0 ? `$${annualFeeA}/yr` : <span className="text-emerald-400">None</span>}
              </div>
              <div className="px-5 py-3 border-l border-border text-center text-sm font-medium">
                {annualFeeB > 0 ? `$${annualFeeB}/yr` : <span className="text-emerald-400">None</span>}
              </div>
            </div>

            {/* Category rows */}
            {sharedCategories.map((cat, i) => {
              const multA = getMultiplierForCategory(cardA, cat.id);
              const multB = getMultiplierForCategory(cardB, cat.id);
              const isBase = multA === 1 && multB === 1;
              return (
                <div
                  key={cat.id}
                  className={`grid grid-cols-3 border-b border-border ${
                    isBase ? "opacity-40" : ""
                  } ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                >
                  <div className="px-5 py-3 text-sm flex items-center">{cat.display_name}</div>
                  <div className="px-5 border-l border-border">
                    <MultiplierCell card={cardA} categoryId={cat.id} compareCard={cardB} />
                  </div>
                  <div className="px-5 border-l border-border">
                    <MultiplierCell card={cardB} categoryId={cat.id} compareCard={cardA} />
                  </div>
                </div>
              );
            })}

            {/* Base rate row */}
            <div className="grid grid-cols-3 border-b border-border bg-card/50">
              <div className="px-5 py-3 text-sm text-muted-foreground flex items-center">Base Rate (all other)</div>
              <div className="px-5 py-3 border-l border-border text-center text-sm">
                {cardA.card_template?.base_reward_rate ?? cardA.custom_base_reward_rate ?? 1}x
              </div>
              <div className="px-5 py-3 border-l border-border text-center text-sm">
                {cardB.card_template?.base_reward_rate ?? cardB.custom_base_reward_rate ?? 1}x
              </div>
            </div>

            {/* Net value row */}
            {monthly > 0 && (
              <div className="grid grid-cols-3 bg-card">
                <div className="px-5 py-4 text-sm font-semibold flex items-center">
                  Est. Net Value/yr
                  <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">(at 1.5¢/pt)</span>
                </div>
                <div className={`px-5 py-4 border-l border-border text-center font-bold ${
                  overallWinner === "A" ? "text-primary" : "text-foreground"
                }`}>
                  {formatCurrency(netValueA)}
                  {overallWinner === "A" && <div className="text-[10px] text-primary font-normal mt-0.5">Winner</div>}
                </div>
                <div className={`px-5 py-4 border-l border-border text-center font-bold ${
                  overallWinner === "B" ? "text-primary" : "text-foreground"
                }`}>
                  {formatCurrency(netValueB)}
                  {overallWinner === "B" && <div className="text-[10px] text-primary font-normal mt-0.5">Winner</div>}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-2xl">
          Select two cards to compare
        </div>
      )}
    </div>
  );
}
