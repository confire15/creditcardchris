"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CardPerk, UserCard } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { AddPerkDialog } from "@/components/perks/add-perk-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Sparkles,
  Clock,
  DollarSign,
  Trash2,
  Edit2,
  Bell,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, addYears, parseISO } from "date-fns";

function getPerkCategory(perk: CardPerk): { label: string; color: string } {
  const name = perk.name.toLowerCase();
  if (
    name.includes("dining") || name.includes("resy") || name.includes("grubhub") ||
    name.includes("doordash") || name.includes("dunkin") || name.includes("restaurant") ||
    name.includes("cheesecake")
  ) return { label: "Dining", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" };
  if (
    name.includes("travel") || name.includes("flight") || name.includes("airline") ||
    name.includes("resort") || name.includes("hilton") || name.includes("marriott") ||
    name.includes("delta") || name.includes("united") || name.includes("instacart") ||
    name.includes("uber") || name.includes("hotel")
  ) return { label: "Travel", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  if (perk.perk_type === "lounge" || name.includes("lounge") || name.includes("club"))
    return { label: "Lounge", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" };
  if (
    name.includes("streaming") || name.includes("entertainment") || name.includes("digital") ||
    name.includes("disney") || name.includes("hulu") || name.includes("espn")
  ) return { label: "Entertainment", color: "text-red-400 bg-red-400/10 border-red-400/20" };
  if (
    name.includes("shopping") || name.includes("saks") || name.includes("walmart") ||
    name.includes("lululemon")
  ) return { label: "Shopping", color: "text-green-400 bg-green-400/10 border-green-400/20" };
  if (name.includes("equinox") || name.includes("fitness") || name.includes("clear") || name.includes("gym"))
    return { label: "Fitness", color: "text-teal-400 bg-teal-400/10 border-teal-400/20" };
  if (perk.perk_type === "free_night")
    return { label: "Hotel", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" };
  if (perk.perk_type === "status")
    return { label: "Status", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" };
  return { label: "Credit", color: "text-primary bg-primary/10 border-primary/20" };
}

function getCadenceLabel(cadence: string) {
  if (cadence === "monthly") return "Monthly";
  if (cadence === "calendar_year") return "Yearly";
  return "Annual";
}

function getNextResetDate(perk: CardPerk): Date {
  const today = new Date();
  if (perk.reset_cadence === "monthly") {
    return new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }
  const month = (perk.reset_month ?? 1) - 1;
  if (perk.reset_cadence === "calendar_year") {
    const thisYear = new Date(today.getFullYear(), month, 1);
    return today >= thisYear ? new Date(today.getFullYear() + 1, month, 1) : thisYear;
  }
  if (perk.last_reset_at) return addYears(parseISO(perk.last_reset_at), 1);
  const thisYear = new Date(today.getFullYear(), month, 1);
  return today >= thisYear ? new Date(today.getFullYear() + 1, month, 1) : thisYear;
}

function getPerkValue(perk: CardPerk): string {
  if (perk.value_type === "dollar" && perk.annual_value) return formatCurrency(perk.annual_value);
  if (perk.value_type === "count" && perk.annual_count) return `${perk.annual_count}×`;
  return "—";
}

function isFullyUsed(perk: CardPerk): boolean {
  if (perk.value_type === "dollar") return (perk.used_value ?? 0) >= (perk.annual_value ?? 0);
  if (perk.value_type === "count") return (perk.used_count ?? 0) >= (perk.annual_count ?? 0);
  return perk.is_redeemed ?? false;
}

function PerkCard({
  perk,
  onUpdate,
  onDelete,
  onEdit,
}: {
  perk: CardPerk;
  onUpdate: (updates: Partial<CardPerk>) => Promise<void>;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [isLogging, setIsLogging] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const card = perk.user_card as UserCard | undefined;
  const cardName = card ? getCardName(card) : "Unknown Card";
  const resetDate = getNextResetDate(perk);
  const daysLeft = differenceInDays(resetDate, new Date());
  const category = getPerkCategory(perk);
  const cadence = getCadenceLabel(perk.reset_cadence);
  const fullyUsed = isFullyUsed(perk);

  const total = perk.annual_value ?? 0;
  const used = perk.used_value ?? 0;
  const remaining = total - used;

  async function handleQuickAmount(amount: number) {
    await onUpdate({ used_value: Math.min(used + amount, total) });
    setIsLogging(false);
  }

  async function handleCustomAmount() {
    const val = parseFloat(customAmount);
    if (isNaN(val) || val <= 0) return;
    await onUpdate({ used_value: Math.min(used + val, total) });
    setCustomAmount("");
    setIsLogging(false);
  }

  async function handleCountUpdate(delta: number) {
    const usedCount = perk.used_count ?? 0;
    const totalCount = perk.annual_count ?? 0;
    await onUpdate({ used_count: Math.min(usedCount + delta, totalCount) });
    setIsLogging(false);
  }

  function cancelLogging() {
    setIsLogging(false);
    setCustomAmount("");
  }

  return (
    <div
      className={`group bg-card border rounded-2xl p-5 flex flex-col gap-3 transition-colors hover:bg-overlay-hover ${
        daysLeft <= 30 && !fullyUsed ? "border-amber-500/25" : "border-overlay-subtle"
      }`}
    >
      {/* Name + status + value */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-base font-bold leading-tight">{perk.name}</p>
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${
              fullyUsed
                ? "text-muted-foreground bg-muted/50 border-border"
                : "text-green-400 bg-green-400/10 border-green-400/20"
            }`}
          >
            {fullyUsed ? "Used" : "Available"}
          </span>
        </div>
        <span className="text-xl font-bold tracking-tight flex-shrink-0">{getPerkValue(perk)}</span>
      </div>

      {/* Description */}
      {perk.description && (
        <p className="text-sm text-muted-foreground leading-snug">{perk.description}</p>
      )}

      {/* Category + cadence + card name */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${category.color}`}>
          {category.label}
        </span>
        <span className="text-sm text-muted-foreground">{cadence}</span>
        <span className="text-sm text-muted-foreground">• {cardName}</span>
      </div>

      {/* Notes */}
      {perk.notes && (
        <p className="text-xs text-muted-foreground line-clamp-1">
          <span className="font-medium text-foreground/50">Note:</span> {perk.notes}
        </p>
      )}

      {/* Dollar progress bar */}
      {!isLogging && perk.value_type === "dollar" && perk.annual_value && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${used.toFixed(0)} used</span>
            <span className={remaining <= 0 ? "line-through" : "text-foreground font-medium"}>
              ${remaining.toFixed(0)} left
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                remaining <= 0 ? "bg-muted-foreground/40" : "bg-primary/70"
              }`}
              style={{ width: `${Math.min((used / total) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Count progress dots */}
      {!isLogging && perk.value_type === "count" && perk.annual_count && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{perk.used_count ?? 0} / {perk.annual_count} used</span>
            <span className="text-foreground font-medium">
              {perk.annual_count - (perk.used_count ?? 0)} remaining
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: perk.annual_count }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < (perk.used_count ?? 0) ? "bg-primary/70" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inline log usage panel */}
      {isLogging && (
        <div className="bg-muted/20 border border-overlay-subtle rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">How much did you use?</p>

          {perk.value_type === "dollar" && (
            <>
              <div className="flex flex-wrap gap-2">
                {remaining >= total * 0.25 && (
                  <button
                    onClick={() => handleQuickAmount(Math.round(total * 0.25 * 100) / 100)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    25% ({formatCurrency(total * 0.25)})
                  </button>
                )}
                {remaining >= total * 0.5 && (
                  <button
                    onClick={() => handleQuickAmount(Math.round(total * 0.5 * 100) / 100)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    50% ({formatCurrency(total * 0.5)})
                  </button>
                )}
                <button
                  onClick={() => handleQuickAmount(remaining)}
                  className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/30 hover:text-primary transition-colors"
                >
                  All ({formatCurrency(remaining)})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomAmount()}
                    className="pl-8 h-9 text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
                <Button size="sm" onClick={handleCustomAmount} disabled={!customAmount}>
                  Add
                </Button>
                <button
                  onClick={cancelLogging}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {perk.value_type === "count" && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCountUpdate(1)}
                className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/30 hover:text-primary transition-colors"
              >
                Mark 1 used
              </button>
              {(perk.annual_count ?? 0) - (perk.used_count ?? 0) > 1 && (
                <button
                  onClick={() => handleCountUpdate((perk.annual_count ?? 0) - (perk.used_count ?? 0))}
                  className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/30 hover:text-primary transition-colors"
                >
                  Mark all used
                </button>
              )}
              <button
                onClick={cancelLogging}
                className="text-sm text-muted-foreground hover:text-foreground ml-auto transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {perk.value_type === "boolean" && (
            <div className="flex gap-2">
              <button
                onClick={async () => { await onUpdate({ is_redeemed: !perk.is_redeemed }); setIsLogging(false); }}
                className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/30 hover:text-primary transition-colors"
              >
                {perk.is_redeemed ? "Mark as unused" : "Mark as used"}
              </button>
              <button
                onClick={cancelLogging}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {daysLeft <= 0 ? "Resets today" : `Expires ${format(resetDate, "MMM d")}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Hover actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onUpdate({ notify_before_reset: !perk.notify_before_reset })}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
              title={perk.notify_before_reset ? "Disable reminders" : "Enable reminders"}
            >
              {perk.notify_before_reset ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLogging ? (
            <button
              onClick={cancelLogging}
              className="text-sm border border-border text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          ) : !fullyUsed ? (
            <button
              onClick={() => setIsLogging(true)}
              className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Log Usage
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
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
    const { error } = await supabase.from("card_perks").update(updates).eq("id", perkId);
    if (error) { toast.error("Failed to update perk"); return; }
    setPerks((prev) => prev.map((p) => (p.id === perkId ? { ...p, ...updates } : p)));
  }

  async function deletePerk(id: string) {
    const { error } = await supabase.from("card_perks").delete().eq("id", id);
    if (error) { toast.error("Failed to delete perk"); return; }
    toast.success("Perk removed");
    setPerks((prev) => prev.filter((p) => p.id !== id));
  }

  // Summary stats
  const totalUnused = perks
    .filter((p) => p.value_type === "dollar" && p.annual_value)
    .reduce((sum, p) => sum + Math.max((p.annual_value ?? 0) - (p.used_value ?? 0), 0), 0);

  const today = new Date();
  const expiringCount = perks.filter((p) => {
    const reset = getNextResetDate(p);
    return differenceInDays(reset, today) <= 30 && !isFullyUsed(p);
  }).length;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-52 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-overlay-subtle rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Unused Value</p>
          <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalUnused)}</p>
          <p className="text-xs text-muted-foreground mt-1">left to use</p>
        </div>
        <div className="bg-card border border-overlay-subtle rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tracked</p>
          <p className="text-2xl font-bold tracking-tight">{perks.length}</p>
          <p className="text-xs text-muted-foreground mt-1">active perks</p>
        </div>
        <div
          className={`bg-card border rounded-2xl p-5 ${
            expiringCount > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-overlay-subtle"
          }`}
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expiring</p>
          <p className={`text-2xl font-bold tracking-tight ${expiringCount > 0 ? "text-amber-400" : ""}`}>
            {expiringCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">within 30 days</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Your Perks</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Perks
        </Button>
      </div>

      {/* Empty state */}
      {perks.length === 0 ? (
        <div className="bg-card border border-overlay-subtle rounded-2xl p-12 text-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {perks.map((perk) => (
            <PerkCard
              key={perk.id}
              perk={perk}
              onUpdate={(updates) => updatePerk(perk.id, updates)}
              onDelete={() => deletePerk(perk.id)}
              onEdit={() => setEditPerk(perk)}
            />
          ))}
        </div>
      )}

      <AddPerkDialog
        userId={userId}
        cards={cards}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={fetchData}
      />
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
