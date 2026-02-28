"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/format";
import Link from "next/link";
import { PiggyBank, AlertTriangle, ArrowRight } from "lucide-react";

type BudgetAlert = {
  name: string;
  spent: number;
  limit: number;
  pct: number;
};

export function BudgetAlertsWidget({ userId }: { userId: string }) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const supabase = createClient();

  const fetchAlerts = useCallback(async () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const [budgetsRes, txRes, catsRes] = await Promise.all([
      supabase.from("spending_budgets").select("category_id, monthly_limit").eq("user_id", userId),
      supabase.from("transactions").select("category_id, amount").eq("user_id", userId).gte("transaction_date", `${thisMonth}-01`),
      supabase.from("spending_categories").select("id, display_name"),
    ]);

    const catMap: Record<string, string> = {};
    (catsRes.data ?? []).forEach((c) => { catMap[c.id] = c.display_name; });

    const spentMap: Record<string, number> = {};
    (txRes.data ?? []).forEach((tx: { category_id: string; amount: number }) => {
      spentMap[tx.category_id] = (spentMap[tx.category_id] ?? 0) + tx.amount;
    });

    const result: BudgetAlert[] = (budgetsRes.data ?? [])
      .map((b: { category_id: string; monthly_limit: number }) => ({
        name: catMap[b.category_id] ?? b.category_id,
        spent: spentMap[b.category_id] ?? 0,
        limit: b.monthly_limit,
        pct: ((spentMap[b.category_id] ?? 0) / b.monthly_limit) * 100,
      }))
      .filter((a) => a.pct >= 50)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);

    setAlerts(result);
    setLoaded(true);
  }, [userId, supabase]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  if (!loaded || alerts.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Budget Status</h2>
        </div>
        <Link
          href="/budgets"
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1.5 font-medium transition-colors"
        >
          Manage <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="space-y-5">
        {alerts.map((alert) => {
          const isOver = alert.pct > 100;
          const isNear = alert.pct >= 80;
          return (
            <div key={alert.name}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isOver && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  <span className="text-sm font-medium">{alert.name}</span>
                  {isOver && (
                    <span className="text-xs font-medium text-red-400">Over budget!</span>
                  )}
                </div>
                <span className={`text-xs font-semibold tabular-nums ${isOver ? "text-red-400" : isNear ? "text-amber-400" : "text-muted-foreground"}`}>
                  {formatCurrency(alert.spent)} / {formatCurrency(alert.limit)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOver ? "bg-red-400" : isNear ? "bg-amber-400" : "bg-primary/70"
                  }`}
                  style={{ width: `${Math.min(alert.pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
