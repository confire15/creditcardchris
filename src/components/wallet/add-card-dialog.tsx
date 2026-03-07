"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardTemplate, SpendingCategory } from "@/lib/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Search, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { customCardSchema } from "@/lib/validations/forms";

const FLEXIBLE_CARDS = ["Citi Custom Cash", "US Bank Cash+", "Bank of America Customized Cash Rewards"];
const FLEX_CATEGORY_COUNT: Record<string, number> = {
  "US Bank Cash+": 2,
  "Citi Custom Cash": 1,
  "Bank of America Customized Cash Rewards": 1,
};

export function AddCardDialog({
  templates,
  categories,
  userId,
  onCardAdded,
  children,
}: {
  templates: CardTemplate[];
  categories: SpendingCategory[];
  userId: string;
  onCardAdded: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Custom card form state
  const [customName, setCustomName] = useState("");
  const [customIssuer, setCustomIssuer] = useState("");
  const [customNetwork, setCustomNetwork] = useState("Visa");
  const [customRewardType, setCustomRewardType] = useState("points");
  const [customRewardUnit, setCustomRewardUnit] = useState("Points");
  const [customBaseRate, setCustomBaseRate] = useState("1");
  const [customColor, setCustomColor] = useState("#6366f1");
  const [lastFour, setLastFour] = useState("");

  // Flexible card state
  const [pendingTemplate, setPendingTemplate] = useState<CardTemplate | null>(null);
  const [flexCategoryOptions, setFlexCategoryOptions] = useState<
    { categoryId: string; displayName: string }[]
  >([]);
  const [selectedFlexCategoryIds, setSelectedFlexCategoryIds] = useState<string[]>([]);
  const [pendingTemplateRewards, setPendingTemplateRewards] = useState<any[]>([]);

  const supabase = createClient();

  const filteredTemplates = templates.filter((t) => {
    if (!search.trim()) return true;
    // Build a searchable string with issuer aliases so "amex" matches "American Express" and vice versa
    const issuerAliases: Record<string, string> = {
      "american express": "amex",
      "amex": "american express",
      "chase": "chase",
      "capital one": "cap1",
      "bank of america": "boa bofa",
      "us bank": "usb",
    };
    const issuerLower = t.issuer.toLowerCase();
    const aliasExtra = Object.entries(issuerAliases).find(([k]) => issuerLower.includes(k))?.[1] ?? "";
    const searchable = `${t.name} ${t.issuer} ${aliasExtra}`.toLowerCase();
    // All tokens must appear somewhere in the searchable string
    return search.trim().toLowerCase().split(/\s+/).every((token) => searchable.includes(token));
  });

  async function handleTemplateClick(template: CardTemplate) {
    if (FLEXIBLE_CARDS.includes(template.name)) {
      // Fetch template rewards to show flex categories
      const { data: rewards } = await supabase
        .from("card_template_rewards")
        .select("*, category:spending_categories(*)")
        .eq("card_template_id", template.id);

      if (!rewards) return;

      // Find the max multiplier (flex categories)
      const maxMultiplier = Math.max(...rewards.map((r) => r.multiplier));
      const flexRewards = rewards.filter((r) => r.multiplier >= maxMultiplier);

      setPendingTemplate(template);
      setPendingTemplateRewards(rewards);
      setFlexCategoryOptions(
        flexRewards.map((r) => ({
          categoryId: r.category_id,
          displayName: r.category?.display_name ?? r.category_id,
        }))
      );
      setSelectedFlexCategoryIds([]);
    } else {
      await addFromTemplate(template);
    }
  }

  async function addFromTemplate(template: CardTemplate) {
    setLoading(true);
    try {
      // 1. Create user card
      const { data: userCard, error: cardError } = await supabase
        .from("user_cards")
        .insert({
          user_id: userId,
          card_template_id: template.id,
          last_four: lastFour || null,
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // 2. Copy template rewards to user card rewards
      const { data: templateRewards } = await supabase
        .from("card_template_rewards")
        .select("*")
        .eq("card_template_id", template.id);

      if (templateRewards && templateRewards.length > 0) {
        const { error: rewardsError } = await supabase
          .from("user_card_rewards")
          .insert(
            templateRewards.map((r) => ({
              user_card_id: userCard.id,
              category_id: r.category_id,
              multiplier: r.multiplier,
              cap_amount: r.cap_amount,
            }))
          );
        if (rewardsError) throw rewardsError;
      }

      toast.success(`${template.name} added to your wallet`);
      setOpen(false);
      setSearch("");
      setLastFour("");
      onCardAdded();
    } catch (err) {
      toast.error("Failed to add card");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function confirmFlexibleCard() {
    if (!pendingTemplate || selectedFlexCategoryIds.length === 0) return;

    setLoading(true);
    try {
      const { data: userCard, error: cardError } = await supabase
        .from("user_cards")
        .insert({
          user_id: userId,
          card_template_id: pendingTemplate.id,
          last_four: lastFour || null,
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Filter rewards: keep non-flex + only selected flex categories
      const maxMultiplier = Math.max(...pendingTemplateRewards.map((r) => r.multiplier));
      const rewardsToSave = pendingTemplateRewards.filter(
        (r) => r.multiplier < maxMultiplier || selectedFlexCategoryIds.includes(r.category_id)
      );

      if (rewardsToSave.length > 0) {
        await supabase.from("user_card_rewards").insert(
          rewardsToSave.map((r) => ({
            user_card_id: userCard.id,
            category_id: r.category_id,
            multiplier: r.multiplier,
            cap_amount: r.cap_amount,
          }))
        );
      }

      toast.success(`${pendingTemplate.name} added to your wallet`);
      setOpen(false);
      setSearch("");
      setLastFour("");
      setPendingTemplate(null);
      setFlexCategoryOptions([]);
      setSelectedFlexCategoryIds([]);
      setPendingTemplateRewards([]);
      onCardAdded();
    } catch (err) {
      toast.error("Failed to add card");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function addCustomCard(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = customCardSchema.safeParse({
        custom_name: customName,
        custom_issuer: customIssuer || undefined,
        custom_network: customNetwork,
        custom_reward_type: customRewardType,
        custom_reward_unit: customRewardUnit || undefined,
        custom_base_reward_rate: parseFloat(customBaseRate),
        custom_color: customColor,
        last_four: lastFour || null,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("user_cards").insert({
        user_id: userId,
        ...parsed.data,
      });

      if (error) throw error;

      toast.success(`${customName} added to your wallet`);
      setOpen(false);
      resetCustomForm();
      onCardAdded();
    } catch (err) {
      toast.error("Failed to add card");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function resetCustomForm() {
    setCustomName("");
    setCustomIssuer("");
    setCustomNetwork("Visa");
    setCustomRewardType("points");
    setCustomRewardUnit("Points");
    setCustomBaseRate("1");
    setCustomColor("#6366f1");
    setLastFour("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Credit Card</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="template" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="template" className="flex-1">Pick a Card</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Custom Card</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-5 mt-5">
            {pendingTemplate ? (
              // Flexible card category picker
              <div className="space-y-4">
                {(() => {
                  const flexCount = FLEX_CATEGORY_COUNT[pendingTemplate.name] ?? 1;
                  return (
                    <>
                      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/20">
                        <div
                          className="w-12 h-8 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: pendingTemplate.color ?? "#6366f1" }}
                        />
                        <div>
                          <p className="text-sm font-medium">{pendingTemplate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {flexCount > 1 ? `Pick ${flexCount} bonus categories` : "Pick your bonus category"}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {pendingTemplate.name === "Citi Custom Cash"
                          ? "This card earns 5% on your top eligible category automatically. Which one do you spend the most on?"
                          : pendingTemplate.name === "Bank of America Customized Cash Rewards"
                          ? "This card earns 3% on your choice of category. Which do you spend the most on?"
                          : pendingTemplate.name === "US Bank Cash+"
                          ? `This card earns 5% on 2 categories you choose each quarter. Pick your top ${flexCount}.`
                          : "This card earns 5% on categories you choose each quarter. Which is your top priority?"}
                      </p>

                      {flexCount > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedFlexCategoryIds.length}/{flexCount} selected
                        </p>
                      )}

                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {flexCategoryOptions.map((opt) => {
                          const isSelected = selectedFlexCategoryIds.includes(opt.categoryId);
                          const atMax = selectedFlexCategoryIds.length >= flexCount && !isSelected;
                          return (
                            <button
                              key={opt.categoryId}
                              onClick={() => {
                                if (flexCount === 1) {
                                  setSelectedFlexCategoryIds([opt.categoryId]);
                                } else {
                                  setSelectedFlexCategoryIds((prev) =>
                                    prev.includes(opt.categoryId)
                                      ? prev.filter((id) => id !== opt.categoryId)
                                      : prev.length < flexCount
                                      ? [...prev, opt.categoryId]
                                      : prev
                                  );
                                }
                              }}
                              disabled={atMax}
                              className={cn(
                                "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                                isSelected
                                  ? "border-primary/50 bg-primary/[0.08]"
                                  : atMax
                                  ? "border-border opacity-40 cursor-not-allowed"
                                  : "border-border hover:bg-muted/50"
                              )}
                              type="button"
                            >
                              <span className="text-sm font-medium flex-1">{opt.displayName}</span>
                              <div
                                className={cn(
                                  "w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0",
                                  flexCount > 1 ? "rounded" : "rounded-full",
                                  isSelected
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/40"
                                )}
                              >
                                {isSelected && (
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPendingTemplate(null);
                            setFlexCategoryOptions([]);
                            setSelectedFlexCategoryIds([]);
                            setPendingTemplateRewards([]);
                          }}
                          className="flex-1"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button
                          onClick={confirmFlexibleCard}
                          disabled={selectedFlexCategoryIds.length < flexCount || loading}
                          className="flex-1"
                        >
                          {loading ? "Adding..." : "Add Card"}
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              // Template list
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cards..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div key={search} className="space-y-2 max-h-80 overflow-y-auto animate-in fade-in duration-150">
                  {filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
                      type="button"
                    >
                      <div
                        className="w-12 h-8 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: template.color ?? "#6366f1" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.issuer} &middot; {template.network} &middot;{" "}
                          {template.base_reward_rate}x base &middot;{" "}
                          {template.annual_fee > 0 ? `$${template.annual_fee}/yr` : "No annual fee"}
                        </p>
                      </div>
                      <Check className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                  {filteredTemplates.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No cards found. Try a different search or add a custom card.
                    </p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-5">
            <form onSubmit={addCustomCard} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="cardName">Card Name</Label>
                <Input
                  id="cardName"
                  placeholder="e.g. My Travel Card"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="issuer">Issuer</Label>
                  <Input
                    id="issuer"
                    placeholder="e.g. Chase"
                    value={customIssuer}
                    onChange={(e) => setCustomIssuer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="network">Network</Label>
                  <Select value={customNetwork} onValueChange={setCustomNetwork}>
                    <SelectTrigger id="network">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Visa">Visa</SelectItem>
                      <SelectItem value="Mastercard">Mastercard</SelectItem>
                      <SelectItem value="Amex">Amex</SelectItem>
                      <SelectItem value="Discover">Discover</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="rewardType">Reward Type</Label>
                  <Select value={customRewardType} onValueChange={setCustomRewardType}>
                    <SelectTrigger id="rewardType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">Points</SelectItem>
                      <SelectItem value="miles">Miles</SelectItem>
                      <SelectItem value="cashback">Cash Back</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseRate">Base Reward Rate</Label>
                  <Input
                    id="baseRate"
                    type="number"
                    step="0.5"
                    min="0"
                    value={customBaseRate}
                    onChange={(e) => setCustomBaseRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="lastFour">Last 4 Digits (optional)</Label>
                  <Input
                    id="lastFour"
                    placeholder="1234"
                    maxLength={4}
                    value={lastFour}
                    onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Card Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      id="color"
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <span className="text-sm text-muted-foreground">{customColor}</span>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Custom Card"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
