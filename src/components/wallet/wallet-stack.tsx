"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, CardTemplate, SpendingCategory, StatementCredit } from "@/lib/types/database";
import { LayoutGroup, Reorder, AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { WalletCardRow } from "./wallet-card-row";
import { WalletRowSkeleton } from "./_shared/WalletRowSkeleton";
import { ArchivedDrawer } from "./archived-drawer";
import { parseISO, subDays } from "date-fns";

// Dynamically import heavy modals so they don't block first paint (~1300 LOC combined)
const CardDetailSheet = dynamic(
  () => import("./card-detail-sheet").then((m) => ({ default: m.CardDetailSheet })),
  { ssr: false, loading: () => null }
);
const AddCardDialog = dynamic(
  () => import("./add-card-dialog").then((m) => ({ default: m.AddCardDialog })),
  { ssr: false, loading: () => null }
);
import { Plus, ArrowUpDown, Check, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getCardName } from "@/lib/utils/rewards";

export function WalletStack({ userId }: { userId: string }) {
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
  const [archiveMode, setArchiveMode] = useState(false);
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<Set<string>>(new Set());
  const [lastUsedByCard, setLastUsedByCard] = useState<Record<string, string>>({});

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    const [activeRes, archivedRes, creditsRes, txRes] = await Promise.all([
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
      supabase
        .from("transactions")
        .select("user_card_id, transaction_date")
        .eq("user_id", userId)
        .not("user_card_id", "is", null)
        .order("transaction_date", { ascending: false })
        .limit(5000),
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
    const latestByCard: Record<string, string> = {};
    for (const tx of txRes.data ?? []) {
      if (!tx.user_card_id || !tx.transaction_date || latestByCard[tx.user_card_id]) continue;
      latestByCard[tx.user_card_id] = tx.transaction_date;
    }
    setLastUsedByCard(latestByCard);
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
    const { data } = await supabase.from("spending_categories").select("*").order("display_name");
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
      toast.success(`${getCardName(card)} restored`);
      fetchCards();
    } catch {
      toast.error("Failed to restore card");
    }
  }

  function toggleArchiveMode() {
    setArchiveMode((prev) => !prev);
    setSelectedArchiveIds(new Set());
    if (rearrangeMode) setRearrangeMode(false);
  }

  function toggleArchiveSelection(cardId: string) {
    setSelectedArchiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function applyArchivePreset() {
    const cutoff = subDays(new Date(), 90);
    const selected = cards
      .filter((card) => {
        const fee = card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0;
        if (fee > 0) return false;
        const lastUsed = lastUsedByCard[card.id];
        if (!lastUsed) return true;
        return parseISO(lastUsed) < cutoff;
      })
      .map((card) => card.id);
    setSelectedArchiveIds(new Set(selected));
    if (selected.length === 0) toast.message("No no-fee cards unused for 90+ days found");
  }

  async function archiveSelectedCards() {
    const ids = [...selectedArchiveIds];
    if (ids.length === 0) return;
    try {
      const { error } = await supabase
        .from("user_cards")
        .update({ is_active: false })
        .in("id", ids);
      if (error) throw error;
      toast.success(`Archived ${ids.length} card${ids.length === 1 ? "" : "s"}`);
      setSelectedArchiveIds(new Set());
      setArchiveMode(false);
      fetchCards();
    } catch {
      toast.error("Failed to archive selected cards");
    }
  }

  async function deleteCardPermanently(card: UserCard) {
    try {
      const { error } = await supabase.from("user_cards").delete().eq("id", card.id);
      if (error) throw error;
      toast.success(`${getCardName(card)} deleted`);
      fetchCards();
    } catch {
      toast.error("Failed to delete card");
    }
  }

  async function deleteAllArchived() {
    if (archivedCards.length === 0) return;
    try {
      const ids = archivedCards.map((card) => card.id);
      const { error } = await supabase.from("user_cards").delete().in("id", ids);
      if (error) throw error;
      toast.success(`Deleted ${ids.length} archived card${ids.length === 1 ? "" : "s"}`);
      fetchCards();
    } catch {
      toast.error("Failed to delete archived cards");
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
          {hasCards && cards.length > 0 && !rearrangeMode && (
            <button
              onClick={toggleArchiveMode}
              className={
                archiveMode
                  ? "flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 transition-all"
                  : "flex items-center gap-2 h-10 px-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              }
              aria-pressed={archiveMode}
              aria-label={archiveMode ? "Exit archive mode" : "Archive multiple cards"}
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">{archiveMode ? "Cancel" : "Archive Mode"}</span>
            </button>
          )}
          {hasCards && cards.length > 1 && !archiveMode && (
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
                    <AddCardDialog key={t.id} templates={templates} categories={categories} userId={userId} onCardAdded={fetchCards}>
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
      ) : archiveMode ? (
        <>
          <div className="mb-4 rounded-xl border border-border/70 bg-card p-3.5 space-y-3">
            <p className="text-xs text-muted-foreground">
              Select cards to archive in bulk, or use the preset below.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={applyArchivePreset}
                className="h-9 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                Archive no-AF cards not used in 90 days
              </button>
              <button
                onClick={archiveSelectedCards}
                disabled={selectedArchiveIds.size === 0}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Archive Selected ({selectedArchiveIds.size})
              </button>
            </div>
          </div>
          <LayoutGroup>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
              <AnimatePresence initial={false}>
                {cards.map((card, index) => {
                  const selected = selectedArchiveIds.has(card.id);
                  return (
                    <div key={card.id} className={selected ? "rounded-2xl ring-2 ring-primary/50" : ""}>
                      <WalletCardRow
                        card={card}
                        index={index}
                        variant="grid"
                        onOpenDetail={() => toggleArchiveSelection(card.id)}
                        categories={categories}
                        credits={creditsByCard[card.id] ?? []}
                      />
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>
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
        onDeleteAll={deleteAllArchived}
      />

      <CardDetailSheet
        userId={userId}
        card={selectedCard}
        categories={categories}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCardUpdated={fetchCards}
      />
    </div>
  );
}
