"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, StatementCredit } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import {
  AlertTriangle,
  TrendingUp,
  Wallet,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trophy,
  CreditCard,
  Zap,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { endOfMonth, differenceInDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function inferCategory(name: string): { label: string; className: string } {
  const n = name.toLowerCase();
  if (
    n.includes("dining") || n.includes("food") || n.includes("restaurant") ||
    n.includes("grubhub") || n.includes("doordash") || n.includes("seamless") ||
    n.includes("cheesecake") || n.includes("goldbelly") || n.includes("resy")
  ) return { label: "Dining", className: "bg-emerald-500/15 text-emerald-400" };
  if (n.includes("travel") || n.includes("trip"))
    return { label: "Travel", className: "bg-blue-500/15 text-blue-400" };
  if (n.includes("uber") || n.includes("lyft") || n.includes("transit") || n.includes("ride"))
    return { label: "Transit", className: "bg-sky-500/15 text-sky-400" };
  if (
    n.includes("walmart") || n.includes("membership") ||
    n.includes("subscription") || n.includes("digital")
  ) return { label: "Subscription", className: "bg-purple-500/15 text-purple-400" };
  if (
    n.includes("airline") || n.includes("flight") || n.includes("delta") ||
    n.includes("united") || n.includes("southwest") || n.includes("american airlines")
  ) return { label: "Airline", className: "bg-indigo-500/15 text-indigo-400" };
  if (
    n.includes("hotel") || n.includes("resort") || n.includes("marriott") ||
    n.includes("hilton") || n.includes("hyatt")
  ) return { label: "Hotel", className: "bg-amber-500/15 text-amber-400" };
  if (
    n.includes("entertainment") || n.includes("streaming") || n.includes("netflix") ||
    n.includes("spotify") || n.includes("hulu") || n.includes("disney") ||
    n.includes("peacock") || n.includes("audible") || n.includes("nytimes")
  ) return { label: "Entertainment", className: "bg-pink-500/15 text-pink-400" };
  if (
    n.includes("clear") || n.includes("global entry") || n.includes("tsa") ||
    n.includes("lounge") || n.includes("priority pass")
  ) return { label: "Lifestyle", className: "bg-teal-500/15 text-teal-400" };
  if (n.includes("saks") || n.includes("shop") || n.includes("retail"))
    return { label: "Shopping", className: "bg-rose-500/15 text-rose-400" };
  if (n.includes("equinox") || n.includes("fitness") || n.includes("gym") || n.includes("wellness"))
    return { label: "Fitness", className: "bg-orange-500/15 text-orange-400" };
  return { label: "Credit", className: "bg-primary/15 text-primary" };
}

function inferCadence(name: string): "Monthly" | "Annual" {
  const n = name.toLowerCase();
  if (
    n.includes("monthly") || n.includes("/mo") ||
    n.includes("per month") || n.includes("each month")
  ) return "Monthly";
  return "Annual";
}

type CreditWithCard = StatementCredit & { card: UserCard };

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
      const { error } = await supabase.from("statement_credits").insert({
        user_card_id: userCardId,
        user_id: userId,
        name: name.trim(),
        annual_amount: parseFloat(annualAmount),
        used_amount: usedAmount ? parseFloat(usedAmount) : 0,
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
            <Label>Credit name</Label>
            <Input
              placeholder="e.g. Monthly Dining Credit, Travel Credit"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Annual value ($)</Label>
            <Input
              type="number"
              min="1"
              placeholder="300"
              value={annualAmount}
              onChange={(e) => setAnnualAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Already used ($){" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
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

export function DashboardContent({ userId }: { userId: string }) {
  const supabase = createClient();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [credits, setCredits] = useState<StatementCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogCardId, setAddDialogCardId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      if (clamped >= credit.annual_amount) toast.success("Credit fully used!");
    } catch {
      toast.error("Failed to update");
    }
  }

  async function deleteCredit(id: string) {
    try {
      await supabase.from("statement_credits").delete().eq("id", id);
      toast.success("Credit removed");
      setDeleteConfirmId(null);
      setCredits((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error("Failed to remove");
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  // ─── Computed Stats ───────────────────────────────────────────────────────
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const daysLeft = differenceInDays(endOfMonth(now), now) + 1;

  const totalPotential = credits.reduce((s, c) => s + c.annual_amount, 0);
  const totalUsed = credits.reduce((s, c) => s + c.used_amount, 0);
  const totalRemaining = totalPotential - totalUsed;

  const thisMonthCredits = credits.filter((c) => c.reset_month === currentMonth);
  const thisMonthPotential = thisMonthCredits.reduce((s, c) => s + c.annual_amount, 0);
  const thisMonthUsed = thisMonthCredits.reduce((s, c) => s + c.used_amount, 0);

  const expiringCredits: CreditWithCard[] = credits
    .filter((c) => c.reset_month === currentMonth && c.used_amount < c.annual_amount)
    .map((c) => ({ ...c, card: cards.find((card) => card.id === c.user_card_id)! }))
    .filter((c) => c.card);

  const expiringTotal = expiringCredits.reduce(
    (s, c) => s + (c.annual_amount - c.used_amount),
    0
  );

  const recentActivity = credits
    .filter((c) => c.used_amount > 0)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
    .map((c) => ({ ...c, card: cards.find((card) => card.id === c.user_card_id) }));

  const yearPct = totalPotential > 0 ? (totalUsed / totalPotential) * 100 : 0;
  const monthPct =
    thisMonthPotential > 0 ? (thisMonthUsed / thisMonthPotential) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track your credit card benefits and savings
        </p>
      </div>

      {/* Savings Banner */}
      {credits.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm">Your Savings</span>
              <span className="ml-2 text-xs text-muted-foreground">
                🚀 Time to Maximize!
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* This Month */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">This Month</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                ${thisMonthUsed.toFixed(2)}
              </p>
              <div className="space-y-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(monthPct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{monthPct.toFixed(0)}% used</span>
                  <span>of ${thisMonthPotential.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* This Year */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-muted-foreground">This Year</span>
              </div>
              <p className="text-2xl font-bold text-amber-500">
                ${totalUsed.toFixed(2)}
              </p>
              <div className="space-y-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${Math.min(yearPct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{yearPct.toFixed(0)}% used</span>
                  <span>of ${totalPotential.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

          {totalUsed > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                You&apos;ve already saved{" "}
                <span className="font-semibold">${totalUsed.toFixed(2)}</span>{" "}
                this year — that&apos;s real money back in your pocket!
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-2">
          <div className="flex items-start justify-between">
            <p className="text-xs text-muted-foreground">Available Value</p>
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-primary">${totalRemaining.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Left to use</p>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-2">
          <div className="flex items-start justify-between">
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-500">${expiringTotal.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">
            {expiringCredits.length} benefit{expiringCredits.length !== 1 ? "s" : ""} this month
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-2">
          <div className="flex items-start justify-between">
            <p className="text-xs text-muted-foreground">Active Cards</p>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <p className="text-xl font-bold">{cards.length}</p>
          <p className="text-xs text-muted-foreground">Tracking benefits</p>
        </div>
      </div>

      {/* Expiring Soon */}
      {expiringCredits.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Expiring Soon
            </h2>
            <span className="text-xs text-muted-foreground">
              {daysLeft} day{daysLeft !== 1 ? "s" : ""} left this month
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringCredits.map((credit) => {
              const category = inferCategory(credit.name);
              const cadence = inferCadence(credit.name);
              const remaining = credit.annual_amount - credit.used_amount;
              const cardName = getCardName(credit.card);
              const cardColor = getCardColor(credit.card);
              const expiresDate = format(
                endOfMonth(new Date(now.getFullYear(), credit.reset_month - 1)),
                "MMM d"
              );
              return (
                <div
                  key={credit.id}
                  className="rounded-2xl bg-card border border-amber-500/20 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">
                        {credit.name}
                      </p>
                      <p className="text-lg font-bold text-amber-500 mt-0.5">
                        ${credit.annual_amount.toFixed(0)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {daysLeft}d left
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        category.className
                      )}
                    >
                      {category.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {cadence}
                    </span>
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cardColor }}
                      />
                      {cardName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                      Expires {expiresDate} · ${remaining.toFixed(0)} left
                    </p>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs gap-1 flex-shrink-0"
                      onClick={() => updateUsed(credit.id, credit.annual_amount)}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Mark Used
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* My Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">My Cards</h2>
          <Link
            href="/wallet"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {cards.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border/60 p-8 text-center">
            <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium mb-1">No cards yet</p>
            <p className="text-xs text-muted-foreground mb-3">
              Add cards to your wallet to start tracking benefits
            </p>
            <Link href="/wallet">
              <Button size="sm">Add Cards</Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/40 overflow-hidden">
            {cards.map((card) => {
              const color = getCardColor(card);
              const name = getCardName(card);
              const issuer =
                card.card_template?.issuer ?? card.custom_issuer ?? "";
              const fee = card.card_template?.annual_fee ?? 0;
              return (
                <div
                  key={card.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-6 rounded-md flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {name}
                      </p>
                      {issuer && (
                        <p className="text-xs text-muted-foreground">{issuer}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => setAddDialogCardId(card.id)}
                    >
                      <Plus className="w-3 h-3" />
                      Add Credit
                    </Button>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ${fee}/yr
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* All Credits — grouped by card */}
      {credits.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">All Credits</h2>
          <div className="space-y-4">
            {cards
              .filter((card) => credits.some((c) => c.user_card_id === card.id))
              .map((card) => {
                const cardCredits = credits.filter(
                  (c) => c.user_card_id === card.id
                );
                const color = getCardColor(card);
                const name = getCardName(card);
                const cardTotal = cardCredits.reduce(
                  (s, c) => s + c.annual_amount,
                  0
                );
                const cardUsed = cardCredits.reduce(
                  (s, c) => s + c.used_amount,
                  0
                );

                return (
                  <div
                    key={card.id}
                    className="rounded-2xl bg-card border border-border/60 overflow-hidden"
                  >
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

                    <div className="divide-y divide-border/40">
                      {cardCredits.map((credit) => {
                        const pct = Math.min(
                          (credit.used_amount / credit.annual_amount) * 100,
                          100
                        );
                        const remaining =
                          credit.annual_amount - credit.used_amount;
                        const isConfirmingDelete =
                          deleteConfirmId === credit.id;
                        const q1 = Math.round(credit.annual_amount * 0.25);
                        const q2 = Math.round(credit.annual_amount * 0.5);

                        return (
                          <div key={credit.id} className="px-4 py-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium">
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
                                  onClick={() =>
                                    setDeleteConfirmId(credit.id)
                                  }
                                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">
                                  ${credit.used_amount.toFixed(0)} /{" "}
                                  ${credit.annual_amount.toFixed(0)} used
                                </span>
                                <span
                                  className={cn(
                                    "text-xs font-medium",
                                    pct >= 100
                                      ? "text-emerald-500"
                                      : "text-primary"
                                  )}
                                >
                                  {pct >= 100
                                    ? "Fully used"
                                    : `$${remaining.toFixed(0)} left`}
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    pct >= 100
                                      ? "bg-emerald-500"
                                      : pct >= 70
                                      ? "bg-amber-500"
                                      : "bg-primary/70"
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() =>
                                  updateUsed(
                                    credit.id,
                                    credit.used_amount + q1
                                  )
                                }
                                className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                              >
                                +${q1}
                              </button>
                              <button
                                onClick={() =>
                                  updateUsed(
                                    credit.id,
                                    credit.used_amount + q2
                                  )
                                }
                                className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                              >
                                +${q2}
                              </button>
                              <button
                                onClick={() =>
                                  updateUsed(credit.id, credit.annual_amount)
                                }
                                className="text-xs px-2 py-0.5 rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-all"
                              >
                                Mark Full
                              </button>
                              <button
                                onClick={() => updateUsed(credit.id, 0)}
                                className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Recent Activity</h2>
          <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/40 overflow-hidden">
            {recentActivity.map((item) => {
              const cardName = item.card
                ? getCardName(item.card)
                : "Unknown Card";
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{cardName}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-emerald-500">
                      +${item.used_amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.updated_at), "MMM d")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {cards.length > 0 && credits.length === 0 && (
        <div className="rounded-2xl bg-card border border-border/60 p-8 text-center">
          <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No credits tracked yet</p>
          <p className="text-sm text-muted-foreground">
            Credits are auto-added when you add premium cards. Use the buttons
            above to add them manually per card.
          </p>
        </div>
      )}

      {/* Add Credit Dialog */}
      {addDialogCardId && (
        <AddCreditDialog
          userCardId={addDialogCardId}
          userId={userId}
          open={!!addDialogCardId}
          onOpenChange={(v) => {
            if (!v) setAddDialogCardId(null);
          }}
          onAdded={fetchData}
        />
      )}
    </div>
  );
}
