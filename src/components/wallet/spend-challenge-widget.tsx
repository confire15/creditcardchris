"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, Plus, Trash2, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { format, parseISO, differenceInDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

type SpendChallenge = {
  id: string;
  user_card_id: string;
  name: string;
  target_amount: number;
  start_date: string;
  deadline_date: string;
};

export function SpendChallengeWidget({ userId, cards }: { userId: string; cards: UserCard[] }) {
  const supabase = createClient();
  const [challenges, setChallenges] = useState<SpendChallenge[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    user_card_id: cards[0]?.id ?? "",
    name: "Welcome Bonus",
    target_amount: "4000",
    start_date: new Date().toISOString().slice(0, 10),
    deadline_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const fetchChallenges = useCallback(async () => {
    const { data } = await supabase
      .from("spend_challenges")
      .select("*")
      .eq("user_id", userId)
      .order("deadline_date", { ascending: true });
    const list = (data ?? []) as SpendChallenge[];
    setChallenges(list);

    // Fetch spending progress for each challenge
    const progressMap: Record<string, number> = {};
    await Promise.all(
      list.map(async (ch) => {
        const { data: txData } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("user_card_id", ch.user_card_id)
          .gte("transaction_date", ch.start_date)
          .lte("transaction_date", ch.deadline_date);
        progressMap[ch.id] = (txData ?? []).reduce((s, t) => s + t.amount, 0);
      })
    );
    setProgress(progressMap);
  }, [userId, supabase]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  async function handleSave() {
    if (!form.user_card_id || !form.target_amount) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("spend_challenges").insert({
        user_id: userId,
        user_card_id: form.user_card_id,
        name: form.name.trim() || "Welcome Bonus",
        target_amount: parseFloat(form.target_amount),
        start_date: form.start_date,
        deadline_date: form.deadline_date,
      });
      if (error) throw error;
      toast.success("Spend challenge added");
      setDialogOpen(false);
      fetchChallenges();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("spend_challenges").delete().eq("id", id);
    fetchChallenges();
  }

  if (challenges.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Spend Challenges</h2>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Track minimum spend requirements for welcome bonuses.
        </p>
        <AddDialog open={dialogOpen} onOpenChange={setDialogOpen} form={form} setForm={setForm} cards={cards} saving={saving} onSave={handleSave} />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold">Spend Challenges</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      <div className="space-y-4">
        {challenges.map((ch) => {
          const card = cards.find((c) => c.id === ch.user_card_id);
          const spent = progress[ch.id] ?? 0;
          const pct = Math.min((spent / ch.target_amount) * 100, 100);
          const remaining = Math.max(ch.target_amount - spent, 0);
          const deadline = parseISO(ch.deadline_date);
          const daysLeft = differenceInDays(deadline, new Date());
          const isComplete = pct >= 100;
          const isExpired = !isComplete && isAfter(new Date(), deadline);

          return (
            <div key={ch.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{ch.name}</p>
                    {isComplete && <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {card ? getCardName(card) : "Unknown card"} ·{" "}
                    {isComplete
                      ? "Complete!"
                      : isExpired
                      ? "Expired"
                      : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <div>
                    <p className={cn("text-sm font-bold", isComplete ? "text-emerald-400" : "text-foreground")}>
                      {formatCurrency(spent)}
                    </p>
                    <p className="text-xs text-muted-foreground">of {formatCurrency(ch.target_amount)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(ch.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", isComplete ? "bg-emerald-400" : "bg-primary")}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 55, damping: 14, delay: 0.1 }}
                />
              </div>

              {!isComplete && !isExpired && remaining > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(remaining)} more to go · deadline {format(deadline, "MMM d, yyyy")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <AddDialog open={dialogOpen} onOpenChange={setDialogOpen} form={form} setForm={setForm} cards={cards} saving={saving} onSave={handleSave} />
    </div>
  );
}

type FormState = { user_card_id: string; name: string; target_amount: string; start_date: string; deadline_date: string; };

function AddDialog({ open, onOpenChange, form, setForm, cards, saving, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: FormState;
  setForm: (f: FormState) => void;
  cards: UserCard[];
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Spend Challenge</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Card</Label>
            <select
              value={form.user_card_id}
              onChange={(e) => setForm({ ...form, user_card_id: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>{getCardName(c)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Challenge Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Welcome Bonus"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Spend Target ($)</Label>
            <Input
              type="number"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              placeholder="4000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline_date} onChange={(e) => setForm({ ...form, deadline_date: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Add Challenge"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
