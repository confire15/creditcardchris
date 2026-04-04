"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, CardTemplate, SpendingCategory } from "@/lib/types/database";
import { CreditCardVisual } from "./credit-card-visual";
import { CardDetailSheet } from "./card-detail-sheet";
import { AddCardDialog } from "./add-card-dialog";
import {
  CreditCard,
  Plus,
  ChevronUp,
  ChevronDown,
  Archive,
  RotateCcw,
  Trash2,
  Layers,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { getCardName, getCardIssuer } from "@/lib/utils/rewards";
import { cn } from "@/lib/utils";

export function CardList({ userId }: { userId: string }) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [archivedCards, setArchivedCards] = useState<UserCard[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupByIssuer, setGroupByIssuer] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    const [activeRes, archivedRes] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*), rewards:user_card_rewards(*, category:spending_categories(*))")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*), rewards:user_card_rewards(*, category:spending_categories(*))")
        .eq("user_id", userId)
        .eq("is_active", false)
        .order("created_at", { ascending: false }),
    ]);
    const active = activeRes.data ?? [];
    const archived = archivedRes.data ?? [];
    setCards(active);
    setArchivedCards(archived);
    setLoading(false);
    // Sync selectedCard with fresh data so the detail sheet reflects updates
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

  function openCardDetail(card: UserCard) {
    setSelectedCard(card);
    setSheetOpen(true);
  }

  async function saveOrder(newCards: UserCard[]) {
    try {
      await Promise.all(
        newCards.map((card, i) =>
          supabase.from("user_cards").update({ sort_order: i }).eq("id", card.id)
        )
      );
    } catch {
      toast.error("Failed to save order");
      fetchCards();
    }
  }

  async function moveCard(index: number, direction: "up" | "down") {
    const newCards = [...cards];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newCards.length) return;
    [newCards[index], newCards[swapIndex]] = [newCards[swapIndex], newCards[index]];
    setCards(newCards);
    await saveOrder(newCards);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newCards = [...cards];
    const [moved] = newCards.splice(dragIndex, 1);
    newCards.splice(dropIndex, 0, moved);
    setCards(newCards);
    setDragIndex(null);
    setDragOverIndex(null);
    saveOrder(newCards);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
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

  // Issuer groups for grouped view
  const issuerGroups: [string, UserCard[]][] = Object.entries(
    cards.reduce((acc, card) => {
      const issuer = getCardIssuer(card) || "Other";
      if (!acc[issuer]) acc[issuer] = [];
      acc[issuer].push(card);
      return acc;
    }, {} as Record<string, UserCard[]>)
  ).sort(([a], [b]) => a.localeCompare(b));

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="h-9 w-40 bg-muted animate-pulse rounded-xl" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[1.586/1] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 bg-background/95 backdrop-blur-sm -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Your Wallet</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {cards.length} {cards.length === 1 ? "card" : "cards"}
            {archivedCards.length > 0 && (
              <span className="ml-1 text-muted-foreground/60">· {archivedCards.length} archived</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cards.length > 1 && (
            <button
              onClick={() => setGroupByIssuer((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all",
                groupByIssuer
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title="Group by issuer"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Group</span>
            </button>
          )}
          <AddCardDialog
            templates={templates}
            categories={categories}
            userId={userId}
            onCardAdded={fetchCards}
          >
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Card</span>
            </button>
          </AddCardDialog>
        </div>
      </div>

      {/* Empty state */}
      {cards.length === 0 ? (
        <div className="space-y-6">
          {/* Hero */}
          <div className="rounded-2xl border border-dashed border-border overflow-hidden">
            {/* Decorative card row */}
            <div className="flex items-center justify-center gap-3 py-8 px-4 bg-muted/20">
              {[
                { color: "#1a56a0", label: "Chase" },
                { color: "#2e7d32", label: "Amex" },
                { color: "#c62828", label: "Citi" },
              ].map(({ color, label }) => (
                <div
                  key={label}
                  className="relative w-28 sm:w-36 aspect-[1.586/1] rounded-xl flex-shrink-0 flex items-end p-3 shadow-lg"
                  style={{ backgroundColor: color }}
                >
                  <div className="absolute top-3 left-3 w-6 h-4 rounded-sm bg-white/20" />
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{label}</p>
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
                <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">
                  <Plus className="w-4 h-4" />
                  Add Your First Card
                </button>
              </AddCardDialog>
            </div>
          </div>

          {/* Popular cards preview */}
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
                  return (
                    <AddCardDialog key={t.id} templates={templates} categories={categories} userId={userId} onCardAdded={fetchCards}>
                      <button className="rounded-xl border border-border overflow-hidden text-left hover:border-primary/30 hover:shadow-sm transition-all w-full">
                        <div className="h-10 relative flex items-end px-2.5 pb-1.5" style={{ backgroundColor: t.color ?? "#6366f1" }}>
                          <div className="absolute top-2 left-2.5 w-4 h-3 rounded-sm bg-white/20" />
                          <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest">{t.issuer}</p>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold leading-snug">{t.name.replace(/®|™/g, "")}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
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
        </div>
      ) : groupByIssuer ? (
        /* Grouped by issuer view */
        <div className="space-y-10">
          {issuerGroups.map(([issuer, issuerCards]) => (
            <div key={issuer}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
                {issuer} · {issuerCards.length} {issuerCards.length === 1 ? "card" : "cards"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {issuerCards.map((card) => (
                  <div key={card.id} className="relative group">
                    <CreditCardVisual card={card} onClick={() => openCardDetail(card)} />
                    {(card.card_template?.annual_fee ?? 0) > 0 && !card.annual_fee_date && (
                      <div className="mt-1.5 flex items-center justify-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
                        <CalendarClock className="w-3 h-3 text-amber-500/70 flex-shrink-0" />
                        <input
                          type="date"
                          className="text-[10px] rounded-lg border border-amber-500/30 bg-background px-2 py-0.5 text-amber-400 focus:outline-none focus:border-amber-500/60 cursor-pointer"
                          onChange={async (e) => {
                            const date = e.target.value;
                            if (!date) return;
                            try {
                              await supabase.from("user_cards").update({ annual_fee_date: date }).eq("id", card.id);
                              fetchCards();
                              toast.success("Renewal date saved");
                            } catch {
                              toast.error("Failed to save date");
                            }
                          }}
                        />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); archiveCard(card); }}
                        className="p-1 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 hover:text-white transition-all"
                        title="Archive card"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Default drag-to-reorder view */
        <>
        <p className="text-xs text-muted-foreground mb-5">Tap a card to edit rewards or track statement credits</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className={cn(
                "relative group cursor-grab active:cursor-grabbing",
                dragOverIndex === index && dragIndex !== index && "ring-2 ring-primary/60 rounded-[13px]"
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={cn("transition-opacity", dragIndex === index && "opacity-40")}>
                <CreditCardVisual card={card} onClick={() => openCardDetail(card)} />
                {(card.card_template?.annual_fee ?? 0) > 0 && !card.annual_fee_date && (
                  <div className="mt-1.5 flex items-center justify-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
                    <CalendarClock className="w-3 h-3 text-amber-500/70 flex-shrink-0" />
                    <input
                      type="date"
                      className="text-[10px] rounded-lg border border-amber-500/30 bg-background px-2 py-0.5 text-amber-400 focus:outline-none focus:border-amber-500/60 cursor-pointer"
                      onChange={async (e) => {
                        const date = e.target.value;
                        if (!date) return;
                        try {
                          await supabase.from("user_cards").update({ annual_fee_date: date }).eq("id", card.id);
                          fetchCards();
                          toast.success("Renewal date saved");
                        } catch {
                          toast.error("Failed to save date");
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Hover controls */}
              <div className="absolute top-2 right-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {cards.length > 1 && (
                  <>
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
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); archiveCard(card); }}
                  className="p-1 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 hover:text-white transition-all"
                  title="Archive card"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Archived cards */}
      {archivedCards.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <Archive className="w-4 h-4" />
            Archived ({archivedCards.length})
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", showArchived && "rotate-180")} />
          </button>

          {showArchived && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {archivedCards.map((card) => (
                <div key={card.id} className="relative group">
                  <div className="opacity-50 pointer-events-none">
                    <CreditCardVisual card={card} />
                  </div>
                  {/* Restore / Delete overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl bg-background/60 backdrop-blur-sm">
                    <button
                      onClick={() => restoreCard(card)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                    <button
                      onClick={() => deleteCardPermanently(card)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium text-destructive hover:bg-muted transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">{getCardName(card)}</p>
                </div>
              ))}
            </div>
          )}
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
