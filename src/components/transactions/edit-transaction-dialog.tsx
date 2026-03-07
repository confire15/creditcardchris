"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateRewards, getCardName, getRewardUnit } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import type { Transaction, UserCard, SpendingCategory } from "@/lib/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { transactionSchema } from "@/lib/validations/forms";

const TRANSACTION_TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "refund", label: "Refund" },
  { value: "transfer", label: "Transfer" },
] as const;

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onUpdated,
}: {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);

  const [amount, setAmount] = useState(String(transaction.amount));
  const [merchant, setMerchant] = useState(transaction.merchant ?? "");
  const [categoryId, setCategoryId] = useState(transaction.category_id);
  const [userCardId, setUserCardId] = useState(transaction.user_card_id ?? "");
  const [date, setDate] = useState(transaction.transaction_date);
  const [transactionType, setTransactionType] = useState<"expense" | "income" | "refund" | "transfer">(
    transaction.transaction_type ?? "expense"
  );
  const [refundStatus, setRefundStatus] = useState<"pending" | "received">(
    transaction.refund_status ?? "pending"
  );

  // Reset form when transaction changes
  useEffect(() => {
    setAmount(String(transaction.amount));
    setMerchant(transaction.merchant ?? "");
    setCategoryId(transaction.category_id);
    setUserCardId(transaction.user_card_id ?? "");
    setDate(transaction.transaction_date);
    setTransactionType(transaction.transaction_type ?? "expense");
    setRefundStatus(transaction.refund_status ?? "pending");
  }, [transaction]);

  const fetchData = useCallback(async () => {
    const [cardsRes, categoriesRes] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*), rewards:user_card_rewards(*)")
        .eq("user_id", transaction.user_id)
        .eq("is_active", true),
      supabase.from("spending_categories").select("*").order("display_name"),
    ]);
    if (cardsRes.data) setUserCards(cardsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
  }, [transaction.user_id, supabase]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const selectedCard = userCards.find((c) => c.id === userCardId);
  const rewardsPreview =
    selectedCard && categoryId && amount && parseFloat(amount) > 0
      ? calculateRewards(parseFloat(amount), selectedCard, categoryId)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = transactionSchema.safeParse({
        user_card_id: userCardId || null,
        category_id: categoryId,
        amount: parseFloat(amount),
        merchant: merchant || null,
        transaction_date: date,
        transaction_type: transactionType,
        refund_status: transactionType === "refund" ? refundStatus : null,
        rewards_earned: transactionType === "expense" ? (rewardsPreview ?? null) : null,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("transactions")
        .update(parsed.data)
        .eq("id", transaction.id);

      if (error) throw error;

      toast.success("Transaction updated");
      onOpenChange(false);
      onUpdated();
    } catch (err) {
      toast.error("Failed to update transaction");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
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
              <Label htmlFor="edit-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="edit-amount"
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
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-merchant">Merchant (optional)</Label>
            <Input
              id="edit-merchant"
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
                <SelectItem value="none">No card</SelectItem>
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

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !categoryId || !amount}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
