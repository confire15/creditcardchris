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
import { Trash2, Save, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FLEXIBLE_CARDS = ["Citi Custom Cash", "US Bank Cash+", "Bank of America Customized Cash Rewards"];
const FLEX_CATEGORY_COUNT: Record<string, number> = {
  "US Bank Cash+": 2,
  "Citi Custom Cash": 1,
  "Bank of America Customized Cash Rewards": 1,
};
const FLEX_2PCT_OPTIONS: Record<string, string[]> = {
  "US Bank Cash+": ["dining", "groceries", "gas"],
};
const CARD_CATEGORY_LABELS: Record<string, Record<string, string>> = {
  "US Bank Cash+": {
    fast_food: "Fast Food",
    streaming: "TV, Internet & Streaming Services",
    home_improvement: "Home Utilities",
    transit: "Ground Transportation",
    entertainment: "Gyms/Fitness Centers & Movie Theaters",
    online_shopping: "Electronics, Dept. & Clothing Stores",
    groceries: "Grocery Stores & Grocery Delivery",
    gas: "Gas Stations & EV Charging Stations",
    dining: "Restaurants",
  },
};

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
  const [changingFlexCategory, setChangingFlexCategory] = useState(false);
  const [selectedFlexCategoryIds, setSelectedFlexCategoryIds] = useState<string[]>([]);
  const [changingEverydayCategory, setChangingEverydayCategory] = useState(false);
  const [selectedEverydayCategoryId, setSelectedEverydayCategoryId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState(card?.nickname ?? "");

  if (!card) return null;

  async function saveNickname() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_cards")
        .update({ nickname: nicknameValue.trim() || null })
        .eq("id", card!.id);
      if (error) throw error;
      toast.success("Nickname saved");
      setEditingNickname(false);
      onCardUpdated();
    } catch (err) {
      toast.error("Failed to save nickname");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const rewardUnit = getRewardUnit(card);
  const isFlexible = FLEXIBLE_CARDS.includes(card.card_template?.name ?? "");

  // For flexible cards: find the current max-rate categories
  const currentRewards = card.rewards ?? [];
  const maxMultiplier = currentRewards.length > 0
    ? Math.max(...currentRewards.map((r) => r.multiplier))
    : 0;
  const currentFlexRewards = isFlexible && maxMultiplier > 1
    ? currentRewards.filter((r) => r.multiplier === maxMultiplier)
    : [];
  const currentFlexCategories = currentFlexRewards
    .map((r) => categories.find((c) => c.id === r.category_id))
    .filter(Boolean) as SpendingCategory[];
  const flexCount = FLEX_CATEGORY_COUNT[card.card_template?.name ?? ""] ?? 1;
  const cardLabels = CARD_CATEGORY_LABELS[card.card_template?.name ?? ""] ?? {};
  const catLabel = (cat: SpendingCategory) => cardLabels[cat.name] ?? cat.display_name;

  // Everyday 2% category (US Bank Cash+)
  const has2PctFlex = !!FLEX_2PCT_OPTIONS[card.card_template?.name ?? ""];
  const everyday2pctCategoryOptions = (FLEX_2PCT_OPTIONS[card.card_template?.name ?? ""] ?? [])
    .map((name) => categories.find((c) => c.name === name))
    .filter(Boolean) as SpendingCategory[];
  const everyday2pctCatIds = everyday2pctCategoryOptions.map((c) => c.id);
  const everydayReward = currentRewards.find((r) => everyday2pctCatIds.includes(r.category_id));
  const everydayCategory = everydayReward ? categories.find((c) => c.id === everydayReward.category_id) ?? null : null;

  async function saveEverydayCategory() {
    if (!card || !selectedEverydayCategoryId) return;
    setLoading(true);
    try {
      // Remove all current 2% everyday entries for this card
      if (everyday2pctCatIds.length > 0) {
        await supabase.from("user_card_rewards").delete().eq("user_card_id", card.id).in("category_id", everyday2pctCatIds);
      }
      await supabase.from("user_card_rewards").insert({
        user_card_id: card.id,
        category_id: selectedEverydayCategoryId,
        multiplier: 2.0,
        cap_amount: null,
      });
      toast.success("Everyday category updated");
      setChangingEverydayCategory(false);
      setSelectedEverydayCategoryId(null);
      onCardUpdated();
    } catch (err) {
      toast.error("Failed to update everyday category");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveFlexCategory() {
    if (!card || selectedFlexCategoryIds.length === 0) return;
    setLoading(true);
    try {
      // Remove old flex rewards (at max multiplier), keep non-flex ones
      // For flex-2% cards, deduplicate everyday options — only keep the selected one
      const nonFlexRewards = currentRewards
        .filter((r) => r.multiplier < maxMultiplier)
        .filter((r) => !has2PctFlex || !everyday2pctCatIds.includes(r.category_id) || r.category_id === everydayCategory?.id);

      await supabase.from("user_card_rewards").delete().eq("user_card_id", card.id);

      const toInsert = [
        ...nonFlexRewards.map((r) => ({
          user_card_id: card.id,
          category_id: r.category_id,
          multiplier: r.multiplier,
          cap_amount: r.cap_amount,
        })),
        ...selectedFlexCategoryIds.map((catId) => ({
          user_card_id: card.id,
          category_id: catId,
          multiplier: maxMultiplier,
          cap_amount: null,
        })),
      ];

      if (toInsert.length > 0) {
        const { error } = await supabase.from("user_card_rewards").insert(toInsert);
        if (error) throw error;
      }

      toast.success("Bonus categories updated");
      setChangingFlexCategory(false);
      setSelectedFlexCategoryIds([]);
      onCardUpdated();
    } catch (err) {
      toast.error("Failed to update bonus categories");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

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

        <div className="mt-8 space-y-8 px-6 pb-8">
          <div className="max-w-[320px]">
            <CreditCardVisual card={card} />
          </div>

          {/* Nickname */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground font-medium">Nickname</p>
              {!editingNickname ? (
                <button
                  onClick={() => { setNicknameValue(card.nickname ?? ""); setEditingNickname(true); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingNickname(false)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                  <Button size="sm" className="h-6 text-xs px-2" onClick={saveNickname} disabled={loading}>
                    {loading ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
            {editingNickname ? (
              <Input
                autoFocus
                value={nicknameValue}
                onChange={(e) => setNicknameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveNickname(); if (e.key === "Escape") setEditingNickname(false); }}
                placeholder={card.card_template?.name ?? card.custom_name ?? "e.g. Chase Sapphire"}
                className="h-9 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">
                {card.nickname || <span className="text-muted-foreground italic">No nickname set</span>}
              </p>
            )}
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
            <div className="col-span-2 space-y-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Points Expiration</p>
                <input
                  type="date"
                  defaultValue={card.points_expiration_date ?? ""}
                  onBlur={async (e) => {
                    const val = e.target.value || null;
                    const { error } = await supabase
                      .from("user_cards")
                      .update({ points_expiration_date: val })
                      .eq("id", card.id);
                    if (error) toast.error("Failed to save date");
                    else toast.success("Points expiration date saved");
                    onCardUpdated();
                  }}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You&apos;ll be notified 60 days before expiration
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Annual Fee Due Date</p>
                <input
                  type="date"
                  defaultValue={card.annual_fee_date ?? ""}
                  onBlur={async (e) => {
                    const val = e.target.value || null;
                    const { error } = await supabase
                      .from("user_cards")
                      .update({ annual_fee_date: val })
                      .eq("id", card.id);
                    if (error) toast.error("Failed to save date");
                    else toast.success("Annual fee date saved");
                    onCardUpdated();
                  }}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You&apos;ll be notified 30 days before your annual fee is due
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Bonus Categories</h3>
              {!editingRewards && !changingFlexCategory && !changingEverydayCategory && (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  Edit Rates
                </Button>
              )}
              {editingRewards && (
                <Button size="sm" onClick={saveRewards} disabled={loading}>
                  <Save className="w-4 h-4 mr-1" />
                  {loading ? "Saving..." : "Save"}
                </Button>
              )}
            </div>

            {/* Flexible card bonus category picker */}
            {isFlexible && !editingRewards && (
              <div className="mb-4 p-4 rounded-xl bg-primary/[0.06] border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                    {flexCount > 1 ? "Bonus Categories" : "Bonus Category"}
                  </p>
                  {!changingFlexCategory ? (
                    <button
                      onClick={() => {
                        setChangingFlexCategory(true);
                        setSelectedFlexCategoryIds(currentFlexRewards.map((r) => r.category_id));
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Change
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setChangingFlexCategory(false); setSelectedFlexCategoryIds([]); }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <Button size="sm" className="h-6 text-xs px-2" onClick={saveFlexCategory} disabled={selectedFlexCategoryIds.length < flexCount || loading}>
                        {loading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                {!changingFlexCategory ? (
                  <p className="text-sm font-medium">
                    {currentFlexCategories.length > 0
                      ? currentFlexCategories.map((c) => catLabel(c)).join(", ")
                      : "Not set"}
                    {maxMultiplier > 1 && currentFlexCategories.length > 0 && (
                      <span className="text-muted-foreground font-normal"> · {maxMultiplier}x {rewardUnit}</span>
                    )}
                  </p>
                ) : (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs text-muted-foreground">
                      {flexCount > 1
                        ? `Select ${flexCount} bonus categories (${selectedFlexCategoryIds.length}/${flexCount}):`
                        : "Select your primary bonus category:"}
                    </p>
                    {categories
                      .filter((cat) => currentRewards.some((r) => r.category_id === cat.id))
                      .map((cat) => {
                        const reward = currentRewards.find((r) => r.category_id === cat.id);
                        if (!reward || reward.multiplier < maxMultiplier) return null;
                        const isSelected = selectedFlexCategoryIds.includes(cat.id);
                        const atMax = selectedFlexCategoryIds.length >= flexCount && !isSelected;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              if (flexCount === 1) {
                                setSelectedFlexCategoryIds([cat.id]);
                              } else {
                                setSelectedFlexCategoryIds((prev) =>
                                  prev.includes(cat.id)
                                    ? prev.filter((id) => id !== cat.id)
                                    : prev.length < flexCount
                                    ? [...prev, cat.id]
                                    : prev
                                );
                              }
                            }}
                            disabled={atMax}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-sm transition-all",
                              isSelected
                                ? "border-primary/50 bg-primary/[0.08]"
                                : atMax
                                ? "border-border opacity-40 cursor-not-allowed"
                                : "border-border hover:bg-muted/50"
                            )}
                            type="button"
                          >
                            <span className="flex-1">{catLabel(cat)}</span>
                            <div className={cn(
                              "w-4 h-4 border-2 flex items-center justify-center flex-shrink-0",
                              flexCount > 1 ? "rounded" : "rounded-full",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                            )}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Everyday 2% category picker (e.g. US Bank Cash+) */}
            {isFlexible && has2PctFlex && !editingRewards && (
              <div className="mb-4 p-4 rounded-xl bg-muted/[0.4] border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Everyday Category</p>
                  {!changingEverydayCategory ? (
                    <button
                      onClick={() => {
                        setChangingEverydayCategory(true);
                        setChangingFlexCategory(false);
                        setSelectedEverydayCategoryId(everydayCategory?.id ?? null);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Change
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setChangingEverydayCategory(false); setSelectedEverydayCategoryId(null); }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <Button size="sm" className="h-6 text-xs px-2" onClick={saveEverydayCategory} disabled={!selectedEverydayCategoryId || loading}>
                        {loading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
                {!changingEverydayCategory ? (
                  <p className="text-sm font-medium">
                    {everydayCategory ? catLabel(everydayCategory) : "Not set"}
                    <span className="text-muted-foreground font-normal"> · 2x {rewardUnit}</span>
                  </p>
                ) : (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs text-muted-foreground">Select your everyday 2% category:</p>
                    {everyday2pctCategoryOptions.map((cat) => {
                      const isSelected = selectedEverydayCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedEverydayCategoryId(cat.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-sm transition-all",
                            isSelected ? "border-primary/50 bg-primary/[0.08]" : "border-border hover:bg-muted/50"
                          )}
                          type="button"
                        >
                          <span className="flex-1">{catLabel(cat)}</span>
                          <div className={cn("w-4 h-4 border-2 rounded-full flex items-center justify-center flex-shrink-0", isSelected ? "bg-primary border-primary" : "border-muted-foreground/40")}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {categories
                .filter((cat) => cat.name !== "other")
                // For flex 2% cards, hide unselected everyday options — shown in the section above
                .filter((cat) => !has2PctFlex || !everyday2pctCatIds.includes(cat.id) || cat.id === everydayCategory?.id)
                .slice()
                .sort((a, b) => {
                  const ma = card.rewards?.find((r) => r.category_id === a.id)?.multiplier ?? 0;
                  const mb = card.rewards?.find((r) => r.category_id === b.id)?.multiplier ?? 0;
                  return mb - ma;
                })
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
