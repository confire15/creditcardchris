"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardTemplate, SpendingCategory } from "@/lib/types/database";
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
import { Plus, Search, Check, ArrowLeft, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { customCardSchema } from "@/lib/validations/forms";
import { motion, AnimatePresence } from "motion/react";
import { goPremium } from "@/lib/utils/upgrade";
import { FREE_WALLET_CAP } from "@/lib/constants/limits";
import { CardApplication } from "@/lib/types/database";
import { evaluateIssuerRule } from "@/lib/constants/issuer-rules";
import { ApplicationVerdict } from "@/components/applications/application-verdict";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

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

const ISSUERS = ["All", "Chase", "American Express", "Capital One", "Citi", "Bank of America", "US Bank", "Other"] as const;
type IssuerFilter = typeof ISSUERS[number];

function darkenHex(hex: string, amount = -65): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

type ActiveView = "list" | "flex" | "custom";

export function AddCardDialog({
  templates,
  categories,
  userId,
  isPremium,
  activeCardCount,
  onCardAdded,
  children,
}: {
  templates: CardTemplate[];
  categories: SpendingCategory[];
  userId: string;
  isPremium?: boolean;
  activeCardCount?: number;
  onCardAdded: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ActiveView>("list");
  const [search, setSearch] = useState("");
  const [issuerFilter, setIssuerFilter] = useState<IssuerFilter>("All");
  const [loading, setLoading] = useState(false);
  const [capBlocked, setCapBlocked] = useState(false);

  // Custom card form
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
  const [flexCategoryOptions, setFlexCategoryOptions] = useState<{ categoryId: string; displayName: string }[]>([]);
  const [selectedFlexCategoryIds, setSelectedFlexCategoryIds] = useState<string[]>([]);
  const [pendingTemplateRewards, setPendingTemplateRewards] = useState<any[]>([]);
  const [flexStep, setFlexStep] = useState<1 | 2>(1);
  const [flex2pctOptions, setFlex2pctOptions] = useState<{ categoryId: string; displayName: string }[]>([]);
  const [selectedEverydayCategoryId, setSelectedEverydayCategoryId] = useState<string | null>(null);
  const [applications, setApplications] = useState<CardApplication[]>([]);

  const supabase = createClient();
  const isCapReached = capBlocked || (!isPremium && (activeCardCount ?? 0) >= FREE_WALLET_CAP);

  // Known short names for issuer matching
  const issuerAliases: Record<string, string> = {
    "american express": "amex",
    "amex": "american express",
    "bank of america": "boa bofa",
    "us bank": "usb",
  };

  const filteredTemplates = templates.filter((t) => {
    // Issuer filter
    if (issuerFilter !== "All") {
      const knownIssuers = ["Chase", "American Express", "Capital One", "Citi", "Bank of America", "US Bank"];
      if (issuerFilter === "Other") {
        if (knownIssuers.some((ki) => t.issuer.toLowerCase().includes(ki.toLowerCase()))) return false;
      } else {
        if (!t.issuer.toLowerCase().includes(issuerFilter.toLowerCase())) return false;
      }
    }
    if (!search.trim()) return true;
    const issuerLower = t.issuer.toLowerCase();
    const aliasExtra = Object.entries(issuerAliases).find(([k]) => issuerLower.includes(k))?.[1] ?? "";
    const searchable = `${t.name} ${t.issuer} ${aliasExtra}`.toLowerCase();
    return search.trim().toLowerCase().split(/\s+/).every((token) => searchable.includes(token));
  });

  useEffect(() => {
    if (!open || !isPremium) return;
    supabase
      .from("card_applications")
      .select("*")
      .order("applied_on", { ascending: false })
      .then(({ data }) => setApplications((data ?? []) as CardApplication[]));
  }, [open, isPremium, supabase]);

  async function handleTemplateClick(template: CardTemplate) {
    if (FLEXIBLE_CARDS.includes(template.name)) {
      const { data: rewards } = await supabase
        .from("card_template_rewards")
        .select("*, category:spending_categories(*)")
        .eq("card_template_id", template.id);
      if (!rewards) return;
      const maxMultiplier = Math.max(...rewards.map((r) => r.multiplier));
      const flexRewards = rewards.filter((r) => r.multiplier >= maxMultiplier);
      const cardLabels = CARD_CATEGORY_LABELS[template.name] ?? {};
      setPendingTemplate(template);
      setPendingTemplateRewards(rewards);
      setFlexCategoryOptions(
        flexRewards.map((r) => ({
          categoryId: r.category_id,
          displayName: cardLabels[r.category?.name ?? ""] ?? r.category?.display_name ?? r.category_id,
        }))
      );
      setSelectedFlexCategoryIds([]);
      const eligible2pct = FLEX_2PCT_OPTIONS[template.name] ?? [];
      setFlex2pctOptions(
        rewards
          .filter((r) => eligible2pct.includes(r.category?.name ?? ""))
          .map((r) => ({ categoryId: r.category_id, displayName: cardLabels[r.category?.name ?? ""] ?? r.category?.display_name ?? r.category_id }))
      );
      setFlexStep(1);
      setSelectedEverydayCategoryId(null);
      setView("flex");
    } else {
      await addFromTemplate(template);
    }
  }

  async function addFromTemplate(template: CardTemplate) {
    if (isCapReached) return;
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: "template",
          templateId: template.id,
          lastFour: lastFour || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === "FREE_CAP") {
          setCapBlocked(true);
          toast.error("You've filled your free wallet");
          return;
        }
        throw new Error(data?.error ?? "Failed");
      }
      closeAndReset();
      onCardAdded();
      if (template.annual_fee > 0) {
        toast.success(`${template.name} added`, {
          description: `$${fmt(template.annual_fee)}/yr fee · set a renewal date to get alerts`,
          action: { label: "Set date →", onClick: () => { window.location.href = "/wallet"; } },
          duration: 8000,
        });
      } else {
        toast.success(`${template.name} added to your wallet`);
      }
    } catch {
      toast.error("Failed to add card");
    } finally {
      setLoading(false);
    }
  }

  function resetFlexState() {
    setPendingTemplate(null);
    setFlexCategoryOptions([]);
    setSelectedFlexCategoryIds([]);
    setPendingTemplateRewards([]);
    setFlex2pctOptions([]);
    setFlexStep(1);
    setSelectedEverydayCategoryId(null);
    setView("list");
  }

  async function confirmFlexibleCard() {
    if (!pendingTemplate || selectedFlexCategoryIds.length === 0) return;
    if (isCapReached) return;
    setLoading(true);
    try {
      const maxMultiplier = Math.max(...pendingTemplateRewards.map((r) => r.multiplier));
      let rewardsToSave: { category_id: string; multiplier: number; cap_amount: number | null }[];

      if (flex2pctOptions.length > 0) {
        rewardsToSave = [
          ...pendingTemplateRewards
            .filter((r) => selectedFlexCategoryIds.includes(r.category_id))
            .map((r) => ({ category_id: r.category_id, multiplier: r.multiplier, cap_amount: r.cap_amount ?? null })),
          ...(selectedEverydayCategoryId
            ? [{ category_id: selectedEverydayCategoryId, multiplier: 2.0, cap_amount: null }]
            : []),
        ];
      } else {
        rewardsToSave = pendingTemplateRewards
          .filter((r) => r.multiplier < maxMultiplier || selectedFlexCategoryIds.includes(r.category_id))
          .map((r) => ({ category_id: r.category_id, multiplier: r.multiplier, cap_amount: r.cap_amount ?? null }));
      }

      const res = await fetch("/api/wallet/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: "template",
          templateId: pendingTemplate.id,
          lastFour: lastFour || null,
          rewards: rewardsToSave,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === "FREE_CAP") {
          setCapBlocked(true);
          toast.error("You've filled your free wallet");
          return;
        }
        throw new Error(data?.error ?? "Failed");
      }
      closeAndReset();
      onCardAdded();
      if (pendingTemplate.annual_fee > 0) {
        toast.success(`${pendingTemplate.name} added`, {
          description: `$${fmt(pendingTemplate.annual_fee)}/yr fee · set a renewal date to get alerts`,
          action: { label: "Set date →", onClick: () => { window.location.href = "/wallet"; } },
          duration: 8000,
        });
      } else {
        toast.success(`${pendingTemplate.name} added to your wallet`);
      }
    } catch {
      toast.error("Failed to add card");
    } finally {
      setLoading(false);
    }
  }

  async function addCustomCard(e: React.FormEvent) {
    e.preventDefault();
    if (isCapReached) return;
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
      const res = await fetch("/api/wallet/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: "custom",
          custom: parsed.data,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === "FREE_CAP") {
          setCapBlocked(true);
          toast.error("You've filled your free wallet");
          return;
        }
        throw new Error(data?.error ?? "Failed");
      }
      toast.success(`${customName} added to your wallet`);
      closeAndReset();
      onCardAdded();
    } catch {
      toast.error("Failed to add card");
    } finally {
      setLoading(false);
    }
  }

  function closeAndReset() {
    setOpen(false);
    setSearch("");
    setLastFour("");
    setIssuerFilter("All");
    setView("list");
    resetFlexState();
    setCustomName("");
    setCustomIssuer("");
    setCustomNetwork("Visa");
    setCustomRewardType("points");
    setCustomRewardUnit("Points");
    setCustomBaseRate("1");
    setCustomColor("#6366f1");
    setCapBlocked(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeAndReset(); else setOpen(true); }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="top-0 left-0 translate-x-0 translate-y-0 sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] max-w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[88vh] overflow-hidden flex flex-col rounded-none sm:rounded-2xl p-0">
        <DialogHeader className="px-5 pt-5 pb-0 flex-shrink-0">
          <div className="flex items-center gap-3">
            {(view === "flex" || view === "custom") && (
              <button
                onClick={() => view === "flex" ? resetFlexState() : setView("list")}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                type="button"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <DialogTitle className="text-lg font-semibold">
              {view === "list" && "Add a Card"}
              {view === "flex" && (pendingTemplate?.name ?? "Choose Categories")}
              {view === "custom" && "Custom Card"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
          {isCapReached ? (
            <div className="rounded-2xl border border-overlay-subtle bg-card p-5 space-y-3">
              <h3 className="text-base font-semibold">You&apos;ve filled your free wallet</h3>
              <p className="text-sm text-muted-foreground">
                Upgrade for unlimited cards, SUB tracking, and Smart Alerts.
              </p>
              <p className="text-sm text-muted-foreground">Or archive a card to make room.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => goPremium({ successPath: "/wallet", cancelPath: "/wallet" })}>
                  Upgrade for $3.99/mo
                </Button>
                <Button variant="outline" onClick={() => closeAndReset()}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
          <AnimatePresence mode="wait" initial={false}>
            {view === "list" && (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search 104+ cards..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>

                {/* Issuer chips */}
                <div className="flex gap-2 flex-wrap">
                  {ISSUERS.map((issuer) => (
                    <button
                      key={issuer}
                      onClick={() => setIssuerFilter(issuer)}
                      className={cn(
                        "h-7 px-3 rounded-full text-xs font-medium border transition-all",
                        issuerFilter === issuer
                          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                      )}
                    >
                      {issuer}
                    </button>
                  ))}
                </div>

                {/* Template list */}
                <div className="space-y-2">
                  {filteredTemplates.map((template) => {
                    const color = template.color ?? "#6366f1";
                    const darker = darkenHex(color);
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateClick(template)}
                        disabled={loading}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.03] transition-all text-left group"
                        type="button"
                      >
                        {/* Mini card swatch */}
                        <div
                          className="w-14 h-9 rounded-lg flex-shrink-0 relative overflow-hidden shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${darker} 0%, ${color} 100%)` }}
                        >
                          <div className="absolute -right-3 -top-3 w-10 h-10 rounded-full bg-white/[0.07]" />
                          <div className="absolute bottom-1.5 left-2 w-3.5 h-2.5 rounded-[2px] bg-white/25" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {template.issuer} · {template.base_reward_rate}x base ·{" "}
                            {template.annual_fee > 0 ? `$${fmt(template.annual_fee)}/yr` : "No annual fee"}
                          </p>
                          <div className="mt-1">
                            <ApplicationVerdict
                              isPremium={!!isPremium}
                              verdict={evaluateIssuerRule(template.issuer, applications, [], { is_business: /business/i.test(template.name) })}
                            />
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3 h-3 text-primary" />
                        </div>
                      </button>
                    );
                  })}
                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-10 space-y-2">
                      <CreditCard className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        No cards found. Try a different search.
                      </p>
                    </div>
                  )}
                </div>

                {/* Custom card CTA */}
                <button
                  onClick={() => setView("custom")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/[0.03] transition-all text-left"
                  type="button"
                >
                  <div className="w-14 h-9 rounded-lg flex-shrink-0 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Custom Card</p>
                    <p className="text-xs text-muted-foreground/60">Add a card not in the list</p>
                  </div>
                </button>
              </motion.div>
            )}

            {view === "flex" && pendingTemplate && (
              <motion.div
                key="flex"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* Card preview */}
                <div
                  className="w-full aspect-[1.586/1] rounded-2xl p-4 flex flex-col justify-between text-white overflow-hidden shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${darkenHex(pendingTemplate.color ?? "#6366f1")} 0%, ${pendingTemplate.color ?? "#6366f1"} 100%)` }}
                >
                  <p className="text-sm font-bold">{pendingTemplate.name}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-xs font-mono tracking-widest opacity-70">•••• ••••</p>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-black/30 font-medium">
                      {pendingTemplate.issuer}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Step {flexStep} of {flex2pctOptions.length > 0 ? "2" : "1"}
                </div>

                {flexStep === 1 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {pendingTemplate.name === "Citi Custom Cash"
                        ? "Earns 5% on your top eligible category. Which do you spend most on?"
                        : pendingTemplate.name === "Bank of America Customized Cash Rewards"
                        ? "Earns 3% on your choice of category. Pick your top spend."
                        : `Earns 5% on ${FLEX_CATEGORY_COUNT[pendingTemplate.name] ?? 1} categories you choose. Pick your top ${FLEX_CATEGORY_COUNT[pendingTemplate.name] ?? 1}.`}
                    </p>
                    {(FLEX_CATEGORY_COUNT[pendingTemplate.name] ?? 1) > 1 && (
                      <p className="text-xs font-medium text-primary">{selectedFlexCategoryIds.length}/{FLEX_CATEGORY_COUNT[pendingTemplate.name]} selected</p>
                    )}
                    <div className="space-y-2">
                      {flexCategoryOptions.map((opt) => {
                        const flexCount = FLEX_CATEGORY_COUNT[pendingTemplate.name] ?? 1;
                        const isSelected = selectedFlexCategoryIds.includes(opt.categoryId);
                        const atMax = flexCount > 1 && selectedFlexCategoryIds.length >= flexCount && !isSelected;
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
                                    : prev.length < flexCount ? [...prev, opt.categoryId] : prev
                                );
                              }
                            }}
                            disabled={atMax}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                              isSelected ? "border-primary/50 bg-primary/[0.08]"
                                : atMax ? "border-border opacity-40 cursor-not-allowed"
                                : "border-border hover:bg-muted/50"
                            )}
                            type="button"
                          >
                            <span className="text-sm font-medium flex-1">{opt.displayName}</span>
                            <div className={cn(
                              "w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0",
                              flexCount > 1 ? "rounded" : "rounded-full",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                            )}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      onClick={() => flex2pctOptions.length > 0 ? setFlexStep(2) : confirmFlexibleCard()}
                      disabled={selectedFlexCategoryIds.length !== (FLEX_CATEGORY_COUNT[pendingTemplate.name] ?? 1) || loading}
                      className="w-full h-11"
                    >
                      {flex2pctOptions.length > 0 ? "Next" : (loading ? "Adding..." : "Add Card")}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Earns 2% on 1 everyday category you choose. Which do you spend most on?
                    </p>
                    <div className="space-y-2">
                      {flex2pctOptions.map((opt) => {
                        const isSelected = selectedEverydayCategoryId === opt.categoryId;
                        return (
                          <button
                            key={opt.categoryId}
                            onClick={() => setSelectedEverydayCategoryId(opt.categoryId)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                              isSelected ? "border-primary/50 bg-primary/[0.08]" : "border-border hover:bg-muted/50"
                            )}
                            type="button"
                          >
                            <span className="text-sm font-medium flex-1">{opt.displayName}</span>
                            <div className={cn(
                              "w-5 h-5 border-2 rounded-full flex items-center justify-center flex-shrink-0",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                            )}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      onClick={confirmFlexibleCard}
                      disabled={!selectedEverydayCategoryId || loading}
                      className="w-full h-11"
                    >
                      {loading ? "Adding..." : "Add Card"}
                    </Button>
                  </>
                )}
              </motion.div>
            )}

            {view === "custom" && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
              >
                <form onSubmit={addCustomCard} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Card Name</Label>
                    <Input
                      id="cardName"
                      placeholder="e.g. My Travel Card"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issuer">Issuer</Label>
                      <Input
                        id="issuer"
                        placeholder="e.g. Chase"
                        value={customIssuer}
                        onChange={(e) => setCustomIssuer(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="network">Network</Label>
                      <Select value={customNetwork} onValueChange={setCustomNetwork}>
                        <SelectTrigger id="network" className="h-11">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rewardType">Reward Type</Label>
                      <Select value={customRewardType} onValueChange={setCustomRewardType}>
                        <SelectTrigger id="rewardType" className="h-11">
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
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lastFour">Last 4 Digits (optional)</Label>
                      <Input
                        id="lastFour"
                        placeholder="1234"
                        maxLength={4}
                        value={lastFour}
                        onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
                        className="h-11"
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
                          className="w-11 h-11 rounded-lg cursor-pointer border border-border"
                        />
                        <span className="text-sm text-muted-foreground font-mono">{customColor}</span>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? "Adding..." : "Add Custom Card"}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
