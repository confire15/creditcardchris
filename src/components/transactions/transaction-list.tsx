"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, Sparkles } from "lucide-react";

export function TransactionList({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from("transactions")
      .select(`
        *,
        category:spending_categories(*),
        user_card:user_cards(*, card_template:card_templates(*))
      `)
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    setTransactions(data ?? []);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalRewards = transactions.reduce(
    (sum, t) => sum + (t.rewards_earned ?? 0),
    0
  );
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-base mt-2">
            {transactions.length} transactions &middot;{" "}
            {formatCurrency(totalSpent)} total
          </p>
        </div>
        <AddTransactionDialog userId={userId} onTransactionAdded={fetchTransactions} />
      </div>

      {/* Summary cards */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-card border border-white/[0.06] rounded-2xl p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Total Spent</p>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="bg-primary/[0.08] border border-primary/20 rounded-2xl p-6">
            <p className="text-sm text-primary/80 font-medium mb-2">Rewards Earned</p>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <p className="text-3xl font-bold text-primary tracking-tight">
                {totalRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="bg-card border border-white/[0.06] rounded-2xl p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Transactions</p>
            <p className="text-3xl font-bold tracking-tight">{transactions.length}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[76px] rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-2xl">
          <Receipt className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-3">No transactions yet</h3>
          <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto">
            Start logging purchases to track your spending and see rewards earned.
          </p>
          <AddTransactionDialog userId={userId} onTransactionAdded={fetchTransactions}>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Transaction
            </Button>
          </AddTransactionDialog>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-white/[0.06] hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                {tx.user_card ? (
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: getCardColor(tx.user_card) }}
                  />
                ) : (
                  <Receipt className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {tx.merchant ?? (
                    <span className="text-muted-foreground italic">No merchant</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(tx.transaction_date)}
                  </span>
                  {tx.category && (
                    <Badge variant="secondary" className="text-xs">
                      {tx.category.display_name}
                    </Badge>
                  )}
                  {tx.user_card && (
                    <span className="text-xs text-muted-foreground">
                      {getCardName(tx.user_card)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-semibold">{formatCurrency(tx.amount)}</p>
                {tx.rewards_earned ? (
                  <p className="text-xs text-primary font-medium mt-0.5">
                    +{tx.rewards_earned.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    pts
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
