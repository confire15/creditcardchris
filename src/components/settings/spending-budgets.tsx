"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpendingCategory } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";
import { RefreshCw } from "lucide-react";

type Budget = {
  category_id: string;
  monthly_limit: number;
  rollover_enabled: boolean;
  rollover_amount: number;
};

type CategoryWithBudget = SpendingCategory & {
  budget: number | null;
  rollover_enabled: boolean;
  rollover_amount: number;
  spent: number;
};

export function SpendingBudgets({ userId }: { userId: string }) {
  const [data, setData] = useState<CategoryWithBudget[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [rolloverToggles, setRolloverToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const thisMonth = new Date().toISOString().slice(0, 7);

    const [catsRes, budgetsRes, txRes] = await Promise.all([
      supabase.from("spending_categories").select("*").order("display_name"),
      supabase.from("spending_budgets").select("*").eq("user_id", userId),
      supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("user_id", userId)
        .gte("transaction_date", `${thisMonth}-01`),
    ]);

    const budgetMap: Record<string, number> = {};
    const rolloverEnabledMap: Record<string, boolean> = {};
    const rolloverAmountMap: Record<string, number> = {};
    (budgetsRes.data ?? []).forEach((b: Budget) => {
      budgetMap[b.category_id] = b.monthly_limit;
      rolloverEnabledMap[b.category_id] = b.rollover_enabled ?? false;
      rolloverAmountMap[b.category_id] = b.rollover_amount ?? 0;
    });

    const spentMap: Record<string, number> = {};
    (txRes.data ?? []).forEach((tx: { category_id: string; amount: number }) => {
      spentMap[tx.category_id] = (spentMap[tx.category_id] ?? 0) + tx.amount;
    });

    const cats = (catsRes.data ?? [])
      .filter((c: SpendingCategory) => c.name !== "other")
      .map((c: SpendingCategory) => ({
        ...c,
        budget: budgetMap[c.id] ?? null,
        rollover_enabled: rolloverEnabledMap[c.id] ?? false,
        rollover_amount: rolloverAmountMap[c.id] ?? 0,
        spent: spentMap[c.id] ?? 0,
      }));

    setData(cats);
    const initEdits: Record<string, string> = {};
    const initRollovers: Record<string, boolean> = {};
    cats.forEach((c) => {
      if (c.budget !== null) initEdits[c.id] = String(c.budget);
      initRollovers[c.id] = c.rollover_enabled;
    });
    setEdits(initEdits);
    setRolloverToggles(initRollovers);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveBudgets() {
    setSaving(true);
    try {
      const toUpsert = Object.entries(edits)
        .filter(([, val]) => val && parseFloat(val) > 0)
        .map(([category_id, val]) => ({
          user_id: userId,
          category_id,
          monthly_limit: parseFloat(val),
          rollover_enabled: rolloverToggles[category_id] ?? false,
        }));

      const toDelete = data
        .filter((c) => !edits[c.id] || parseFloat(edits[c.id] || "0") <= 0)
        .map((c) => c.id);

      await Promise.all([
        toUpsert.length > 0
          ? supabase
              .from("spending_budgets")
              .upsert(toUpsert, { onConflict: "user_id,category_id" })
          : Promise.resolve(),
        toDelete.length > 0
          ? supabase
              .from("spending_budgets")
              .delete()
              .eq("user_id", userId)
              .in("category_id", toDelete)
          : Promise.resolve(),
      ]);

      toast.success("Budgets saved");
      fetchData();
    } catch (err) {
      toast.error("Failed to save budgets");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-32 bg-muted animate-pulse rounded-xl" />;

  const hasBudgets = data.some((c) => c.budget !== null);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold">Monthly Budgets</h2>
        <Button size="sm" onClick={saveBudgets} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Set monthly limits per category. Enable rollover to carry unused budget to the next month.
      </p>

      <div className="space-y-4">
        {data.map((cat) => {
          const baseBudget = parseFloat(edits[cat.id] || "0") || cat.budget || 0;
          const rolloverOn = rolloverToggles[cat.id] ?? false;
          const effectiveLimit = baseBudget + (rolloverOn ? cat.rollover_amount : 0);
          const pct = effectiveLimit > 0 ? Math.min((cat.spent / effectiveLimit) * 100, 100) : 0;
          const isOver = cat.spent > effectiveLimit && effectiveLimit > 0;

          return (
            <div key={cat.id} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-sm flex-1">{cat.display_name}</span>
                {/* Rollover toggle — only show if budget is set */}
                {baseBudget > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRolloverToggles((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                    }
                    title={rolloverOn ? "Rollover on" : "Rollover off"}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-colors ${
                      rolloverOn
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    {rolloverOn && cat.rollover_amount > 0
                      ? `+${formatCurrency(cat.rollover_amount)}`
                      : "Rollover"}
                  </button>
                )}
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    className="pl-6 h-8 text-sm"
                    placeholder="No limit"
                    value={edits[cat.id] ?? ""}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [cat.id]: e.target.value }))
                    }
                  />
                </div>
              </div>

              {effectiveLimit > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : "bg-primary/70"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ${isOver ? "text-red-400" : "text-muted-foreground"}`}>
                    {formatCurrency(cat.spent)} / {formatCurrency(effectiveLimit)}
                    {isOver && " — over!"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!hasBudgets && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Set a monthly limit above to track spending against your budget
        </p>
      )}
    </div>
  );
}
