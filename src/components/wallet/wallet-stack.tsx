"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, CardTemplate, SpendingCategory, StatementCredit } from "@/lib/types/database";
import { LayoutGroup, Reorder, AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { WalletCardRow } from "./wallet-card-row";
import { WalletRowSkeleton } from "./_shared/WalletRowSkeleton";
import { ArchivedDrawer } from "./archived-drawer";
import { SpendChallengeWidget } from "./spend-challenge-widget";

// Dynamically import heavy modals so they don't block first paint (~1300 LOC combined)
const CardDetailSheet = dynamic(
  () => import("./card-detail-sheet").then((m) => ({ default: m.CardDetailSheet })),
  { ssr: false, loading: () => null }
);
const AddCardDialog = dynamic(
  () => import("./add-card-dialog").then((m) => ({ default: m.AddCardDialog })),
  { ssr: false, loading: () => null }
);
import { Plus, ArrowUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { getCardName } from "@/lib/utils/rewards";
import { logAudit } from "@/lib/utils/audit";

export function WalletStack({
  userId,
  isPremium,
}: {
  userId: string;
  isPremium: boolean;
}) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [archivedCards, setArchivedCards] = useState<UserCard[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [creditsByCard, setCreditsByCard] = useState<Record<string, StatementCredit[]>>({});
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [rearrangeMode, setRearrangeMode] = useState(false);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    const [activeRes, archivedRes, creditsRes] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*), rewards:user_card_rewards(*, category:spending_categories(*))")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*), rewards:user_card_rewards(*, category:spending_categories(*))")
        .eq("user_id", userId)
        .eq("is_active", false)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("statement_credits")
        .select("*")
        .eq("user_id", userId)
        .limit(500),
    ]);

    const active = activeRes.data ?? [];
    const archived = archivedRes.data ?? [];

    const grouped: Record<string, StatementCredit[]> = {};
    for (const credit of creditsRes.data ?? []) {
      if (!grouped[credit.user_card_id]) grouped[credit.user_card_id] = [];
      grouped[credit.user_card_id].push(credit);
    }

    setCards(active);
    setArchivedCards(archived);
    setCreditsByCard(grouped);
    setLoading(false);
    setSelectedCard((prev) => {
      if (!prev) return null;
      return [...active, ...archived].find((c) => c.id === prev.id) ?? null;
    });
  }, [userId, supabase]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase.from("card_templates").select("*").order("issuer");
    setTemplates(data ?? []);
  }, [supabase]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from("spending_categories")
      .select("*")
      .order("user_id", { ascending: true, nullsFirst: true })
      .order("display_name");
    setCategories(data ?? []);
  }, [supabase]);

  useEffect(() => {
    fetchCards();
    fetchTemplates();
    fetchCategories();
  }, [fetchCards, fetchTemplates, fetchCategories]);

  async function saveOrder(orderedCards: UserCard[]) {
    try {
      await Promise.all(
        orderedCards.map((card, i) =>
          supabase.from("user_cards").update({ sort_order: i }).eq("id", card.id)
        )
      );
    } catch {
      toast.error("Failed to save order");
      fetchCards();
    }
  }

  function handleReorder(newOrder: UserCard[]) {
    setCards(newOrder);
    cardsRef.current = newOrder;
  }

  function handleDragEnd() {
    saveOrder(cardsRef.current);
  }

  function openCardDetail(card: UserCard) {
    setSelectedCard(card);
    setSheetOpen(true);
  }

  async function archiveCard(card: UserCard) {
    try {
      const { error } = await supabase
        .from("user_cards")
        .update({ is_active: false })
        .eq("id", card.id);
      if (error) throw error;
      void logAudit(supabase, userId, "card.archived", {
        user_card_id: card.id,
        card_name: getCardName(card),
      }).catch(() => {});
      toast.success(`${getCardName(card)} archived`);
      fetchCards();
    } catch {
      toast.error("Failed to archive card");
    }
  }

  async function restoreCard(card: UserCard) {
    try {
      const { error } = await supabase
        .from("user_cards")
        .update({ is_active: true })
        .eq("id", card.id);
      if (error) throw error;
      void logAudit(supabase, userId, "card.unarchived", {
        user_card_id: card.id,
        card_name: getCardName(card),
      }).catch(() => {});
      toast.success(`${getCardName(card)} restored`);
      fetchCards();
    } catch {
      toast.error("Failed to restore card");
    }
  }

  async function deleteCardPermanently(card: UserCard) {
    try {
      const { error } = await supabase.from("user_cards").delete().eq("id", card.id);
      if (error) throw error;
      void logAudit(supabase, userId, "card.deleted", {
        user_card_id: card.id,
        card_name: getCardName(card),
      }).catch(() => {});
      toast.success(`${getCardName(card)} deleted`);
      fetchCards();
    } catch {
      toast.error("Failed to delete card");
    }
  }

  const totalCreditCards = useMemo(
    () => Object.values(creditsByCard).filter((arr) => arr.length > 0).length,
    [creditsByCard]
  );

  if (loading) {
    return (
      <div>
        <div className="sticky top-14 md:top-0 z-30 bg-background/95 backdrop-blur-md -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 mb-6 flex items-center justify-between">
          <div>
            <div className="h-9 w-40 bg-muted animate-pulse rounded-xl" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
          <WalletRowSkeleton />
          <WalletRowSkeleton />
          <WalletRowSkeleton />
          <WalletRowSkeleton />
        </div>
      </div>
    );
  }

  const hasCards = cards.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 bg-background/95 backdrop-blur-md -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Your Wallet</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {cards.length} {cards.length === 1 ? "card" : "cards"}
            {totalCreditCards > 0 && (
              <span className="ml-1 text-muted-foreground/50">
                · {totalCreditCards} with credits tracked
              </span>
            )}
            {archivedCards.length > 0 && (
              <span className="ml-1 text-muted-foreground/50">· {archivedCards.length} archived</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasCards && cards.length > 1 && (
            <button
              onClick={() => setRearrangeMode((v) => !v)}
              className={
                rearrangeMode
                  ? "flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 transition-all"
                  : "flex items-center gap-2 h-10 px-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              }
              aria-pressed={rearrangeMode}
              aria-label={rearrangeMode ? "Done rearranging" : "Rearrange cards"}
            >
              {rearrangeMode ? <Check className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
              <span className="hidden sm:inline">{rearrangeMode ? "Done" : "Rearrange"}</span>
            </button>
          )}
          {!rearrangeMode && (
            <AddCardDialog
              templates={templates}
              categories={categories}
              userId={userId}
              isPremium={isPremium}
              activeCardCount={cards.length}
              onCardAdded={fetchCards}
            >
              <button
                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                aria-label="Add card"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Card</span>
              </button>
            </AddCardDialog>
          )}
        </div>
      </div>

      <div className="mb-5">
        <SpendChallengeWidget isPremium={isPremium} />
      </div>

      {/* Empty state */}
      {!hasCards ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-dashed border-border overflow-hidden">
            <div className="flex items-center justify-center gap-3 py-10 px-4 bg-muted/20">
              {[
                { color: "#1a56a0", label: "Chase" },
                { color: "#2e7d32", label: "Amex" },
                { color: "#c62828", label: "Citi" },
              ].map(({ color, label }) => (
                <div
                  key={label}
                  className="relative w-28 sm:w-36 aspect-[1.586/1] rounded-xl flex-shrink-0 flex items-end p-3 shadow-lg"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${color}aa 0%, ${color} 55%, ${color}dd 100%), radial-gradient(60% 55% at 18% 12%, rgba(255,255,255,0.22), transparent 60%)`,
                    backgroundColor: color,
                  }}
                >
                  <div className="absolute top-3 left-3 w-6 h-4 rounded-sm bg-white/20" />
                  <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{label}</p>
                </div>
              ))}
            </div>
            <div className="p-6 text-center border-t border-border/60">
              <h3 className="text-lg font-semibold mb-2">Add your first card</h3>
              <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto">
                Track rewards, monitor credits, and always know which card earns the most for each purchase.
              </p>
              <AddCardDialog
                templates={templates}
                categories={categories}
                userId={userId}
                isPremium={isPremium}
                activeCardCount={cards.length}
                onCardAdded={fetchCards}
              >
                <button className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">
                  <Plus className="w-4 h-4" />
                  Add Your First Card
                </button>
              </AddCardDialog>
            </div>
          </div>

          {templates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Popular Cards</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  "Chase Sapphire Preferred", "Chase Sapphire Reserve", "Amex Gold Card",
                  "Amex Platinum Card", "Capital One Venture X", "Citi Double Cash",
                ].map((name) => {
                  const t = templates.find((tmpl) => tmpl.name === name);
                  if (!t) return null;
                  const swatchColor = t.color ?? "#6366f1";
                  return (
                    <AddCardDialog key={t.id} templates={templates} categories={categories} userId={userId} isPremium={isPremium} activeCardCount={cards.length} onCardAdded={fetchCards}>
                      <button className="rounded-xl border border-border overflow-hidden text-left hover:border-primary/30 hover:shadow-sm transition-all w-full">
                        <div
                          className="aspect-[1.586/1] relative flex items-end px-2.5 pb-1.5"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${swatchColor}aa 0%, ${swatchColor} 55%, ${swatchColor}dd 100%)`,
                            backgroundColor: swatchColor,
                          }}
                        >
                          <div className="absolute top-2 left-2.5 w-4 h-3 rounded-sm bg-white/20" />
                          <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest">{t.issuer}</p>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold leading-snug">{t.name.replace(/®|™/g, "")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t.annual_fee > 0 ? `$${t.annual_fee}/yr` : "No annual fee"}
                          </p>
                        </div>
                      </button>
                    </AddCardDialog>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      ) : rearrangeMode ? (
        <>
          <p className="text-xs text-muted-foreground mb-4">
            Drag <span className="inline-block translate-y-[1px]">⠿</span> to reorder · tap Done when finished
          </p>
          <LayoutGroup>
            <Reorder.Group
              axis="y"
              values={cards}
              onReorder={handleReorder}
              className="space-y-[var(--wallet-row-gap)]"
            >
              <AnimatePresence initial={false}>
                {cards.map((card, index) => (
                  <WalletCardRow
                    key={card.id}
                    card={card}
                    index={index}
                    variant="rearrange"
                    onOpenDetail={() => openCardDetail(card)}
                    onDragEnd={handleDragEnd}
                    categories={categories}
                    credits={creditsByCard[card.id] ?? []}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </LayoutGroup>
        </>
      ) : (
        /* Unified grid: 1 col on mobile, 2 on tablet, 3 on desktop. Each card
           is fully and individually visible. Tap opens the detail sheet. */
        <LayoutGroup>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
            <AnimatePresence initial={false}>
              {cards.map((card, index) => (
                <WalletCardRow
                  key={card.id}
                  card={card}
                  index={index}
                  variant="grid"
                  onOpenDetail={() => openCardDetail(card)}
                  categories={categories}
                  credits={creditsByCard[card.id] ?? []}
                />
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      )}

      {/* Archived cards */}
      <ArchivedDrawer
        cards={archivedCards}
        open={showArchived}
        onToggle={() => setShowArchived((v) => !v)}
        onRestore={restoreCard}
        onDelete={deleteCardPermanently}
      />

        <CardDetailSheet
          userId={userId}
          isPremium={isPremium}
          card={selectedCard}
          categories={categories}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCardUpdated={fetchCards}
      />
    </div>
  );
}
