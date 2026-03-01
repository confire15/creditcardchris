"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TrackedSubscription, UserCard } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/format";
import { getCardName } from "@/lib/utils/rewards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Calendar,
  CreditCard,
  Edit2,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { addDays, addMonths, addYears, format, isAfter, isBefore, parseISO } from "date-fns";

type DetectedSub = {
  merchant: string;
  amount: number;
  count: number;
  dates: string[];
};

export function SubscriptionsList({ userId }: { userId: string }) {
  const [subs, setSubs] = useState<TrackedSubscription[]>([]);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [detected, setDetected] = useState<DetectedSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editSub, setEditSub] = useState<TrackedSubscription | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const threeMonthsAgo = addMonths(new Date(), -3).toISOString().split("T")[0];

    const [subsRes, cardsRes, txRes] = await Promise.all([
      supabase
        .from("tracked_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("amount", { ascending: false }),
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*)")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("transactions")
        .select("merchant, amount, transaction_date")
        .eq("user_id", userId)
        .gte("transaction_date", threeMonthsAgo)
        .not("merchant", "is", null),
    ]);

    if (subsRes.data) setSubs(subsRes.data);
    if (cardsRes.data) setCards(cardsRes.data);

    // Auto-detect recurring merchants
    if (txRes.data) {
      const merchantMap: Record<string, { amounts: number[]; dates: string[] }> = {};
      for (const tx of txRes.data) {
        if (!tx.merchant) continue;
        const key = tx.merchant.toLowerCase().trim();
        if (!merchantMap[key]) merchantMap[key] = { amounts: [], dates: [] };
        merchantMap[key].amounts.push(tx.amount);
        merchantMap[key].dates.push(tx.transaction_date);
      }

      const recurring: DetectedSub[] = [];
      const trackedMerchants = new Set(
        (subsRes.data ?? []).map((s: TrackedSubscription) => s.merchant.toLowerCase().trim())
      );

      for (const [key, { amounts, dates }] of Object.entries(merchantMap)) {
        if (dates.length < 2) continue;
        // Check if amounts are similar (within 5% variance — catches price increases)
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const allSimilar = amounts.every((a) => Math.abs(a - avg) / avg < 0.2);
        if (!allSimilar) continue;
        if (trackedMerchants.has(key)) continue;

        const originalMerchant = txRes.data.find(
          (t) => t.merchant?.toLowerCase().trim() === key
        )?.merchant ?? key;

        recurring.push({
          merchant: originalMerchant,
          amount: avg,
          count: dates.length,
          dates: dates.sort(),
        });
      }

      setDetected(recurring.sort((a, b) => b.amount - a.amount));
    }

    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function deleteSub(id: string) {
    const { error } = await supabase
      .from("tracked_subscriptions")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Subscription removed");
      fetchData();
    }
  }

  async function toggleAlert(sub: TrackedSubscription) {
    const { error } = await supabase
      .from("tracked_subscriptions")
      .update({ price_alert_enabled: !sub.price_alert_enabled })
      .eq("id", sub.id);
    if (!error) fetchData();
  }

  async function addDetected(det: DetectedSub) {
    const { error } = await supabase.from("tracked_subscriptions").insert({
      user_id: userId,
      merchant: det.merchant,
      amount: det.amount,
      billing_cycle: "monthly",
      last_charged_at: det.dates[det.dates.length - 1],
      next_charge_at: addMonths(parseISO(det.dates[det.dates.length - 1]), 1)
        .toISOString()
        .split("T")[0],
    });
    if (error) {
      toast.error("Failed to track");
    } else {
      toast.success(`${det.merchant} added to subscriptions`);
      fetchData();
    }
  }

  const totalMonthly = subs
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + (s.billing_cycle === "monthly" ? s.amount : s.amount / 12), 0);

  const upcomingThisWeek = subs.filter((s) => {
    if (!s.next_charge_at || !s.is_active) return false;
    const next = parseISO(s.next_charge_at);
    const in7 = addDays(new Date(), 7);
    return isAfter(next, new Date()) && isBefore(next, in7);
  });

  const priceIncreases = subs.filter(
    (s) => s.previous_amount !== null && s.amount > (s.previous_amount ?? 0)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Monthly Total</p>
          <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalMonthly)}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalMonthly * 12)}/yr</p>
        </div>
        <div className="bg-card border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold tracking-tight">{subs.filter((s) => s.is_active).length}</p>
          <p className="text-xs text-muted-foreground mt-1">subscriptions tracked</p>
        </div>
        <div className={`bg-card border rounded-2xl p-5 ${upcomingThisWeek.length > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-white/[0.06]"}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Due This Week</p>
          <p className={`text-2xl font-bold tracking-tight ${upcomingThisWeek.length > 0 ? "text-amber-400" : ""}`}>
            {upcomingThisWeek.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {upcomingThisWeek.length > 0
              ? formatCurrency(upcomingThisWeek.reduce((s, sub) => s + sub.amount, 0))
              : "all clear"}
          </p>
        </div>
      </div>

      {/* Price increase alerts */}
      {priceIncreases.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">Price increase detected</p>
            {priceIncreases.map((s) => (
              <p key={s.id} className="text-sm text-muted-foreground mt-0.5">
                {s.merchant}: {formatCurrency(s.previous_amount ?? 0)} → {formatCurrency(s.amount)}/mo
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Detected recurring (not yet tracked) */}
      {detected.length > 0 && (
        <div className="bg-card border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Detected recurring charges</p>
            <Badge variant="secondary" className="ml-auto text-xs">{detected.length}</Badge>
          </div>
          <div className="space-y-2">
            {detected.slice(0, 5).map((det) => (
              <div key={det.merchant} className="flex items-center gap-3 py-2 border-t border-white/[0.04] first:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{det.merchant}</p>
                  <p className="text-xs text-muted-foreground">{det.count}x in last 3 months</p>
                </div>
                <span className="text-sm font-semibold text-muted-foreground">{formatCurrency(det.amount)}/mo</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-3"
                  onClick={() => addDetected(det)}
                >
                  Track
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracked subscriptions */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Tracked Subscriptions</h2>
        <AddEditSubDialog
          userId={userId}
          cards={cards}
          onSaved={fetchData}
          open={addOpen}
          onOpenChange={setAddOpen}
        >
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add
          </Button>
        </AddEditSubDialog>
      </div>

      {subs.length === 0 ? (
        <div className="bg-card border border-white/[0.06] rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium mb-1">No subscriptions tracked</p>
          <p className="text-xs text-muted-foreground">
            Add one manually or track a detected recurring charge above
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {subs.map((sub) => {
            const isUpcoming = sub.next_charge_at &&
              isAfter(parseISO(sub.next_charge_at), new Date()) &&
              isBefore(parseISO(sub.next_charge_at), addDays(new Date(), 7));
            const card = cards.find((c) => c.id === sub.card_id);

            return (
              <div
                key={sub.id}
                className={`group bg-card border rounded-2xl p-4 flex items-center gap-4 transition-colors hover:bg-white/[0.02] ${
                  isUpcoming ? "border-amber-500/30" : "border-white/[0.06]"
                }`}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-4 h-4 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{sub.merchant}</p>
                    {isUpcoming && (
                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs h-4 px-1.5">
                        Due soon
                      </Badge>
                    )}
                    {sub.previous_amount && sub.amount > sub.previous_amount && (
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-xs h-4 px-1.5">
                        ↑ Price increase
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {card && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {getCardName(card)}
                      </span>
                    )}
                    {sub.next_charge_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Next: {format(parseISO(sub.next_charge_at), "MMM d")}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">{sub.billing_cycle}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(sub.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.billing_cycle === "annual"
                      ? `${formatCurrency(sub.amount / 12)}/mo`
                      : `${formatCurrency(sub.amount * 12)}/yr`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleAlert(sub)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
                    title={sub.price_alert_enabled ? "Disable price alerts" : "Enable price alerts"}
                  >
                    {sub.price_alert_enabled ? (
                      <Bell className="w-3.5 h-3.5" />
                    ) : (
                      <BellOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <AddEditSubDialog
                    userId={userId}
                    cards={cards}
                    sub={sub}
                    onSaved={fetchData}
                    open={editSub?.id === sub.id}
                    onOpenChange={(o) => setEditSub(o ? sub : null)}
                  >
                    <button
                      onClick={() => setEditSub(sub)}
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </AddEditSubDialog>
                  <button
                    onClick={() => deleteSub(sub.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddEditSubDialog({
  userId,
  cards,
  sub,
  onSaved,
  open,
  onOpenChange,
  children,
}: {
  userId: string;
  cards: UserCard[];
  sub?: TrackedSubscription;
  onSaved: () => void;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [merchant, setMerchant] = useState(sub?.merchant ?? "");
  const [amount, setAmount] = useState(sub ? String(sub.amount) : "");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(sub?.billing_cycle ?? "monthly");
  const [cardId, setCardId] = useState(sub?.card_id ?? "");
  const [lastCharged, setLastCharged] = useState(sub?.last_charged_at ?? "");

  useEffect(() => {
    if (open) {
      setMerchant(sub?.merchant ?? "");
      setAmount(sub ? String(sub.amount) : "");
      setBillingCycle(sub?.billing_cycle ?? "monthly");
      setCardId(sub?.card_id ?? "");
      setLastCharged(sub?.last_charged_at ?? "");
    }
  }, [open, sub]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedAmount = parseFloat(amount);
      const nextCharge = lastCharged
        ? billingCycle === "monthly"
          ? addMonths(parseISO(lastCharged), 1).toISOString().split("T")[0]
          : addYears(parseISO(lastCharged), 1).toISOString().split("T")[0]
        : null;

      const payload = {
        merchant,
        amount: parsedAmount,
        billing_cycle: billingCycle,
        card_id: cardId || null,
        last_charged_at: lastCharged || null,
        next_charge_at: nextCharge,
        previous_amount: sub && parsedAmount !== sub.amount ? sub.amount : (sub?.previous_amount ?? null),
      };

      const { error } = sub
        ? await supabase.from("tracked_subscriptions").update(payload).eq("id", sub.id)
        : await supabase.from("tracked_subscriptions").insert({ ...payload, user_id: userId });

      if (error) throw error;
      toast.success(sub ? "Subscription updated" : "Subscription added");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{sub ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Merchant / Service</Label>
            <Input
              placeholder="Netflix, Spotify, iCloud..."
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as "monthly" | "annual")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Last Charged (optional)</Label>
            <Input
              type="date"
              value={lastCharged}
              onChange={(e) => setLastCharged(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Used to calculate next charge date</p>
          </div>
          <div className="space-y-2">
            <Label>Card (optional)</Label>
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger>
                <SelectValue placeholder="Any card" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any card</SelectItem>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {getCardName(c)}{c.last_four ? ` ••${c.last_four}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !merchant || !amount}>
            {loading ? "Saving..." : sub ? "Save Changes" : "Add Subscription"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
