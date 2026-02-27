"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, SpendingCategory } from "@/lib/types/database";
import { getCardName, getCardIssuer, getRewardUnit } from "@/lib/utils/rewards";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCardVisual } from "./credit-card-visual";
import { Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export function CardDetailSheet({
  card,
  categories,
  open,
  onOpenChange,
  onCardUpdated,
}: {
  card: UserCard | null;
  categories: SpendingCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardUpdated: () => void;
}) {
  const supabase = createClient();
  const [editingRewards, setEditingRewards] = useState(false);
  const [rewardEdits, setRewardEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!card) return null;

  const rewardUnit = getRewardUnit(card);

  function startEditing() {
    const edits: Record<string, string> = {};
    categories.forEach((cat) => {
      const reward = card!.rewards?.find((r) => r.category_id === cat.id);
      if (reward) {
        edits[cat.id] = String(reward.multiplier);
      }
    });
    setRewardEdits(edits);
    setEditingRewards(true);
  }

  async function saveRewards() {
    if (!card) return;
    setLoading(true);
    try {
      // Delete existing user card rewards
      await supabase
        .from("user_card_rewards")
        .delete()
        .eq("user_card_id", card.id);

      // Insert new rewards (only non-empty ones)
      const newRewards = Object.entries(rewardEdits)
        .filter(([, val]) => val && parseFloat(val) > 0)
        .map(([categoryId, multiplier]) => ({
          user_card_id: card.id,
          category_id: categoryId,
          multiplier: parseFloat(multiplier),
        }));

      if (newRewards.length > 0) {
        const { error } = await supabase
          .from("user_card_rewards")
          .insert(newRewards);
        if (error) throw error;
      }

      toast.success("Reward rates updated");
      setEditingRewards(false);
      onCardUpdated();
    } catch (err) {
      toast.error("Failed to update rewards");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCard() {
    if (!card) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_cards")
        .delete()
        .eq("id", card.id);
      if (error) throw error;

      toast.success(`${getCardName(card)} removed`);
      onOpenChange(false);
      onCardUpdated();
    } catch (err) {
      toast.error("Failed to delete card");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{getCardName(card)}</SheetTitle>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          <div className="max-w-[320px]">
            <CreditCardVisual card={card} />
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Issuer</p>
              <p className="font-medium">{getCardIssuer(card) || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Reward Type</p>
              <p className="font-medium capitalize">
                {card.card_template?.reward_type ?? card.custom_reward_type ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Base Rate</p>
              <p className="font-medium">
                {card.card_template?.base_reward_rate ?? card.custom_base_reward_rate ?? 1}x{" "}
                {rewardUnit}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Annual Fee</p>
              <p className="font-medium">
                {card.card_template
                  ? card.card_template.annual_fee > 0
                    ? `$${card.card_template.annual_fee}`
                    : "None"
                  : "—"}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Bonus Categories</h3>
              {!editingRewards ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  Edit Rates
                </Button>
              ) : (
                <Button size="sm" onClick={saveRewards} disabled={loading}>
                  <Save className="w-4 h-4 mr-1" />
                  {loading ? "Saving..." : "Save"}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {categories
                .filter((cat) => cat.name !== "other")
                .map((cat) => {
                  const reward = card.rewards?.find(
                    (r) => r.category_id === cat.id
                  );
                  const multiplier = reward?.multiplier;

                  if (editingRewards) {
                    return (
                      <div key={cat.id} className="flex items-center gap-3">
                        <span className="text-sm flex-1">{cat.display_name}</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            className="w-20 h-8 text-sm"
                            value={rewardEdits[cat.id] ?? ""}
                            onChange={(e) =>
                              setRewardEdits((prev) => ({
                                ...prev,
                                [cat.id]: e.target.value,
                              }))
                            }
                            placeholder="0"
                          />
                          <span className="text-xs text-muted-foreground">x</span>
                        </div>
                      </div>
                    );
                  }

                  if (!multiplier) return null;

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{cat.display_name}</span>
                      <Badge variant="secondary">{multiplier}x {rewardUnit}</Badge>
                    </div>
                  );
                })}

              {!editingRewards && (!card.rewards || card.rewards.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No bonus categories set. Click &quot;Edit Rates&quot; to add some.
                </p>
              )}
            </div>
          </div>

          <Separator />

          <Button
            variant="destructive"
            className="w-full"
            onClick={deleteCard}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Card
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
