"use client";

import { useEffect, useState } from "react";
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
import { CreditCardVisual } from "./credit-card-visual";
import { NicknameEditor } from "./nickname-editor";
import { FeeRenewalPicker } from "./fee-renewal-picker";
import { CardPerksPanel } from "./card-perks-panel";
import { Trash2, Save, Check, X, Scale, Bell } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const FLEXIBLE_CARDS = ["Citi Custom Cash", "US Bank Cash+", "Bank of America Customized Cash Rewards"];
const FLEX_CATEGORY_COUNT: Record<string, number> = {
  "US Bank Cash+": 2,
  "Citi Custom Cash": 1,
  "Bank of America Customized Cash Rewards": 1,
};
const FLEX_DEFAULT_MULTIPLIER: Record<string, number> = {
  "Citi Custom Cash": 5,
  "US Bank Cash+": 5,
  "Bank of America Customized Cash Rewards": 3,
};
const FLEX_ELIGIBLE_CATEGORY_NAMES: Record<string, string[]> = {
  "Citi Custom Cash": ["dining", "gas", "groceries", "online_shopping", "streaming", "home_improvement", "drugstores", "entertainment"],
  "US Bank Cash+": ["fast_food", "streaming", "home_improvement", "transit", "entertainment", "online_shopping", "gym_fitness", "utilities"],
  "Bank of America Customized Cash Rewards": ["dining", "gas", "online_shopping", "travel", "drugstores", "home_improvement"],
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

type Tab = "info" | "rewards" | "perks";

export function CardDetailSheet({
  userId,
  card,
  categories,
  open,
  onOpenChange,
  onCardUpdated,
}: {
  userId: string;
  card: UserCard | null;
  categories: SpendingCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardUpdated: () => void;
}) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [editingRewards, setEditingRewards] = useState(false);
  const [rewardEdits, setRewardEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [changingFlexCategory, setChangingFlexCategory] = useState(false);
  const [selectedFlexCategoryIds, setSelectedFlexCategoryIds] = useState<string[]>([]);
  const [changingEverydayCategory, setChangingEverydayCategory] = useState(false);
  const [selectedEverydayCategoryId, setSelectedEverydayCategoryId] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState(false);
  const [feeValue, setFeeValue] = useState("");
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      });
    }
  }, []);

  // Reset tab + editing state when card changes
  useEffect(() => {
    setActiveTab("info");
    setEditingRewards(false);
    setChangingFlexCategory(false);
    setChangingEverydayCategory(false);
  }, [card?.id]);

  if (!card) return null;

  const rewardUnit = getRewardUnit(card);
  const cardTemplateName = card.card_template?.name ?? "";
  const isFlexible = FLEXIBLE_CARDS.includes(cardTemplateName);
  const currentRewards = card.rewards ?? [];
  const defaultFlexMultiplier = FLEX_DEFAULT_MULTIPLIER[cardTemplateName] ?? 5;
  const maxMultiplier = currentRewards.length > 0
    ? Math.max(...currentRewards.map((r) => r.multiplier))
    : defaultFlexMultiplier;
  const currentFlexRewards = isFlexible && maxMultiplier > 1
    ? currentRewards.filter((r) => r.multiplier === maxMultiplier)
    : [];
  const currentFlexCategories = currentFlexRewards
    .map((r) => categories.find((c) => c.id === r.category_id))
    .filter(Boolean) as SpendingCategory[];
  const flexCount = FLEX_CATEGORY_COUNT[cardTemplateName] ?? 1;
  const cardLabels = CARD_CATEGORY_LABELS[cardTemplateName] ?? {};
  const catLabel = (cat: SpendingCategory) => cardLabels[cat.name] ?? cat.display_name;
  const eligibleCategoryNames = FLEX_ELIGIBLE_CATEGORY_NAMES[cardTemplateName] ?? [];
  const flexPickerCategories = eligibleCategoryNames.length > 0
    ? categories.filter((c) => eligibleCategoryNames.includes(c.name))
    : categories.filter((cat) => currentRewards.some((r) => r.category_id === cat.id && r.multiplier === maxMultiplier));
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
    } catch {
      toast.error("Failed to update everyday category");
    } finally {
      setLoading(false);
    }
  }

  async function saveFlexCategory() {
    if (!card || selectedFlexCategoryIds.length === 0) return;
    setLoading(true);
    try {
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
          multiplier: defaultFlexMultiplier,
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
    } catch {
      toast.error("Failed to update bonus categories");
    } finally {
      setLoading(false);
    }
  }

  function startEditing() {
    const edits: Record<string, string> = {};
    categories.forEach((cat) => {
      const reward = card!.rewards?.find((r) => r.category_id === cat.id);
      if (reward) edits[cat.id] = String(reward.multiplier);
    });
    setRewardEdits(edits);
    setEditingRewards(true);
  }

  async function saveRewards() {
    if (!card) return;
    setLoading(true);
    try {
      await supabase.from("user_card_rewards").delete().eq("user_card_id", card.id);
      const newRewards = Object.entries(rewardEdits)
        .filter(([, val]) => val && parseFloat(val) > 0)
        .map(([categoryId, multiplier]) => ({
          user_card_id: card.id,
          category_id: categoryId,
          multiplier: parseFloat(multiplier),
        }));
      if (newRewards.length > 0) {
        const { error } = await supabase.from("user_card_rewards").insert(newRewards);
        if (error) throw error;
      }
      toast.success("Reward rates updated");
      setEditingRewards(false);
      onCardUpdated();
    } catch {
      toast.error("Failed to update rewards");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCard() {
    if (!card) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("user_cards").delete().eq("id", card.id);
      if (error) throw error;
      toast.success(`${getCardName(card)} removed`);
      onOpenChange(false);
      onCardUpdated();
    } catch {
      toast.error("Failed to delete card");
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "Info" },
    { id: "rewards", label: "Rewards" },
    { id: "perks", label: "Perks" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{getCardName(card)}</SheetTitle>
        </SheetHeader>

        <motion.div
          key={card.id}
          className="mt-6 px-6 pb-10 space-y-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {/* Card visual */}
          <motion.div
            className="max-w-[320px]"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <CreditCardVisual card={card} />
          </motion.div>

          {/* Tab bar */}
          <motion.div
            className="flex rounded-xl border border-overlay-subtle bg-muted/30 p-1 gap-1"
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 h-9 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* Tab content */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            >
              {activeTab === "info" && (
                <div className="space-y-5">
                  {/* Nickname */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Nickname</p>
                    <NicknameEditor card={card} onUpdated={onCardUpdated} />
                  </div>

                  {/* Card details grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Issuer</p>
                      <p className="font-medium">{getCardIssuer(card) || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Reward Type</p>
                      <p className="font-medium capitalize">
                        {card.card_template?.reward_type ?? card.custom_reward_type ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Base Rate</p>
                      <p className="font-medium">
                        {card.card_template?.base_reward_rate ?? card.custom_base_reward_rate ?? 1}x {rewardUnit}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground font-medium">Annual Fee</p>
                        <button
                          onClick={() => {
                            setFeeValue(String(card.custom_annual_fee ?? card.card_template?.annual_fee ?? ""));
                            setEditingFee(true);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          {card.custom_annual_fee != null ? "Edit" : "Override"}
                        </button>
                      </div>
                      {editingFee ? (
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                              autoFocus
                              type="number"
                              min="0"
                              value={feeValue}
                              onChange={(e) => setFeeValue(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  const val = feeValue === "" ? null : parseFloat(feeValue);
                                  const { error } = await supabase.from("user_cards").update({ custom_annual_fee: val }).eq("id", card.id);
                                  if (error) toast.error("Failed to save fee");
                                  else { toast.success("Annual fee updated"); onCardUpdated(); }
                                  setEditingFee(false);
                                }
                                if (e.key === "Escape") setEditingFee(false);
                              }}
                              className="pl-6 h-9 text-sm"
                            />
                          </div>
                          <Button size="sm" className="h-9 text-xs px-3" onClick={async () => {
                            const val = feeValue === "" ? null : parseFloat(feeValue);
                            const { error } = await supabase.from("user_cards").update({ custom_annual_fee: val }).eq("id", card.id);
                            if (error) toast.error("Failed to save fee");
                            else { toast.success("Annual fee updated"); onCardUpdated(); }
                            setEditingFee(false);
                          }}>Save</Button>
                          <button onClick={() => setEditingFee(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <p className="font-medium text-sm">
                          {card.custom_annual_fee != null
                            ? <>${fmt(card.custom_annual_fee)} <span className="text-xs text-muted-foreground font-normal">(custom)</span></>
                            : card.card_template
                            ? card.card_template.annual_fee > 0 ? `$${fmt(card.card_template.annual_fee)}` : "None"
                            : "—"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fee renewal date */}
                  <FeeRenewalPicker card={card} onUpdated={onCardUpdated} />

                  {/* Push prompt */}
                  {showPushPrompt && (
                    <div className="rounded-xl bg-primary/[0.06] border border-primary/20 px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bell className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">Get a reminder 30 days before this renews?</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setShowPushPrompt(false)} className="text-xs text-muted-foreground hover:text-foreground">No</button>
                        <a href="/settings" className="text-xs font-semibold text-primary hover:text-primary/80">Enable →</a>
                      </div>
                    </div>
                  )}

                  {/* Points expiration */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Points Expiration Date</p>
                    <input
                      key={card.id + "-exp"}
                      type="date"
                      defaultValue={card.points_expiration_date ?? ""}
                      onChange={async (e) => {
                        const val = e.target.value || null;
                        const { error } = await supabase.from("user_cards").update({ points_expiration_date: val }).eq("id", card.id);
                        if (error) toast.error("Failed to save date");
                        else toast.success("Points expiration date saved");
                        onCardUpdated();
                      }}
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">You'll be notified 60 days before expiration</p>
                  </div>

                  {/* Keep or Cancel */}
                  {(card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0) > 0 && (
                    <Link href="/keep-or-cancel" onClick={() => onOpenChange(false)}>
                      <Button variant="outline" className="w-full h-11">
                        <Scale className="w-4 h-4 mr-2" />
                        Keep or Cancel?
                      </Button>
                    </Link>
                  )}

                  {/* Delete */}
                  <Button
                    variant="destructive"
                    className="w-full h-11"
                    onClick={deleteCard}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Card
                  </Button>
                </div>
              )}

              {activeTab === "rewards" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
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
                    <div className="p-4 rounded-xl bg-primary/[0.06] border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                          {flexCount > 1 ? "Bonus Categories" : "Bonus Category"}
                        </p>
                        {!changingFlexCategory ? (
                          <button
                            onClick={() => {
                              setChangingFlexCategory(true);
                              const currentIds = currentFlexRewards.map((r) => r.category_id);
                              setSelectedFlexCategoryIds(currentIds.length <= flexCount ? currentIds : currentIds.slice(0, flexCount));
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Change
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => { setChangingFlexCategory(false); setSelectedFlexCategoryIds([]); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                            <Button size="sm" className="h-7 text-xs px-2.5" onClick={saveFlexCategory} disabled={selectedFlexCategoryIds.length !== flexCount || loading}>
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
                          {flexPickerCategories.map((cat) => {
                            const isSelected = selectedFlexCategoryIds.includes(cat.id);
                            const atMax = flexCount > 1 && selectedFlexCategoryIds.length >= flexCount && !isSelected;
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
                                        : prev.length < flexCount ? [...prev, cat.id] : prev
                                    );
                                  }
                                }}
                                disabled={atMax}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-all",
                                  isSelected ? "border-primary/50 bg-primary/[0.08]"
                                    : atMax ? "border-border opacity-40 cursor-not-allowed"
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

                  {/* Everyday 2% category picker */}
                  {isFlexible && has2PctFlex && !editingRewards && (
                    <div className="p-4 rounded-xl bg-muted/40 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Everyday Category</p>
                        {!changingEverydayCategory ? (
                          <button onClick={() => { setChangingEverydayCategory(true); setChangingFlexCategory(false); setSelectedEverydayCategoryId(everydayCategory?.id ?? null); }} className="text-xs text-primary hover:underline">Change</button>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => { setChangingEverydayCategory(false); setSelectedEverydayCategoryId(null); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                            <Button size="sm" className="h-7 text-xs px-2.5" onClick={saveEverydayCategory} disabled={!selectedEverydayCategoryId || loading}>
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
                                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-all",
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

                  {/* Category list */}
                  <div className="space-y-2">
                    {categories
                      .filter((cat) => cat.name !== "other")
                      .filter((cat) => !has2PctFlex || !everyday2pctCatIds.includes(cat.id) || cat.id === everydayCategory?.id)
                      .slice()
                      .sort((a, b) => {
                        const ma = card.rewards?.find((r) => r.category_id === a.id)?.multiplier ?? 0;
                        const mb = card.rewards?.find((r) => r.category_id === b.id)?.multiplier ?? 0;
                        return mb - ma;
                      })
                      .map((cat) => {
                        const reward = card.rewards?.find((r) => r.category_id === cat.id);
                        const multiplier = reward?.multiplier;

                        if (editingRewards) {
                          return (
                            <div key={cat.id} className="flex items-center gap-3">
                              <span className="text-sm flex-1">{cat.display_name}</span>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  className="w-20 h-9 text-sm"
                                  value={rewardEdits[cat.id] ?? ""}
                                  onChange={(e) => setRewardEdits((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                                  placeholder="0"
                                />
                                <span className="text-xs text-muted-foreground">x</span>
                              </div>
                            </div>
                          );
                        }

                        if (!multiplier) return null;

                        return (
                          <div key={cat.id} className="flex items-center justify-between py-1">
                            <span className="text-sm">{cat.display_name}</span>
                            <Badge variant="secondary">{multiplier}x {rewardUnit}</Badge>
                          </div>
                        );
                      })}

                    {!editingRewards && (!card.rewards || card.rewards.length === 0) && (
                      <p className="text-sm text-muted-foreground">
                        No bonus categories set. Tap "Edit Rates" to add some.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "perks" && (
                <CardPerksPanel
                  userId={userId}
                  card={card}
                  onUpdated={onCardUpdated}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
