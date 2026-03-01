"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateRewards, getCardName, getRewardUnit } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import type { UserCard, SpendingCategory } from "@/lib/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";

const TRANSACTION_TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "refund", label: "Refund" },
  { value: "transfer", label: "Transfer" },
] as const;

export function AddTransactionDialog({
  userId,
  onTransactionAdded,
  children,
}: {
  userId: string;
  onTransactionAdded: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);

  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [userCardId, setUserCardId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionType, setTransactionType] = useState<"expense" | "income" | "refund" | "transfer">("expense");
  const [refundStatus, setRefundStatus] = useState<"pending" | "received">("pending");

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [cardsRes, categoriesRes] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*), rewards:user_card_rewards(*)")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase.from("spending_categories").select("*").order("display_name"),
    ]);
    if (cardsRes.data) setUserCards(cardsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
  }, [userId, supabase]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const selectedCard = userCards.find((c) => c.id === userCardId);

  const rewardsPreview =
    selectedCard && categoryId && amount && parseFloat(amount) > 0
      ? calculateRewards(parseFloat(amount), selectedCard, categoryId)
      : null;

  function resetForm() {
    setAmount("");
    setMerchant("");
    setCategoryId("");
    setUserCardId("");
    setDate(new Date().toISOString().split("T")[0]);
    setTransactionType("expense");
    setRefundStatus("pending");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error("Please enter a valid amount");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("transactions").insert({
        user_id: userId,
        user_card_id: userCardId || null,
        category_id: categoryId,
        amount: parsedAmount,
        merchant: merchant || null,
        transaction_date: date,
        transaction_type: transactionType,
        refund_status: transactionType === "refund" ? refundStatus : null,
        rewards_earned: transactionType === "expense" ? (rewardsPreview ?? null) : null,
      });

      if (error) throw error;

      toast.success("Transaction added");

      // Check if this transaction pushes the category over budget
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && categoryId) {
        const thisMonth = new Date().toISOString().slice(0, 7);
        const [budgetRes, spentRes] = await Promise.all([
          supabase.from("spending_budgets").select("monthly_limit").eq("user_id", userId).eq("category_id", categoryId).single(),
          supabase.from("transactions").select("amount").eq("user_id", userId).eq("category_id", categoryId).gte("transaction_date", `${thisMonth}-01`),
        ]);
        if (budgetRes.data) {
          const limit = budgetRes.data.monthly_limit;
          const spent = (spentRes.data ?? []).reduce((s: number, t: { amount: number }) => s + t.amount, 0);
          if (spent > limit) {
            new Notification("Budget Alert — Credit Card Chris", {
              body: `You've exceeded your monthly budget for this category ($${spent.toFixed(0)} / $${limit.toFixed(0)}).`,
              icon: "/icon-192.png",
            });
          }
        }
      }

      resetForm();
      setOpen(false);
      onTransactionAdded();
    } catch (err) {
      toast.error("Failed to add transaction");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted/40 rounded-xl">
              {TRANSACTION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTransactionType(t.value)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    transactionType === t.value
                      ? "bg-card shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="amount"
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
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant (optional)</Label>
            <Input
              id="merchant"
              placeholder="e.g. Chipotle, United Airlines..."
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Card Used (optional)</Label>
            <Select value={userCardId} onValueChange={setUserCardId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a card..." />
              </SelectTrigger>
              <SelectContent>
                {userCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {getCardName(card)}{card.last_four ? ` ••${card.last_four}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {transactionType === "refund" && (
            <div className="space-y-2">
              <Label>Refund Status</Label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-xl">
                {(["pending", "received"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRefundStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      refundStatus === s
                        ? "bg-card shadow text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {transactionType === "expense" && rewardsPreview !== null && rewardsPreview > 0 && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm">
                You&apos;ll earn{" "}
                <span className="font-semibold text-primary">
                  {rewardsPreview.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
                  {selectedCard ? getRewardUnit(selectedCard) : "points"}
                </span>{" "}
                on this {formatCurrency(parseFloat(amount))} purchase
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || !categoryId || !amount}>
            {loading ? "Adding..." : "Add Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
