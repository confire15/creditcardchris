"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RewardsGoal } from "@/lib/types/database";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Target, Plus, Trash2, Trophy, Calendar } from "lucide-react";
import { toast } from "sonner";

function GoalCard({
  goal,
  totalRewards,
  onDelete,
}: {
  goal: RewardsGoal;
  totalRewards: number;
  onDelete: () => void;
}) {
  const pct = Math.min((totalRewards / goal.target_points) * 100, 100);
  const remaining = Math.max(goal.target_points - totalRewards, 0);
  const done = totalRewards >= goal.target_points;

  const daysLeft = goal.target_date
    ? Math.ceil(
        (new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div
      className={`bg-card border rounded-2xl p-6 ${
        done ? "border-primary/30 bg-primary/[0.04]" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              done ? "bg-primary text-primary-foreground" : "bg-muted/60"
            }`}
          >
            {done ? (
              <Trophy className="w-5 h-5" />
            ) : (
              <Target className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-semibold">{goal.name}</p>
            {goal.target_date && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {daysLeft !== null && daysLeft >= 0
                  ? `${daysLeft} days left`
                  : "Past deadline"}
                {" · "}
                {new Date(goal.target_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium">
            {totalRewards.toLocaleString()} / {goal.target_points.toLocaleString()} pts
          </span>
          <span
            className={`text-sm font-bold ${done ? "text-primary" : "text-muted-foreground"}`}
          >
            {pct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2.5 bg-muted/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              done ? "bg-primary" : "bg-primary/60"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {!done && (
        <p className="text-xs text-muted-foreground">
          {remaining.toLocaleString()} pts to go
        </p>
      )}
      {done && (
        <p className="text-xs text-primary font-medium">Goal reached!</p>
      )}
    </div>
  );
}

export function GoalsList({
  userId,
  totalRewards,
}: {
  userId: string;
  totalRewards: number;
}) {
  const [goals, setGoals] = useState<RewardsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<RewardsGoal | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [targetPoints, setTargetPoints] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const supabase = createClient();

  const fetchGoals = useCallback(async () => {
    const { data } = await supabase
      .from("rewards_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setGoals(data ?? []);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  function openDialog() {
    setName("");
    setTargetPoints("");
    setTargetDate("");
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!name.trim() || !targetPoints) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("rewards_goals").insert({
        user_id: userId,
        name: name.trim(),
        target_points: parseInt(targetPoints),
        target_date: targetDate || null,
      });
      if (error) throw error;
      toast.success("Goal created");
      setDialogOpen(false);
      fetchGoals();
    } catch (err) {
      toast.error("Failed to create goal");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingGoal) return;
    try {
      const { error } = await supabase
        .from("rewards_goals")
        .update({ is_active: false })
        .eq("id", deletingGoal.id);
      if (error) throw error;
      toast.success("Goal removed");
      setDeletingGoal(null);
      fetchGoals();
    } catch (err) {
      toast.error("Failed to remove goal");
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground text-base mt-2">
            {totalRewards.toLocaleString()} total points earned
          </p>
        </div>
        <Button onClick={openDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <Target className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-3">No goals yet</h3>
          <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto">
            Set a rewards target to track your progress toward a redemption.
          </p>
          <Button onClick={openDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              totalRewards={totalRewards}
              onDelete={() => setDeletingGoal(goal)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Goal name</Label>
              <Input
                id="goal-name"
                placeholder="e.g. Free flight to Japan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-points">Target points</Label>
              <Input
                id="goal-points"
                type="number"
                min="1"
                placeholder="e.g. 60000"
                value={targetPoints}
                onChange={(e) => setTargetPoints(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">
                Target date{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !targetPoints || saving}
            >
              {saving ? "Creating..." : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingGoal}
        onOpenChange={(open) => { if (!open) setDeletingGoal(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deletingGoal?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
