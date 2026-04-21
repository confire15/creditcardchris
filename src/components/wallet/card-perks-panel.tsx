"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CardPerk, UserCard } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { AddPerkDialog } from "@/components/perks/add-perk-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Bell,
  BellOff,
  Clock,
  DollarSign,
  Edit2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { addYears, differenceInDays, format, parseISO } from "date-fns";
import { toast } from "sonner";

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

function isFullyUsed(perk: CardPerk): boolean {
  if (perk.value_type === "dollar") return (perk.used_value ?? 0) >= (perk.annual_value ?? 0);
  if (perk.value_type === "count") return (perk.used_count ?? 0) >= (perk.annual_count ?? 0);
  return perk.is_redeemed ?? false;
}

function getPerkValue(perk: CardPerk): string {
  if (perk.value_type === "dollar" && perk.annual_value) return formatCurrency(perk.annual_value);
  if (perk.value_type === "count" && perk.annual_count) return `${perk.annual_count}x`;
  return "Included";
}

function PerkRow({
  perk,
  onUpdate,
  onDelete,
  onEdit,
}: {
  perk: CardPerk;
  onUpdate: (updates: Partial<CardPerk>) => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit: () => void;
}) {
  const [isLogging, setIsLogging] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const resetDate = getNextResetDate(perk);
  const daysLeft = differenceInDays(resetDate, new Date());
  const fullyUsed = isFullyUsed(perk);
  const totalValue = perk.annual_value ?? 0;
  const usedValue = perk.used_value ?? 0;
  const remainingValue = Math.max(totalValue - usedValue, 0);

  async function handleDollarUpdate(amount: number) {
    await onUpdate({ used_value: Math.min(usedValue + amount, totalValue) });
    setCustomAmount("");
    setIsLogging(false);
  }

  async function handleCountUpdate(amount: number) {
    const usedCount = perk.used_count ?? 0;
    const totalCount = perk.annual_count ?? 0;
    await onUpdate({ used_count: Math.min(usedCount + amount, totalCount) });
    setIsLogging(false);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 space-y-3",
        daysLeft <= 30 && !fullyUsed ? "border-amber-500/30" : "border-border/60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{perk.name}</p>
          {perk.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{perk.description}</p>
          )}
        </div>
        <p className="flex-shrink-0 text-base font-bold">{getPerkValue(perk)}</p>
      </div>

      {perk.value_type === "dollar" && perk.annual_value && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${usedValue.toFixed(0)} used</span>
            <span className={remainingValue <= 0 ? "line-through" : "font-medium text-foreground"}>
              ${remainingValue.toFixed(0)} left
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/80 transition-all"
              style={{ width: `${Math.min((usedValue / totalValue) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {perk.value_type === "count" && perk.annual_count && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{perk.used_count ?? 0} / {perk.annual_count} used</span>
            <span className="font-medium text-foreground">
              {Math.max(perk.annual_count - (perk.used_count ?? 0), 0)} left
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: perk.annual_count }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  index < (perk.used_count ?? 0) ? "bg-primary/80" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {isLogging && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
          {perk.value_type === "dollar" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {remainingValue > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDollarUpdate(remainingValue)}
                    className="min-h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium"
                  >
                    All {formatCurrency(remainingValue)}
                  </button>
                )}
                {totalValue > 0 && remainingValue > totalValue / 2 && (
                  <button
                    type="button"
                    onClick={() => handleDollarUpdate(Math.round((totalValue / 2) * 100) / 100)}
                    className="min-h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium"
                  >
                    Half {formatCurrency(totalValue / 2)}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    placeholder="Amount"
                    className="h-10 pl-8"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-10"
                  disabled={!customAmount}
                  onClick={() => handleDollarUpdate(parseFloat(customAmount) || 0)}
                >
                  Add
                </Button>
              </div>
            </>
          )}

          {perk.value_type === "count" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleCountUpdate(1)}>
                Mark 1 used
              </Button>
              {Math.max((perk.annual_count ?? 0) - (perk.used_count ?? 0), 0) > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCountUpdate(Math.max((perk.annual_count ?? 0) - (perk.used_count ?? 0), 0))}
                >
                  Mark all used
                </Button>
              )}
            </div>
          )}

          {perk.value_type === "boolean" && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await onUpdate({ is_redeemed: !perk.is_redeemed });
                setIsLogging(false);
              }}
            >
              {perk.is_redeemed ? "Mark unused" : "Mark used"}
            </Button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsLogging(false);
              setCustomAmount("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span>{daysLeft <= 0 ? "Resets today" : `Resets ${format(resetDate, "MMM d")}`}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUpdate({ notify_before_reset: !perk.notify_before_reset })}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={perk.notify_before_reset ? "Disable reminders" : "Enable reminders"}
          >
            {perk.notify_before_reset ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {!fullyUsed && !isLogging && (
            <Button size="sm" className="h-9 px-3" onClick={() => setIsLogging(true)}>
              Log
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CardPerksPanel({
  userId,
  card,
  onUpdated,
}: {
  userId: string;
  card: UserCard;
  onUpdated: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const dialogCards = useMemo(() => [card], [card]);
  const [perks, setPerks] = useState<CardPerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPerk, setEditPerk] = useState<CardPerk | null>(null);

  const fetchPerks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("card_perks")
      .select("*, user_card:user_cards(*, card_template:card_templates(*))")
      .eq("user_id", userId)
      .eq("user_card_id", card.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at");
    setPerks((data as CardPerk[]) ?? []);
    setLoading(false);
  }, [card.id, supabase, userId]);

  useEffect(() => {
    // Data fetch mirrors the existing wallet/dashboard client-fetch pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPerks();
  }, [fetchPerks]);

  async function updatePerk(perkId: string, updates: Partial<CardPerk>) {
    const { error } = await supabase
      .from("card_perks")
      .update(updates)
      .eq("id", perkId)
      .eq("user_id", userId)
      .eq("user_card_id", card.id);
    if (error) {
      toast.error("Failed to update perk");
      return;
    }
    setPerks((prev) => prev.map((perk) => (perk.id === perkId ? { ...perk, ...updates } : perk)));
    onUpdated();
  }

  async function deletePerk(perkId: string) {
    const { error } = await supabase
      .from("card_perks")
      .delete()
      .eq("id", perkId)
      .eq("user_id", userId)
      .eq("user_card_id", card.id);
    if (error) {
      toast.error("Failed to delete perk");
      return;
    }
    toast.success("Perk removed");
    setPerks((prev) => prev.filter((perk) => perk.id !== perkId));
    onUpdated();
  }

  const unusedValue = perks
    .filter((perk) => perk.value_type === "dollar" && perk.annual_value)
    .reduce((sum, perk) => sum + Math.max((perk.annual_value ?? 0) - (perk.used_value ?? 0), 0), 0);

  const expiringCount = perks.filter((perk) => {
    const reset = getNextResetDate(perk);
    return differenceInDays(reset, new Date()) <= 30 && !isFullyUsed(perk);
  }).length;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border/60 bg-card p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Unused</p>
          <p className="mt-1 text-lg font-bold">{formatCurrency(unusedValue)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Tracked</p>
          <p className="mt-1 text-lg font-bold">{perks.length}</p>
        </div>
        <div className={cn("rounded-2xl border bg-card p-3", expiringCount > 0 ? "border-amber-500/30" : "border-border/60")}>
          <p className="text-[11px] font-medium text-muted-foreground">Expiring</p>
          <p className={cn("mt-1 text-lg font-bold", expiringCount > 0 && "text-amber-400")}>{expiringCount}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">Perks</h3>
          <p className="text-xs text-muted-foreground">{getCardName(card)}</p>
        </div>
        <Button size="sm" className="h-9 flex-shrink-0 gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {perks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No perks tracked for this card</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            Add card perks like lounge access, free nights, or usage-based benefits.
          </p>
          <Button size="sm" className="mt-4 h-9 gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Perks
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {perks.map((perk) => (
            <PerkRow
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
        cards={dialogCards}
        defaultCardId={card.id}
        lockCard
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => {
          fetchPerks();
          onUpdated();
        }}
      />
      <AddPerkDialog
        userId={userId}
        cards={dialogCards}
        perk={editPerk ?? undefined}
        defaultCardId={card.id}
        lockCard
        open={!!editPerk}
        onOpenChange={(open) => !open && setEditPerk(null)}
        onSaved={() => {
          setEditPerk(null);
          fetchPerks();
          onUpdated();
        }}
      />
    </div>
  );
}
