"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Receipt, Plus, Sparkles, Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TransactionList({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  function exportCSV() {
    if (transactions.length === 0) return;

    const headers = ["Date", "Merchant", "Category", "Card", "Amount", "Rewards Earned"];
    const rows = transactions.map((tx) => [
      tx.transaction_date,
      tx.merchant ?? "",
      tx.category?.display_name ?? "",
      tx.user_card ? getCardName(tx.user_card) : "",
      tx.amount.toFixed(2),
      tx.rewards_earned?.toFixed(0) ?? "0",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  async function handleDelete() {
    if (!deletingTx) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", deletingTx.id);
      if (error) throw error;
      toast.success("Transaction deleted");
      setDeletingTx(null);
      fetchTransactions();
    } catch (err) {
      toast.error("Failed to delete transaction");
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  }

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
        <div className="flex items-center gap-2">
          {transactions.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          )}
          <AddTransactionDialog userId={userId} onTransactionAdded={fetchTransactions} />
        </div>
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
              className={cn(
                "group flex items-center gap-4 p-5 rounded-2xl bg-card border border-white/[0.06]",
                "hover:bg-white/[0.03] transition-colors"
              )}
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

              <div className="flex items-center gap-3">
                {/* Edit/Delete — visible on hover (desktop) or always on mobile */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity sm:flex hidden">
                  <button
                    onClick={() => setEditingTx(tx)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingTx(tx)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile: always show */}
                <div className="flex items-center gap-1 sm:hidden">
                  <button
                    onClick={() => setEditingTx(tx)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingTx(tx)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right">
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
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editingTx && (
        <EditTransactionDialog
          transaction={editingTx}
          open={!!editingTx}
          onOpenChange={(open) => { if (!open) setEditingTx(null); }}
          onUpdated={() => {
            setEditingTx(null);
            fetchTransactions();
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingTx} onOpenChange={(open) => { if (!open) setDeletingTx(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTx?.merchant
                ? `Remove "${deletingTx.merchant}" (${formatCurrency(deletingTx.amount)}) from your history. This cannot be undone.`
                : `Remove this ${formatCurrency(deletingTx?.amount ?? 0)} transaction from your history. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
