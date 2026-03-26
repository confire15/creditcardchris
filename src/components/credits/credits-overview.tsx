"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, StatementCredit } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, ChevronDown, Gift, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { statementCreditSchema } from "@/lib/validations/forms";
import { seedCreditsFromTemplate } from "@/lib/utils/seed-credits";

type CardWithCredits = {
  card: UserCard;
  credits: StatementCredit[];
};

function QuickButtons({
  credit,
  onUpdate,
}: {
  credit: StatementCredit;
  onUpdate: (id: string, newUsed: number) => void;
}) {
  const total = credit.annual_amount;
  const q1 = Math.round(total * 0.25);
  const q2 = Math.round(total * 0.5);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onUpdate(credit.id, credit.used_amount + q1)}
        className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
      >
        +${q1}
      </button>
      <button
        onClick={() => onUpdate(credit.id, credit.used_amount + q2)}
        className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
      >
        +${q2}
      </button>
      <button
        onClick={() => onUpdate(credit.id, total)}
        className="text-xs px-2 py-0.5 rounded-md border border-orange-300/25 text-orange-300 hover:bg-orange-300/10 transition-all"
      >
        Mark Full
      </button>
      <button
        onClick={() => onUpdate(credit.id, 0)}
        className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
      >
        Reset
      </button>
    </div>
  );
}

function AddCreditDialog({
  userCardId,
  userId,
  open,
  onOpenChange,
  onAdded,
}: {
  userCardId: string;
  userId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [annualAmount, setAnnualAmount] = useState("");
  const [usedAmount, setUsedAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handleAdd() {
    if (!name.trim() || !annualAmount) return;
    setSaving(true);
    try {
      const parsed = statementCreditSchema.safeParse({
        name,
        annual_amount: parseFloat(annualAmount),
        used_amount: usedAmount ? parseFloat(usedAmount) : 0,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
        setSaving(false);
        return;
      }
      const { error } = await supabase.from("statement_credits").insert({
        user_card_id: userCardId,
        user_id: userId,
        ...parsed.data,
      });
      if (error) throw error;
      toast.success("Credit added");
      onOpenChange(false);
      setName("");
      setAnnualAmount("");
      setUsedAmount("");
      onAdded();
    } catch (err) {
      toast.error("Failed to add credit");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Statement Credit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="credit-name">Credit name</Label>
            <Input
              id="credit-name"
              placeholder="e.g. Travel credit, Dining credit"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="credit-annual">Annual value ($)</Label>
            <Input
              id="credit-annual"
              type="number"
              min="1"
              placeholder="e.g. 300"
              value={annualAmount}
              onChange={(e) => setAnnualAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="credit-used">
              Already used ($){" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="credit-used"
              type="number"
              min="0"
              placeholder="0"
              value={usedAmount}
              onChange={(e) => setUsedAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !annualAmount || saving}
          >
            {saving ? "Adding..." : "Add Credit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreditsOverview({ userId }: { userId: string }) {
  const supabase = createClient();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [credits, setCredits] = useState<StatementCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [noCreditsOpen, setNoCreditsOpen] = useState(false);
  const [addDialogCardId, setAddDialogCardId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: userCards }, { data: statementCredits }] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("statement_credits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at"),
    ]);
    setCards((userCards as UserCard[]) ?? []);
    setCredits(statementCredits ?? []);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function seedAllMissingCredits(cardsToSeed: UserCard[]) {
    setSeeding(true);
    try {
      let total = 0;
      for (const card of cardsToSeed) {
        if (!card.card_template_id) continue;
        total += await seedCreditsFromTemplate(supabase, card.id, userId, card.card_template_id);
      }
      if (total > 0) {
        toast.success(`Auto-populated ${total} credits`);
        fetchData();
      } else {
        toast.info("No known credits found for these cards");
      }
    } catch {
      toast.error("Failed to seed credits");
    } finally {
      setSeeding(false);
    }
  }

  async function updateUsed(creditId: string, newUsed: number) {
    const credit = credits.find((c) => c.id === creditId);
    if (!credit) return;
    const clamped = Math.min(Math.max(newUsed, 0), credit.annual_amount);
    try {
      const { error } = await supabase
        .from("statement_credits")
        .update({ used_amount: clamped })
        .eq("id", creditId);
      if (error) throw error;
      setCredits((prev) =>
        prev.map((c) => (c.id === creditId ? { ...c, used_amount: clamped } : c))
      );
    } catch (err) {
      toast.error("Failed to update credit");
      console.error(err);
    }
  }

  async function deleteCredit(id: string) {
    try {
      const { error } = await supabase
        .from("statement_credits")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Credit removed");
      setDeleteConfirmId(null);
      setCredits((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error("Failed to remove credit");
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No cards yet</h2>
        <p className="text-muted-foreground text-sm">
          Add cards to your wallet to track statement credits.
        </p>
      </div>
    );
  }

  // Group credits by card
  const cardsWithCredits: CardWithCredits[] = [];
  const cardsWithoutCredits: UserCard[] = [];

  for (const card of cards) {
    const cardCredits = credits.filter((c) => c.user_card_id === card.id);
    if (cardCredits.length > 0) {
      cardsWithCredits.push({ card, credits: cardCredits });
    } else {
      cardsWithoutCredits.push(card);
    }
  }

  // Cards without credits that have known template credits
  const seedableCards = cardsWithoutCredits.filter((card) => !!card.card_template_id);

  // Summary totals
  const totalPotential = credits.reduce((sum, c) => sum + c.annual_amount, 0);
  const totalUsed = credits.reduce((sum, c) => sum + c.used_amount, 0);
  const totalRemaining = totalPotential - totalUsed;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statement Credits</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your annual and monthly card credits
        </p>
      </div>

      {/* Summary bar */}
      {credits.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Potential</p>
            <p className="text-lg font-semibold">${totalPotential.toFixed(0)}</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xs text-muted-foreground mb-1">Used</p>
            <p className="text-lg font-semibold text-amber-400">${totalUsed.toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className="text-lg font-semibold text-orange-300">${totalRemaining.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Seed banner for cards with known credits but none tracked */}
      {seedableCards.length > 0 && (
        <div className="rounded-2xl bg-primary/[0.06] border border-primary/20 p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {seedableCards.length === 1
                ? `${getCardName(seedableCards[0])} has known credits`
                : `${seedableCards.length} cards have known credits`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-populate statement credits based on your cards
            </p>
          </div>
          <Button
            size="sm"
            className="flex-shrink-0 gap-1.5"
            onClick={() => seedAllMissingCredits(seedableCards)}
            disabled={seeding}
          >
            <Wand2 className="w-3.5 h-3.5" />
            {seeding ? "Adding..." : "Auto-populate"}
          </Button>
        </div>
      )}

      {/* Cards with credits */}
      {cardsWithCredits.length === 0 && credits.length === 0 && seedableCards.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No credits tracked yet</p>
          <p className="text-sm text-muted-foreground">
            Credits are auto-added when you add premium cards. You can also add them manually per card.
          </p>
        </div>
      )}

      {cardsWithCredits.map(({ card, credits: cardCredits }) => {
        const color = getCardColor(card);
        const name = getCardName(card);
        const cardTotal = cardCredits.reduce((s, c) => s + c.annual_amount, 0);
        const cardUsed = cardCredits.reduce((s, c) => s + c.used_amount, 0);

        return (
          <div
            key={card.id}
            className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-semibold text-sm">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  ${cardUsed.toFixed(0)} / ${cardTotal.toFixed(0)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setAddDialogCardId(card.id)}
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
            </div>

            {/* Credits list */}
            <div className="divide-y divide-border/40">
              {cardCredits.map((credit) => {
                const pct = Math.min(
                  (credit.used_amount / credit.annual_amount) * 100,
                  100
                );
                const remaining = credit.annual_amount - credit.used_amount;
                const isConfirmingDelete = deleteConfirmId === credit.id;

                return (
                  <div key={credit.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">
                        {credit.name}
                      </span>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => deleteCredit(credit.id)}
                            className="text-xs px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(credit.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          title="Remove credit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          ${credit.used_amount.toFixed(0)} / ${credit.annual_amount.toFixed(0)} used
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            pct >= 100 ? "text-emerald-500" : "text-orange-300"
                          )}
                        >
                          {pct >= 100 ? "Fully used" : `$${remaining.toFixed(0)} left`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct >= 100
                              ? "bg-emerald-500"
                              : pct >= 70
                              ? "bg-amber-400"
                              : "bg-orange-400/70"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick update buttons */}
                    <QuickButtons credit={credit} onUpdate={updateUsed} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Cards without credits — collapsible */}
      {cardsWithoutCredits.length > 0 && (
        <div>
          <button
            onClick={() => setNoCreditsOpen((v) => !v)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-card border border-border text-sm font-medium hover:bg-muted/30 transition-all"
          >
            <span className="text-muted-foreground">
              {cardsWithoutCredits.length} card{cardsWithoutCredits.length !== 1 ? "s" : ""} with no credits tracked
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                noCreditsOpen && "rotate-180"
              )}
            />
          </button>
          {noCreditsOpen && (
            <div className="mt-2 rounded-2xl bg-card border border-border divide-y divide-border/40 overflow-hidden">
              {cardsWithoutCredits.map((card) => {
                const color = getCardColor(card);
                const name = getCardName(card);
                return (
                  <div
                    key={card.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm">{name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => setAddDialogCardId(card.id)}
                    >
                      <Plus className="w-3 h-3" />
                      Add Credit
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Credit Dialog */}
      {addDialogCardId && (
        <AddCreditDialog
          userCardId={addDialogCardId}
          userId={userId}
          open={!!addDialogCardId}
          onOpenChange={(v) => { if (!v) setAddDialogCardId(null); }}
          onAdded={fetchData}
        />
      )}
    </div>
  );
}
