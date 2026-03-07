"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CardPerk, UserCard } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { AddPerkDialog } from "@/components/perks/add-perk-dialog";
import { PerkProgress } from "@/components/perks/perk-progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  UtensilsCrossed,
  Sofa,
  Shield,
  Gift,
  Plus,
  Trash2,
  Edit2,
  Bell,
  BellOff,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, addMonths, addYears, parseISO, differenceInDays } from "date-fns";

function getPerkIcon(perkType: string) {
  switch (perkType) {
    case "credit": return <Plane className="w-4 h-4 text-primary" />;
    case "lounge": return <Sofa className="w-4 h-4 text-primary" />;
    case "free_night": return <Sofa className="w-4 h-4 text-primary" />;
    case "status": return <Shield className="w-4 h-4 text-primary" />;
    case "other": return <Gift className="w-4 h-4 text-primary" />;
    default: return <Gift className="w-4 h-4 text-primary" />;
  }
}

function getNextResetDate(perk: CardPerk): Date {
  const today = new Date();
  if (perk.reset_cadence === "monthly") {
    return new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }
  const month = (perk.reset_month ?? 1) - 1;
  if (perk.reset_cadence === "calendar_year") {
    const thisYear = new Date(today.getFullYear(), month, 1);
    return today >= thisYear
      ? new Date(today.getFullYear() + 1, month, 1)
      : thisYear;
  }
  // annual — based on last_reset_at or reset_month
  if (perk.last_reset_at) {
    return addYears(parseISO(perk.last_reset_at), 1);
  }
  const thisYear = new Date(today.getFullYear(), month, 1);
  return today >= thisYear
    ? new Date(today.getFullYear() + 1, month, 1)
    : thisYear;
}

export function PerksList({ userId }: { userId: string }) {
  const supabase = createClient();
  const [perks, setPerks] = useState<CardPerk[]>([]);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPerk, setEditPerk] = useState<CardPerk | null>(null);

  const fetchData = useCallback(async () => {
    const [perksRes, cardsRes] = await Promise.all([
      supabase
        .from("card_perks")
        .select("*, user_card:user_cards(*, card_template:card_templates(*))")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order"),
    ]);
    setPerks(perksRes.data ?? []);
    setCards(cardsRes.data ?? []);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function updatePerk(perkId: string, updates: Partial<CardPerk>) {
    const { error } = await supabase
      .from("card_perks")
      .update(updates)
      .eq("id", perkId);
    if (error) { toast.error("Failed to update perk"); return; }
    setPerks((prev) => prev.map((p) => p.id === perkId ? { ...p, ...updates } : p));
  }

  async function deletePerk(id: string) {
    const { error } = await supabase.from("card_perks").delete().eq("id", id);
    if (error) { toast.error("Failed to delete perk"); return; }
    toast.success("Perk removed");
    setPerks((prev) => prev.filter((p) => p.id !== id));
  }

  // Group perks by user_card_id
  const grouped = perks.reduce<Record<string, CardPerk[]>>((acc, p) => {
    if (!acc[p.user_card_id]) acc[p.user_card_id] = [];
    acc[p.user_card_id].push(p);
    return acc;
  }, {});

  // Summary stats
  const totalUnused = perks
    .filter((p) => p.value_type === "dollar" && p.annual_value)
    .reduce((sum, p) => sum + Math.max((p.annual_value ?? 0) - (p.used_value ?? 0), 0), 0);

  const today = new Date();
  const expiringThisMonth = perks.filter((p) => {
    const reset = getNextResetDate(p);
    return differenceInDays(reset, today) <= 30;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Unused Value</p>
          <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalUnused)}</p>
          <p className="text-xs text-muted-foreground mt-1">left to use</p>
        </div>
        <div className="bg-card border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tracked</p>
          <p className="text-2xl font-bold tracking-tight">{perks.length}</p>
          <p className="text-xs text-muted-foreground mt-1">active perks</p>
        </div>
        <div className={`bg-card border rounded-2xl p-5 ${expiringThisMonth.length > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-white/[0.06]"}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expiring</p>
          <p className={`text-2xl font-bold tracking-tight ${expiringThisMonth.length > 0 ? "text-amber-400" : ""}`}>
            {expiringThisMonth.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">within 30 days</p>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Your Perks</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Perks
        </Button>
      </div>

      {/* Empty state */}
      {perks.length === 0 ? (
        <div className="bg-card border border-white/[0.06] rounded-2xl p-12 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium mb-1">No perks tracked yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add perks from your premium cards to track usage and get reminders before they reset.
          </p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Perks
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cardId, cardPerks]) => {
            const card = cardPerks[0]?.user_card as UserCard | undefined;
            const cardName = card ? getCardName(card) : "Unknown Card";
            const cardColor = card ? getCardColor(card) : "#d4621a";

            return (
              <div key={cardId}>
                {/* Card header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cardColor }}
                  />
                  <span className="text-sm font-semibold">{cardName}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {cardPerks.length} perk{cardPerks.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Perk rows */}
                <div className="space-y-2">
                  {cardPerks.map((perk) => {
                    const resetDate = getNextResetDate(perk);
                    const daysLeft = differenceInDays(resetDate, today);
                    const isExpiringSoon = daysLeft <= 30;

                    return (
                      <div
                        key={perk.id}
                        className={`group bg-card border rounded-2xl p-4 transition-colors hover:bg-white/[0.02] ${
                          isExpiringSoon ? "border-amber-500/25" : "border-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {getPerkIcon(perk.perk_type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="text-sm font-semibold">{perk.name}</p>
                              {isExpiringSoon && (
                                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs h-4 px-1.5">
                                  {daysLeft === 0 ? "Resets today" : `Resets in ${daysLeft}d`}
                                </Badge>
                              )}
                              {!isExpiringSoon && (
                                <span className="text-xs text-muted-foreground capitalize">
                                  Resets {format(resetDate, "MMM d")}
                                </span>
                              )}
                            </div>
                            {perk.description && (
                              <p className="text-xs text-muted-foreground mb-2 truncate">{perk.description}</p>
                            )}
                            <PerkProgress
                              perk={perk}
                              onUpdate={(updates) => updatePerk(perk.id, updates)}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => updatePerk(perk.id, { notify_before_reset: !perk.notify_before_reset })}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
                              title={perk.notify_before_reset ? "Disable reminders" : "Enable reminders"}
                            >
                              {perk.notify_before_reset
                                ? <Bell className="w-3.5 h-3.5" />
                                : <BellOff className="w-3.5 h-3.5" />
                              }
                            </button>
                            <button
                              onClick={() => setEditPerk(perk)}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deletePerk(perk.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add dialog */}
      <AddPerkDialog
        userId={userId}
        cards={cards}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={fetchData}
      />

      {/* Edit dialog */}
      <AddPerkDialog
        userId={userId}
        cards={cards}
        perk={editPerk ?? undefined}
        open={!!editPerk}
        onOpenChange={(o) => !o && setEditPerk(null)}
        onSaved={fetchData}
      />
    </div>
  );
}
