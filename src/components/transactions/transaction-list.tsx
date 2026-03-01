"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction, UserCard, SpendingCategory } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { ImportCsvDialog } from "./import-csv-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Receipt, Plus, Sparkles, Pencil, Trash2, Download, Filter, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TransactionList({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filter state
  const [filterCard, setFilterCard] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");

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
      .limit(500);

    setTransactions(data ?? []);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Derive unique cards and categories from transactions for filter dropdowns
  const uniqueCards = useMemo(() => {
    const seen = new Map<string, UserCard>();
    transactions.forEach((tx) => {
      if (tx.user_card && !seen.has(tx.user_card.id)) {
        seen.set(tx.user_card.id, tx.user_card);
      }
    });
    return Array.from(seen.values());
  }, [transactions]);

  const uniqueCategories = useMemo(() => {
    const seen = new Map<string, SpendingCategory>();
    transactions.forEach((tx) => {
      if (tx.category && !seen.has(tx.category.id)) {
        seen.set(tx.category.id, tx.category);
      }
    });
    return Array.from(seen.values()).sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );
  }, [transactions]);

  // Apply filters
  const filtered = useMemo(() => {
    const search = filterSearch.toLowerCase().trim();
    return transactions.filter((tx) => {
      if (filterCard !== "all") {
        if (!tx.user_card || tx.user_card.id !== filterCard) return false;
      }
      if (filterCategory !== "all") {
        if (!tx.category || tx.category.id !== filterCategory) return false;
      }
      if (filterDateFrom && tx.transaction_date < filterDateFrom) return false;
      if (filterDateTo && tx.transaction_date > filterDateTo) return false;
      if (search && !tx.merchant?.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [transactions, filterCard, filterCategory, filterDateFrom, filterDateTo, filterSearch]);

  const hasActiveFilters =
    filterCard !== "all" ||
    filterCategory !== "all" ||
    filterDateFrom !== "" ||
    filterDateTo !== "" ||
    filterSearch !== "";

  function clearFilters() {
    setFilterCard("all");
    setFilterCategory("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterSearch("");
  }

  function exportCSV() {
    if (filtered.length === 0) return;

    const headers = ["Date", "Merchant", "Category", "Card", "Amount", "Rewards Earned"];
    const rows = filtered.map((tx) => [
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

  const totalRewards = filtered
    .filter((t) => !t.transaction_type || t.transaction_type === "expense")
    .reduce((sum, t) => sum + (t.rewards_earned ?? 0), 0);
  const totalSpent = filtered
    .filter((t) => !t.transaction_type || t.transaction_type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-base mt-2">
            {filtered.length}{hasActiveFilters && ` of ${transactions.length}`} transactions &middot;{" "}
            {formatCurrency(totalSpent)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          )}
          <ImportCsvDialog userId={userId} onImported={fetchTransactions}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
          </ImportCsvDialog>
          <AddTransactionDialog userId={userId} onTransactionAdded={fetchTransactions} />
        </div>
      </div>

      {/* Summary cards */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-card border border-white/[0.06] rounded-2xl p-6 sm:p-8">
            <p className="text-sm text-muted-foreground font-medium mb-3">Total Spent</p>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="bg-primary/[0.08] border border-primary/20 rounded-2xl p-6 sm:p-8">
            <p className="text-sm text-primary/80 font-medium mb-3">Rewards Earned</p>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <p className="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
                {totalRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="bg-card border border-white/[0.06] rounded-2xl p-6 sm:p-8">
            <p className="text-sm text-muted-foreground font-medium mb-3">Transactions</p>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight">{filtered.length}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {transactions.length > 0 && (
        <div className="bg-card border border-white/[0.06] rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
          <div className="mb-3">
            <Input
              placeholder="Search merchant..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Select value={filterCard} onValueChange={setFilterCard}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All cards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cards</SelectItem>
                {uniqueCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {getCardName(card)}
                    {card.last_four ? ` ··${card.last_four}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {uniqueCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-9 text-sm"
              placeholder="From"
              title="From date"
            />

            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-9 text-sm"
              placeholder="To"
              title="To date"
            />
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
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No results</h3>
          <p className="text-muted-foreground text-sm mb-4">
            No transactions match your filters.
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className={cn(
                "group flex items-center gap-4 p-5 rounded-2xl bg-card border border-border",
                "hover:bg-muted/30 transition-colors"
              )}
            >
              <div className="w-11 h-11 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0">
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
                  {tx.transaction_type && tx.transaction_type !== "expense" && (
                    <Badge
                      className={`text-xs capitalize ${
                        tx.transaction_type === "income"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          : tx.transaction_type === "refund"
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                          : "bg-muted text-muted-foreground border-white/[0.06]"
                      }`}
                    >
                      {tx.transaction_type === "refund" && tx.refund_status
                        ? `Refund · ${tx.refund_status}`
                        : tx.transaction_type}
                    </Badge>
                  )}
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
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
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
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
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
                  <p className={`font-semibold ${
                    tx.transaction_type === "income" ? "text-emerald-400" :
                    tx.transaction_type === "refund" ? "text-blue-400" : ""
                  }`}>
                    {tx.transaction_type === "income" || tx.transaction_type === "refund" ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </p>
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
