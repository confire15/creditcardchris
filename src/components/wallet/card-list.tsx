"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, CardTemplate, SpendingCategory } from "@/lib/types/database";
import { CreditCardVisual } from "./credit-card-visual";
import { CardDetailSheet } from "./card-detail-sheet";
import { AddCardDialog } from "./add-card-dialog";
import { CreditCard, Plus, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";

export function CardList({ userId }: { userId: string }) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardRewards, setCardRewards] = useState<Map<string, { rewards: number; spent: number }>>(new Map());

  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    const { data } = await supabase
      .from("user_cards")
      .select(`
        *,
        card_template:card_templates(*),
        rewards:user_card_rewards(*, category:spending_categories(*))
      `)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    setCards(data ?? []);
    setLoading(false);
  }, [userId, supabase]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("card_templates")
      .select("*")
      .order("issuer", { ascending: true });
    setTemplates(data ?? []);
  }, [supabase]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from("spending_categories")
      .select("*")
      .order("display_name", { ascending: true });
    setCategories(data ?? []);
  }, [supabase]);

  const fetchCardRewards = useCallback(async () => {
    const { data } = await supabase
      .from("transactions")
      .select("user_card_id, amount, rewards_earned")
      .eq("user_id", userId)
      .not("user_card_id", "is", null);

    const map = new Map<string, { rewards: number; spent: number }>();
    (data ?? []).forEach((tx) => {
      if (!tx.user_card_id) return;
      const prev = map.get(tx.user_card_id) ?? { rewards: 0, spent: 0 };
      map.set(tx.user_card_id, {
        rewards: prev.rewards + (tx.rewards_earned ?? 0),
        spent: prev.spent + tx.amount,
      });
    });
    setCardRewards(map);
  }, [userId, supabase]);

  useEffect(() => {
    fetchCards();
    fetchTemplates();
    fetchCategories();
    fetchCardRewards();
  }, [fetchCards, fetchTemplates, fetchCategories, fetchCardRewards]);

  function openCardDetail(card: UserCard) {
    setSelectedCard(card);
    setSheetOpen(true);
  }

  async function moveCard(index: number, direction: "up" | "down") {
    const newCards = [...cards];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newCards.length) return;

    // Swap in local state immediately
    [newCards[index], newCards[swapIndex]] = [newCards[swapIndex], newCards[index]];
    setCards(newCards);

    // Persist new sort_order values
    try {
      await Promise.all(
        newCards.map((card, i) =>
          supabase
            .from("user_cards")
            .update({ sort_order: i })
            .eq("id", card.id)
        )
      );
    } catch {
      toast.error("Failed to save order");
      fetchCards(); // revert
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-[1.586/1] rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">My Wallet</h1>
          <p className="text-muted-foreground text-base mt-2">
            {cards.length} {cards.length === 1 ? "card" : "cards"} in your wallet
          </p>
        </div>
        <AddCardDialog
          templates={templates}
          categories={categories}
          userId={userId}
          onCardAdded={fetchCards}
        />
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-2xl">
          <CreditCard className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-3">No cards yet</h3>
          <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto">
            Add your first credit card to start tracking rewards and get recommendations.
          </p>
          <AddCardDialog
            templates={templates}
            categories={categories}
            userId={userId}
            onCardAdded={fetchCards}
          >
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">
              <Plus className="w-4 h-4" />
              Add Your First Card
            </button>
          </AddCardDialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <div key={card.id} className="relative group">
              <CreditCardVisual
                card={card}
                onClick={() => openCardDetail(card)}
              />
              {/* Sort controls — show on hover if more than 1 card */}
              {cards.length > 1 && (
                <div className="absolute top-2 right-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveCard(index, "up"); }}
                    disabled={index === 0}
                    className="p-1 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveCard(index, "down"); }}
                    disabled={index === cards.length - 1}
                    className="p-1 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Per-card rewards summary */}
      {cards.length > 0 && cardRewards.size > 0 && (
        <div className="mt-10 bg-card border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Rewards Summary</h2>
          </div>
          <div className="space-y-3">
            {cards
              .filter((c) => cardRewards.has(c.id))
              .sort((a, b) => (cardRewards.get(b.id)?.rewards ?? 0) - (cardRewards.get(a.id)?.rewards ?? 0))
              .map((card) => {
                const stats = cardRewards.get(card.id)!;
                return (
                  <div key={card.id} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCardColor(card) }}
                    />
                    <span className="text-sm flex-1 truncate">{getCardName(card)}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(stats.spent)} spent</span>
                    <span className="text-sm font-semibold text-primary">
                      {stats.rewards.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <CardDetailSheet
        card={selectedCard}
        categories={categories}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCardUpdated={fetchCards}
      />
    </div>
  );
}
