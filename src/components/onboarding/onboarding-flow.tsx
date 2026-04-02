"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CardTemplate, SpendingCategory } from "@/lib/types/database";
import { Search, Check, Sparkles, ArrowRight, ChevronRight, Database, Loader2, X, Gift, Scale, DollarSign } from "lucide-react";
import { seedCreditsFromTemplate } from "@/lib/utils/seed-credits";
import { TEMPLATE_CREDITS } from "@/lib/constants/template-credits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

type Step = 1 | 2 | "perk-review" | "card-spend" | 3;

const FLEXIBLE_CARDS: Record<string, { multiplier: number; count: number; categories: string[] }> = {
  "Citi Custom Cash": { multiplier: 5, count: 1, categories: ["dining", "gas", "groceries", "online_shopping", "streaming", "home_improvement", "drugstores", "entertainment"] },
  "US Bank Cash+": { multiplier: 5, count: 2, categories: ["streaming", "home_improvement", "transit", "entertainment", "online_shopping", "gym_fitness", "utilities"] },
  "Bank of America Customized Cash Rewards": { multiplier: 3, count: 1, categories: ["dining", "gas", "online_shopping", "travel", "drugstores", "home_improvement"] },
};

const SAMPLE_CARDS = [
  "Chase Sapphire Preferred® Card",
  "American Express® Gold Card",
  "Citi Double Cash® Card",
];


function formatReward(template: CardTemplate): string {
  const rate = template.base_reward_rate;
  const type = (template.reward_type ?? "").toLowerCase();
  if (type === "cashback" || type === "cash_back" || template.reward_unit === "%") {
    return `${rate}% cashback`;
  }
  return `${rate}x ${type || "points"}`;
}

function ProgressDots({ current }: { current: number }) {
  // Map step to dot position: 1→1, 2→2, perk-review→2, card-spend→2, 3→3
  const dotPos = typeof current === "number" ? current : 2;
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all",
            s === dotPos ? "w-8 bg-primary" : s < dotPos ? "w-4 bg-primary/40" : "w-4 bg-muted"
          )}
        />
      ))}
    </div>
  );
}

export function OnboardingFlow({
  userId,
  templates,
  categories,
}: {
  userId: string;
  templates: CardTemplate[];
  categories: SpendingCategory[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [issuerFilter, setIssuerFilter] = useState<string | null>(null);
  // Flex card bottom sheet state
  const [flexSheet, setFlexSheet] = useState<{ template: CardTemplate; config: typeof FLEXIBLE_CARDS[string] } | null>(null);
  const [flexSelectedCatIds, setFlexSelectedCatIds] = useState<string[]>([]);
  // Stores chosen flex categories per template id: { templateId: [categoryId, ...] }
  const [flexChoices, setFlexChoices] = useState<Record<string, string[]>>({});
  // Perk review: templateId → Set of credit names user plans to use
  const [perkChoices, setPerkChoices] = useState<Record<string, Set<string>>>({});
  // Card spend: templateId → { categoryId, multiplier }[]
  const [bonusCatsByTemplate, setBonusCatsByTemplate] = useState<Record<string, Array<{ categoryId: string; multiplier: number }>>>({});
  // Category spend: categoryId → monthly amount
  const [cardSpend, setCardSpend] = useState<Record<string, number>>({});

  const allIssuers = [...new Set(templates.map((t) => t.issuer))].sort();

  const filteredTemplates = templates.filter((t) => {
    if (selectedIds.has(t.id)) return false;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.issuer.toLowerCase().includes(search.toLowerCase());
    const matchesIssuer = issuerFilter ? t.issuer === issuerFilter : true;
    return matchesSearch && matchesIssuer;
  });

  const byIssuer = filteredTemplates.reduce<Record<string, CardTemplate[]>>((acc, t) => {
    if (!acc[t.issuer]) acc[t.issuer] = [];
    acc[t.issuer].push(t);
    return acc;
  }, {});
  const issuers = Object.keys(byIssuer).sort();

  // All selected annual-fee cards
  const annualFeeCards = templates.filter(
    (t) => selectedIds.has(t.id) && (t.annual_fee ?? 0) > 0
  );

  // Annual-fee cards selected that have template credits to review
  const annualFeeCardsWithCredits = templates.filter(
    (t) => selectedIds.has(t.id) && t.annual_fee > 0 && TEMPLATE_CREDITS[t.name]?.length > 0
  );

  function toggleCard(id: string) {
    if (selectedIds.has(id)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setFlexChoices((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    const template = templates.find((t) => t.id === id);
    const flexConfig = template ? FLEXIBLE_CARDS[template.name] : null;
    if (template && flexConfig) {
      setFlexSheet({ template, config: flexConfig });
      setFlexSelectedCatIds([]);
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      setSearch("");
      setIssuerFilter(null);
      return next;
    });
  }

  function confirmFlexSelection() {
    if (!flexSheet) return;
    const { template, config } = flexSheet;
    if (flexSelectedCatIds.length !== config.count) return;

    setFlexChoices((prev) => ({ ...prev, [template.id]: flexSelectedCatIds }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(template.id);
      return next;
    });
    setSearch("");
    setIssuerFilter(null);
    setFlexSheet(null);
    setFlexSelectedCatIds([]);
  }

  // Fetch bonus categories for selected annual-fee cards and go to card-spend step
  async function goToCardSpend() {
    const afIds = annualFeeCards.map((t) => t.id);
    if (afIds.length === 0) {
      await addSelectedCards();
      return;
    }

    setLoading(true);
    try {
      const { data: rewards } = await supabase
        .from("card_template_rewards")
        .select("card_template_id, category_id, multiplier")
        .in("card_template_id", afIds);

      const bonusMap: Record<string, Array<{ categoryId: string; multiplier: number }>> = {};
      for (const t of annualFeeCards) {
        const templateRewards = rewards?.filter((r) => r.card_template_id === t.id) ?? [];
        bonusMap[t.id] = templateRewards
          .filter((r) => r.multiplier > (t.base_reward_rate ?? 1))
          .map((r) => ({ categoryId: r.category_id, multiplier: r.multiplier }));
      }
      setBonusCatsByTemplate(bonusMap);

      const uniqueBonusCatIds = [...new Set(Object.values(bonusMap).flat().map((c) => c.categoryId))];

      if (uniqueBonusCatIds.length === 0) {
        // No bonus categories — skip this step
        await addSelectedCards(bonusMap, {});
        return;
      }

      const initialSpend: Record<string, number> = {};
      for (const catId of uniqueBonusCatIds) {
        initialSpend[catId] = 0;
      }
      setCardSpend(initialSpend);
      setStep("card-spend");
    } finally {
      setLoading(false);
    }
  }

  // Called when user clicks "Add X cards" — route through perk review and/or card-spend
  function handleContinueFromCards() {
    if (selectedIds.size === 0) {
      router.push("/dashboard");
      return;
    }

    if (annualFeeCardsWithCredits.length > 0) {
      // Initialize perkChoices: all credits checked by default
      const initial: Record<string, Set<string>> = {};
      for (const t of annualFeeCardsWithCredits) {
        initial[t.id] = new Set(TEMPLATE_CREDITS[t.name].map((c) => c.name));
      }
      setPerkChoices(initial);
      setStep("perk-review");
    } else if (annualFeeCards.length > 0) {
      goToCardSpend();
    } else {
      addSelectedCards();
    }
  }

  function togglePerk(templateId: string, creditName: string) {
    setPerkChoices((prev) => {
      const current = new Set(prev[templateId] ?? []);
      if (current.has(creditName)) {
        current.delete(creditName);
      } else {
        current.add(creditName);
      }
      return { ...prev, [templateId]: current };
    });
  }

  async function addCards(ids: Set<string>) {
    const selectedTemplates = templates.filter((t) => ids.has(t.id));
    const addedCards: Array<{ id: string }> = [];

    for (const template of selectedTemplates) {
      const { data: userCard, error } = await supabase
        .from("user_cards")
        .insert({ user_id: userId, card_template_id: template.id })
        .select()
        .single();
      if (error) throw error;
      addedCards.push({ id: userCard.id });

      const { data: templateRewards } = await supabase
        .from("card_template_rewards")
        .select("*")
        .eq("card_template_id", template.id);

      if (templateRewards && templateRewards.length > 0) {
        const flexConfig = FLEXIBLE_CARDS[template.name];
        const chosenCatIds = flexChoices[template.id];

        if (flexConfig && chosenCatIds?.length) {
          const maxMult = Math.max(...templateRewards.map((tr) => tr.multiplier));
          const baseRewards = templateRewards
            .filter((r) => r.multiplier < maxMult)
            .map((r) => ({
              user_card_id: userCard.id,
              category_id: r.category_id,
              multiplier: r.multiplier,
              cap_amount: r.cap_amount,
            }));
          const flexRewards = chosenCatIds.map((catId) => ({
            user_card_id: userCard.id,
            category_id: catId,
            multiplier: flexConfig.multiplier,
            cap_amount: null,
          }));
          const allRewards = [...baseRewards, ...flexRewards];
          if (allRewards.length > 0) {
            await supabase.from("user_card_rewards").insert(allRewards);
          }
        } else {
          await supabase.from("user_card_rewards").insert(
            templateRewards.map((r) => ({
              user_card_id: userCard.id,
              category_id: r.category_id,
              multiplier: r.multiplier,
              cap_amount: r.cap_amount,
            }))
          );
        }
      }

      if (template.id) {
        const willUseNames = perkChoices[template.id];
        await seedCreditsFromTemplate(supabase, userCard.id, userId, template.id, willUseNames);
      }
    }
    return addedCards;
  }

  async function addSelectedCards(
    bonusMap?: Record<string, Array<{ categoryId: string; multiplier: number }>>,
    spendMap?: Record<string, number>
  ) {
    if (selectedIds.size === 0) {
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    try {
      await addCards(selectedIds);

      // Save bonus-category spend entries (use passed params or state)
      const spendToSave = spendMap ?? cardSpend;
      const spendEntries = Object.entries(spendToSave)
        .filter(([, amount]) => amount > 0)
        .map(([categoryId, amount]) => ({
          user_id: userId,
          category_id: categoryId,
          monthly_amount: amount,
          source: "manual" as const,
        }));
      if (spendEntries.length > 0) {
        await supabase.from("user_category_spend").insert(spendEntries);
      }

      setStep(3);
    } catch (err) {
      toast.error("Failed to add cards. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSampleData() {
    setSampleLoading(true);
    try {
      const sampleTemplates = SAMPLE_CARDS
        .map((name) => templates.find((t) => t.name === name))
        .filter(Boolean) as CardTemplate[];
      const toAdd = sampleTemplates.length >= 2 ? sampleTemplates : templates.slice(0, 3);
      await addCards(new Set(toAdd.map((t) => t.id)));
      setSelectedIds(new Set(toAdd.map((t) => t.id)));
      setStep(3);
      toast.success("Sample data loaded!");
    } catch (err) {
      toast.error("Failed to load sample data");
      console.error(err);
    } finally {
      setSampleLoading(false);
    }
  }

  // ── Step 1: Welcome ──────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[70vh] text-center px-4 overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.08] blur-3xl pointer-events-none" />
        <div className="relative z-10 w-full max-w-sm">
          <ProgressDots current={1} />
          <div className="mb-4">
            <img src="/logo.png" alt="Credit Card Chris" className="h-14 w-auto mx-auto" style={{ height: "3.5rem", width: "auto" }} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
            Welcome to<br />
            <span className="text-primary">Credit Card Chris</span>
          </h1>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Track your rewards, optimize spending, and always know which card to use.
          </p>
          <div className="space-y-2.5">
            <Button size="lg" onClick={() => setStep(2)} className="gap-2 px-8 w-full">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
            <button
              onClick={loadSampleData}
              disabled={sampleLoading}
              className="flex items-center justify-center gap-2 w-full px-8 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all disabled:opacity-50"
            >
              {sampleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {sampleLoading ? "Loading sample data..." : "Try with sample data"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Sample data adds 3 popular cards to your wallet
          </p>
        </div>
      </div>
    );
  }

  // ── Step 2: Add Cards ────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div>
        <ProgressDots current={2} />
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Which cards do you have?
          </h1>
          <p className="text-muted-foreground text-base mt-2">
            Select all the credit cards in your wallet.
            {selectedIds.size > 0 && (
              <span className="text-primary font-medium ml-2">{selectedIds.size} selected</span>
            )}
          </p>
        </div>

        {/* Selected cards chips */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {templates.filter((t) => selectedIds.has(t.id)).map((t) => {
              const flexCatIds = flexChoices[t.id];
              const flexLabel = flexCatIds?.length
                ? flexCatIds.map((id) => categories.find((c) => c.id === id)?.display_name).filter(Boolean).join(", ")
                : null;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleCard(t.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-medium text-primary hover:bg-primary/20 transition-all"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.color ?? "#6366f1" }}
                  />
                  <span className="max-w-[180px] truncate">
                    {t.name.replace(/®|™/g, "")}
                    {flexLabel && <span className="text-primary/60"> · {flexLabel}</span>}
                  </span>
                  <X className="w-3 h-3 opacity-60" />
                </button>
              );
            })}
          </div>
        )}

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by card name or issuer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIssuerFilter(null); }}
            className="pl-9"
          />
        </div>

        {/* Issuer filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          <button
            onClick={() => setIssuerFilter(null)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              issuerFilter === null
                ? "bg-primary/15 border-primary/30 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            All
          </button>
          {allIssuers.map((issuer) => (
            <button
              key={issuer}
              onClick={() => setIssuerFilter(issuer === issuerFilter ? null : issuer)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                issuerFilter === issuer
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {issuer}
            </button>
          ))}
        </div>

        <div className="max-h-[45vh] overflow-y-auto mb-8 pr-1 space-y-5">
          {issuers.map((issuer) => (
            <div key={issuer}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {issuer}
              </p>
              <div className="space-y-1.5">
                {byIssuer[issuer].map((template) => {
                  const isSelected = selectedIds.has(template.id);
                  return (
                    <button
                      key={template.id}
                      onClick={() => toggleCard(template.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                        isSelected
                          ? "border-primary/50 bg-primary/[0.08]"
                          : "border-border hover:bg-muted/50"
                      )}
                      type="button"
                    >
                      <div
                        className="w-12 h-8 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: template.color ?? "#6366f1" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatReward(template)}
                          <span className="mx-1.5 opacity-40">·</span>
                          {template.annual_fee > 0 ? `$${fmt(template.annual_fee)}/yr` : "No annual fee"}
                        </p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No cards found. Try a different search.
            </p>
          )}
        </div>

        {/* Spacer for sticky bottom bar + mobile nav */}
        <div className="h-28" />

        {/* Sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/60 px-4 py-3 safe-bottom">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
            <Button onClick={handleContinueFromCards} disabled={loading} className="gap-2">
              {loading
                ? "Loading..."
                : selectedIds.size > 0
                ? `Add ${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""}`
                : "Continue"}
              {!loading && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Flex category bottom sheet */}
        {flexSheet && (
          <div className="fixed inset-0 z-[60]">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { setFlexSheet(null); setFlexSelectedCatIds([]); }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-border/60 p-5 pb-8 animate-in slide-in-from-bottom duration-200">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-5" />

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-7 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: flexSheet.template.color ?? "#6366f1" }}
                />
                <div>
                  <p className="font-semibold text-sm">{flexSheet.template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {flexSheet.config.multiplier}x on {flexSheet.config.count === 1 ? "one category" : `${flexSheet.config.count} categories`} of your choice
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                {flexSheet.config.count === 1
                  ? "Pick your bonus category:"
                  : `Pick ${flexSheet.config.count} bonus categories (${flexSelectedCatIds.length}/${flexSheet.config.count}):`}
              </p>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {flexSheet.config.categories
                  .map((name) => categories.find((c) => c.name === name))
                  .filter(Boolean)
                  .map((cat) => {
                    const isSelected = flexSelectedCatIds.includes(cat!.id);
                    const atMax = flexSheet.config.count > 1 && flexSelectedCatIds.length >= flexSheet.config.count && !isSelected;
                    return (
                      <button
                        key={cat!.id}
                        type="button"
                        onClick={() => {
                          if (flexSheet.config.count === 1) {
                            setFlexSelectedCatIds([cat!.id]);
                          } else {
                            setFlexSelectedCatIds((prev) =>
                              prev.includes(cat!.id)
                                ? prev.filter((id) => id !== cat!.id)
                                : prev.length < flexSheet.config.count
                                ? [...prev, cat!.id]
                                : prev
                            );
                          }
                        }}
                        disabled={atMax}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all",
                          isSelected
                            ? "border-primary/50 bg-primary/[0.08]"
                            : atMax
                            ? "border-border opacity-40 cursor-not-allowed"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <span className="flex-1">{cat!.display_name}</span>
                        <div className={cn(
                          "w-4 h-4 border-2 flex items-center justify-center flex-shrink-0",
                          flexSheet.config.count > 1 ? "rounded" : "rounded-full",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                        )}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
              </div>

              <div className="flex gap-3 mt-5">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setFlexSheet(null); setFlexSelectedCatIds([]); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={flexSelectedCatIds.length !== flexSheet.config.count}
                  onClick={confirmFlexSelection}
                >
                  Add Card
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Step 2.5: Perk Review ────────────────────────────────────────────────
  if (step === "perk-review") {
    const totalSelected = annualFeeCardsWithCredits.reduce(
      (sum, t) => sum + (perkChoices[t.id]?.size ?? 0),
      0
    );
    const totalAvailable = annualFeeCardsWithCredits.reduce(
      (sum, t) => sum + (TEMPLATE_CREDITS[t.name]?.length ?? 0),
      0
    );

    return (
      <div>
        <ProgressDots current={2} />
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Keep or Cancel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Will you actually use these perks?
          </h1>
          <p className="text-muted-foreground text-base mt-2">
            Be honest — we'll use this to calculate whether your annual fees are worth it.
          </p>
        </div>

        <div className="space-y-5 mb-32">
          {annualFeeCardsWithCredits.map((template) => {
            const credits = TEMPLATE_CREDITS[template.name] ?? [];
            const chosen = perkChoices[template.id] ?? new Set();
            const usedValue = credits
              .filter((c) => chosen.has(c.name))
              .reduce((s, c) => s + c.annual_amount, 0);
            const totalValue = credits.reduce((s, c) => s + c.annual_amount, 0);

            return (
              <div key={template.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                {/* Card header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/20">
                  <div
                    className="w-10 h-6 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: template.color ?? "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{template.name}</p>
                    <p className="text-xs text-muted-foreground">${fmt(template.annual_fee)}/yr annual fee</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "text-xs font-semibold",
                      usedValue >= template.annual_fee ? "text-emerald-500" : "text-amber-500"
                    )}>
                      ${fmt(usedValue)} / ${fmt(totalValue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">you'll use</p>
                  </div>
                </div>

                {/* Credits list */}
                <div className="divide-y divide-border/40">
                  {credits.map((credit) => {
                    const willUse = chosen.has(credit.name);
                    return (
                      <button
                        key={credit.name}
                        type="button"
                        onClick={() => togglePerk(template.id, credit.name)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                          willUse ? "hover:bg-muted/30" : "hover:bg-muted/20 opacity-60"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                          willUse ? "bg-primary border-primary" : "border-muted-foreground/40 bg-transparent"
                        )}>
                          {willUse && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm truncate", !willUse && "line-through text-muted-foreground")}>
                            {credit.name}
                          </p>
                        </div>
                        <span className={cn(
                          "text-sm font-semibold flex-shrink-0 ml-2",
                          willUse ? "text-emerald-500" : "text-muted-foreground/50"
                        )}>
                          ${fmt(credit.annual_amount)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/60 px-4 py-3 safe-bottom">
          <div className="max-w-lg mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{totalSelected} of {totalAvailable} perks selected</span>
              <button
                onClick={() => {
                  const allSelected: Record<string, Set<string>> = {};
                  for (const t of annualFeeCardsWithCredits) {
                    allSelected[t.id] = new Set(TEMPLATE_CREDITS[t.name].map((c) => c.name));
                  }
                  setPerkChoices(allSelected);
                }}
                className="text-primary hover:underline"
              >
                Select all
              </button>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-shrink-0"
              >
                Back
              </Button>
              <Button
                onClick={goToCardSpend}
                disabled={loading}
                className="flex-1 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Loading..." : "Continue"}
                {!loading && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2.75: Card Spend ────────────────────────────────────────────────
  if (step === "card-spend") {
    // Unique bonus category IDs across all annual-fee cards
    const allBonusCatIds = [...new Set(
      Object.values(bonusCatsByTemplate).flat().map((c) => c.categoryId)
    )];

    return (
      <div>
        <ProgressDots current={2} />
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Keep or Cancel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            What do you spend on bonus categories?
          </h1>
          <p className="text-muted-foreground text-base mt-2">
            We'll estimate the reward value of your annual-fee cards.
          </p>
        </div>

        <div className="space-y-3 mb-32">
          {allBonusCatIds.map((catId) => {
            const cat = categories.find((c) => c.id === catId);
            if (!cat) return null;

            // Which annual-fee cards earn bonus on this category (with multiplier)
            const earningCards = annualFeeCards
              .filter((t) => bonusCatsByTemplate[t.id]?.some((c) => c.categoryId === catId))
              .map((t) => ({
                name: t.name.replace(/®|™/g, ""),
                multiplier: bonusCatsByTemplate[t.id].find((c) => c.categoryId === catId)!.multiplier,
              }));

            return (
              <div key={catId} className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{cat.display_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {earningCards.map((c) => `${c.name}: ${c.multiplier}x`).join(" · ")}
                    </p>
                  </div>
                  <div className="relative w-28 flex-shrink-0">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={cardSpend[catId] || ""}
                      onChange={(e) =>
                        setCardSpend((prev) => ({ ...prev, [catId]: parseFloat(e.target.value) || 0 }))
                      }
                      className="pl-7 text-right"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-right">per month</p>
              </div>
            );
          })}
        </div>

        {/* Sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/60 px-4 py-3 safe-bottom">
          <div className="max-w-lg mx-auto space-y-2">
            <p className="text-xs text-muted-foreground text-center px-1">
              Enter $0 for categories you won't use — you can update this later.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => annualFeeCardsWithCredits.length > 0 ? setStep("perk-review") : setStep(2)}
                className="flex-shrink-0"
              >
                Back
              </Button>
              <Button
                onClick={() => addSelectedCards()}
                disabled={loading}
                className="flex-1 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Adding cards..." : "Continue"}
                {!loading && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Done ─────────────────────────────────────────────────────────
  const addedTemplates = templates.filter((t) => selectedIds.has(t.id));

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[70vh] text-center px-4 overflow-hidden">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <ProgressDots current={3} />

        <div className="w-20 h-20 rounded-full bg-primary/[0.12] flex items-center justify-center mb-6 mx-auto ring-1 ring-primary/20">
          <Sparkles className="w-9 h-9 text-primary" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          You&apos;re all set!
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          {selectedIds.size > 0
            ? `${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""} added to your wallet.`
            : "Your account is ready to go."}
        </p>

        <p className="text-sm text-muted-foreground mb-4">What do you want to do first?</p>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={() => router.push("/best-card")}
            className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-primary/30 bg-primary/[0.06] hover:bg-primary/[0.10] active:scale-95 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/[0.12] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Best Card Finder</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap a category, see your top card</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/benefits")}
            className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 active:scale-95 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Gift className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">See My Credits</p>
              <p className="text-xs text-muted-foreground mt-0.5">Track statement credits & benefits</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
