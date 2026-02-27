"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, CardTemplate, SpendingCategory } from "@/lib/types/database";
import { CreditCardVisual } from "./credit-card-visual";
import { CardDetailSheet } from "./card-detail-sheet";
import { AddCardDialog } from "./add-card-dialog";
import { CreditCard, Plus } from "lucide-react";

export function CardList({ userId }: { userId: string }) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchCards();
    fetchTemplates();
    fetchCategories();
  }, [fetchCards, fetchTemplates, fetchCategories]);

  function openCardDetail(card: UserCard) {
    setSelectedCard(card);
    setSheetOpen(true);
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
          {cards.map((card) => (
            <CreditCardVisual
              key={card.id}
              card={card}
              onClick={() => openCardDetail(card)}
            />
          ))}
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
