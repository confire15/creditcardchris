"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CardTemplate, SpendingCategory } from "@/lib/types/database";
import { Search, Check, Sparkles, ArrowRight, ChevronRight, Database, Loader2, X, Gift, ChevronLeft, Scale, Calculator } from "lucide-react";
import { seedCreditsFromTemplate } from "@/lib/utils/seed-credits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

type Step = 1 | 2 | "credits" | 3;
type SeededCard = { userCardId: string; templateId: string; cardName: string; color: string | null };
type TemplateCreditRow = { card_template_id: string; name: string; annual_amount: number };

const creditKey = (templateId: string, name: string) => `${templateId}::${name}`;

// Most popular cards by name (must match card_templates.name exactly)
const POPULAR_CARD_NAMES = [
  "Chase Sapphire Preferred",
  "Chase Sapphire Reserve",
  "Chase Freedom Unlimited",
  "Chase Freedom Flex",
  "Amex Gold Card",
  "Amex Platinum Card",
  "Citi Double Cash",
  "Citi Custom Cash",
  "Capital One Venture X",
  "Capital One SavorOne",
  "Bilt Mastercard",
  "Apple Card",
  "Discover it Cash Back",
  "Chase Amazon Prime Rewards",
  "Capital One Venture",
];

const FLEXIBLE_CARDS: Record<string, { multiplier: number; count: number; categories: string[] }> = {
  "Citi Custom Cash": { multiplier: 5, count: 1, categories: ["dining", "gas", "groceries", "online_shopping", "streaming", "home_improvement", "drugstores", "entertainment"] },
  "US Bank Cash+": { multiplier: 5, count: 2, categories: ["streaming", "home_improvement", "transit", "entertainment", "online_shopping", "gym_fitness", "utilities"] },
  "Bank of America Customized Cash Rewards": { multiplier: 3, count: 1, categories: ["dining", "gas", "online_shopping", "travel", "drugstores", "home_improvement"] },
};

const SAMPLE_CARDS = [
  "Chase Sapphire Preferred",
  "Amex Gold Card",
  "Citi Double Cash",
];

function formatReward(template: CardTemplate): string {
  const rate = template.base_reward_rate;
  const type = (template.reward_type ?? "").toLowerCase();
  if (type === "cashback" || type === "cash_back" || template.reward_unit === "%") {
    return `${rate}% cash back`;
  }
  return `${rate}x ${type || "points"}`;
}

function ProgressDots({ current, className }: { current: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 justify-center mb-6", className)}>
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all",
            s === current ? "w-8 bg-primary" : s < current ? "w-4 bg-primary/40" : "w-4 bg-muted"
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
  const [showAllCards, setShowAllCards] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [issuerFilter, setIssuerFilter] = useState<string | null>(null);
  const [flexSheet, setFlexSheet] = useState<{ template: CardTemplate; config: typeof FLEXIBLE_CARDS[string] } | null>(null);
  const [flexSelectedCatIds, setFlexSelectedCatIds] = useState<string[]>([]);
  const [flexChoices, setFlexChoices] = useState<Record<string, string[]>>({});
  const [seededCards, setSeededCards] = useState<SeededCard[]>([]);
  const [templateCredits, setTemplateCredits] = useState<TemplateCreditRow[]>([]);
  const [willUse, setWillUse] = useState<Record<string, boolean>>({});
  const [committingCredits, setCommittingCredits] = useState(false);

  // Popular templates sorted alphabetically
  const popularTemplates = (POPULAR_CARD_NAMES
    .map((name) => templates.find((t) => t.name === name))
    .filter(Boolean) as CardTemplate[])
    .sort((a, b) => a.name.localeCompare(b.name));

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

  async function addCards(ids: Set<string>): Promise<SeededCard[]> {
    const selectedTemplates = templates.filter((t) => ids.has(t.id));
    const created: SeededCard[] = [];

    for (const template of selectedTemplates) {
      const { data: userCard, error } = await supabase
        .from("user_cards")
        .insert({ user_id: userId, card_template_id: template.id })
        .select()
        .single();
      if (error) throw error;

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
            .map((r) => ({ user_card_id: userCard.id, category_id: r.category_id, multiplier: r.multiplier, cap_amount: r.cap_amount }));
          const flexRewards = chosenCatIds.map((catId) => ({
            user_card_id: userCard.id, category_id: catId, multiplier: flexConfig.multiplier, cap_amount: null,
          }));
          const allRewards = [...baseRewards, ...flexRewards];
          if (allRewards.length > 0) await supabase.from("user_card_rewards").insert(allRewards);
        } else {
          await supabase.from("user_card_rewards").insert(
            templateRewards.map((r) => ({ user_card_id: userCard.id, category_id: r.category_id, multiplier: r.multiplier, cap_amount: r.cap_amount }))
          );
        }
      }

      created.push({
        userCardId: userCard.id,
        templateId: template.id,
        cardName: template.name,
        color: template.color ?? null,
      });
    }

    return created;
  }

  async function goToEpilogueOrDone(created: SeededCard[]) {
    if (created.length === 0) {
      setStep(3);
      return;
    }
    const templateIds = [...new Set(created.map((c) => c.templateId))];
    try {
      const { data: credits, error } = await supabase
        .from("card_template_credits")
        .select("card_template_id, name, annual_amount")
        .in("card_template_id", templateIds);
      if (error) throw error;
      const rows = (credits ?? []) as TemplateCreditRow[];
      if (rows.length === 0) {
        // No known credits — nothing to seed, skip epilogue
        setStep(3);
        return;
      }
      const initialWillUse: Record<string, boolean> = {};
      for (const r of rows) initialWillUse[creditKey(r.card_template_id, r.name)] = true;
      setSeededCards(created);
      setTemplateCredits(rows);
      setWillUse(initialWillUse);
      setStep("credits");
    } catch (err) {
      console.error(err);
      // Fall back to legacy behavior: seed all credits with will_use=true
      for (const card of created) {
        try {
          await seedCreditsFromTemplate(supabase, card.userCardId, userId, card.templateId);
        } catch (e) {
          console.error(e);
        }
      }
      setStep(3);
    }
  }

  async function commitCredits(honorSelections: boolean) {
    if (committingCredits) return;
    setCommittingCredits(true);
    try {
      for (const card of seededCards) {
        const names = honorSelections
          ? new Set(
              templateCredits
                .filter((c) => c.card_template_id === card.templateId && willUse[creditKey(card.templateId, c.name)])
                .map((c) => c.name)
            )
          : undefined;
        await seedCreditsFromTemplate(supabase, card.userCardId, userId, card.templateId, names);
      }
      setStep(3);
    } catch (err) {
      toast.error("Failed to save credits. Please try again.");
      console.error(err);
    } finally {
      setCommittingCredits(false);
    }
  }

  function toggleCredit(templateId: string, name: string) {
    const key = creditKey(templateId, name);
    setWillUse((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setAllForCard(templateId: string, value: boolean) {
    setWillUse((prev) => {
      const next = { ...prev };
      for (const c of templateCredits) {
        if (c.card_template_id === templateId) next[creditKey(templateId, c.name)] = value;
      }
      return next;
    });
  }

  async function addSelectedCards() {
    if (selectedIds.size === 0) {
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    try {
      const created = await addCards(selectedIds);
      await goToEpilogueOrDone(created);
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
      const created = await addCards(new Set(toAdd.map((t) => t.id)));
      setSelectedIds(new Set(toAdd.map((t) => t.id)));
      await goToEpilogueOrDone(created);
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
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[90vw] sm:w-[500px] h-[90vw] sm:h-[500px] rounded-full bg-primary/[0.08] blur-3xl pointer-events-none" />
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

  // Shared sticky bottom bar for step 2
  const StickyBottom = () => (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/60 px-4 py-3 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          Skip
        </button>
        {/* Selected card dots — polish #4 */}
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {templates.filter((t) => selectedIds.has(t.id)).slice(0, 8).map((t) => (
              <span
                key={t.id}
                className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-1 ring-background/80"
                style={{ backgroundColor: t.color ?? "#6366f1" }}
              />
            ))}
            {selectedIds.size > 8 && (
              <span className="text-xs text-muted-foreground ml-0.5">+{selectedIds.size - 8}</span>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <Button onClick={addSelectedCards} disabled={loading} className="gap-2 flex-shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? "Adding..." : selectedIds.size > 0 ? `Add ${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""}` : "Continue"}
          {!loading && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );

  // ── Step 2: Add Cards — Popular grid ────────────────────────────────────
  if (step === 2 && !showAllCards) {
    const isSearching = search.trim().length > 0;
    return (
      <div>
        <ProgressDots current={2} />
        <div className="mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Which cards do you have?</h1>
          <p className="text-muted-foreground text-base mt-1.5">Tap to select all your cards.</p>
        </div>

        {/* Polish #5 — persistent search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={`Search all ${templates.length} cards…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isSearching ? (
          /* Search results — list style */
          <div className="space-y-1.5 max-h-[52vh] overflow-y-auto mb-4 pr-0.5">
            {filteredTemplates.length > 0 ? filteredTemplates.map((template) => {
              const isSelected = selectedIds.has(template.id);
              return (
                <button
                  key={template.id}
                  onClick={() => toggleCard(template.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    isSelected ? "border-primary/50 bg-primary/[0.08]" : "border-border hover:bg-muted/50"
                  )}
                  type="button"
                >
                  <div className="w-10 h-7 rounded-lg flex-shrink-0" style={{ backgroundColor: template.color ?? "#6366f1" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{template.name}</p>
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
            }) : (
              <p className="text-sm text-muted-foreground text-center py-10">No cards found. Try a different name or issuer.</p>
            )}
          </div>
        ) : (
          /* Popular cards grid */
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {popularTemplates.map((template) => {
                const isSelected = selectedIds.has(template.id);
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => toggleCard(template.id)}
                    className={cn(
                      "rounded-xl border overflow-hidden text-left transition-all duration-150",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 scale-[1.02] shadow-md shadow-primary/10"
                        : "border-border hover:border-primary/30 hover:shadow-sm active:scale-[0.98]"
                    )}
                  >
                    {/* Polish #1 — mini card art */}
                    <div
                      className="h-14 relative flex items-end px-3 pb-2 overflow-hidden"
                      style={{ backgroundColor: template.color ?? "#6366f1" }}
                    >
                      {/* Subtle card chip decoration */}
                      <div className="absolute top-2.5 left-3 w-5 h-3.5 rounded-sm bg-white/20" />
                      <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest relative z-10">
                        {template.issuer}
                      </p>
                      {/* Polish #2 — checkmark on card art when selected */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                    {/* Card info */}
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-semibold leading-snug">
                        {template.name.replace(/®|™/g, "")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatReward(template)}</p>
                      {/* Polish #3 — fee badge */}
                      {template.annual_fee > 0 ? (
                        <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20">
                          ${fmt(template.annual_fee)}/yr
                        </span>
                      ) : (
                        <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold border border-emerald-500/20">
                          No annual fee
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Browse by issuer link */}
            <button
              onClick={() => setShowAllCards(true)}
              className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
            >
              Browse all cards by issuer
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        <div className="h-28" />
        <StickyBottom />

        {/* Flex card sheet */}
        {flexSheet && <FlexSheet
          flexSheet={flexSheet}
          flexSelectedCatIds={flexSelectedCatIds}
          setFlexSelectedCatIds={setFlexSelectedCatIds}
          setFlexSheet={setFlexSheet}
          categories={categories}
          confirmFlexSelection={confirmFlexSelection}
        />}
      </div>
    );
  }

  // ── Step 2: Add Cards — Full search ─────────────────────────────────────
  if (step === 2 && showAllCards) {
    return (
      <div>
        <ProgressDots current={2} />

        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setShowAllCards(false)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Popular
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">All Cards</h1>
          </div>
          {selectedIds.size > 0 && (
            <span className="text-primary font-medium text-sm">{selectedIds.size} selected</span>
          )}
        </div>


        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by card name or issuer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIssuerFilter(null); }}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          <button
            onClick={() => setIssuerFilter(null)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              issuerFilter === null ? "bg-primary/15 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
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
                issuerFilter === issuer ? "bg-primary/15 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {issuer}
            </button>
          ))}
        </div>

        <div className="max-h-[45vh] overflow-y-auto mb-8 pr-1 space-y-5">
          {issuers.map((issuer) => (
            <div key={issuer}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{issuer}</p>
              <div className="space-y-1.5">
                {byIssuer[issuer].map((template) => {
                  const isSelected = selectedIds.has(template.id);
                  return (
                    <button
                      key={template.id}
                      onClick={() => toggleCard(template.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                        isSelected ? "border-primary/50 bg-primary/[0.08]" : "border-border hover:bg-muted/50"
                      )}
                      type="button"
                    >
                      <div className="w-12 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: template.color ?? "#6366f1" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{template.name}</p>
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
            <p className="text-sm text-muted-foreground text-center py-8">No cards found. Try a different search.</p>
          )}
        </div>

        <div className="h-28" />
        <StickyBottom />

        {flexSheet && <FlexSheet
          flexSheet={flexSheet}
          flexSelectedCatIds={flexSelectedCatIds}
          setFlexSelectedCatIds={setFlexSelectedCatIds}
          setFlexSheet={setFlexSheet}
          categories={categories}
          confirmFlexSelection={confirmFlexSelection}
        />}
      </div>
    );
  }

  // ── Step 2.5: Credits epilogue ─────────────────────────────────────────
  if (step === "credits") {
    const totalCreditsPicked = templateCredits.filter((c) => willUse[creditKey(c.card_template_id, c.name)]).length;
    return (
      <div>
        <ProgressDots current={3} />
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Which credits will you use?</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1.5">
            We&apos;ll only track the ones you turn on. You can change this anytime in Benefits.
          </p>
        </div>

        <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-0.5 mb-4">
          {seededCards.map((card) => {
            const rows = templateCredits.filter((c) => c.card_template_id === card.templateId);
            if (rows.length === 0) return null;
            const allOn = rows.every((r) => willUse[creditKey(card.templateId, r.name)]);
            return (
              <div key={card.userCardId} className="rounded-2xl border border-border p-3 sm:p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-7 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: card.color ?? "#6366f1" }}
                  />
                  <p className="flex-1 min-w-0 text-sm font-semibold truncate">{card.cardName}</p>
                  <button
                    type="button"
                    onClick={() => setAllForCard(card.templateId, !allOn)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    {allOn ? "Turn all off" : "Turn all on"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {rows.map((r) => {
                    const key = creditKey(card.templateId, r.name);
                    const on = !!willUse[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCredit(card.templateId, r.name)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left",
                          on ? "border-primary/50 bg-primary/[0.08]" : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{r.name}</p>
                          <p className="text-xs text-muted-foreground">${fmt(r.annual_amount)}/yr</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                          on ? "bg-primary border-primary" : "border-muted-foreground/40"
                        )}>
                          {on && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-28" />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/60 px-4 py-3 safe-bottom">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => commitCredits(false)}
              disabled={committingCredits}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 disabled:opacity-50"
            >
              Keep all
            </button>
            <div className="flex-1 text-xs text-muted-foreground text-center">
              {totalCreditsPicked} of {templateCredits.length} selected
            </div>
            <Button onClick={() => commitCredits(true)} disabled={committingCredits} className="gap-2 flex-shrink-0">
              {committingCredits ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {committingCredits ? "Saving..." : "Continue"}
              {!committingCredits && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Done ─────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col items-center justify-start sm:justify-center min-h-[calc(100dvh-13rem)] sm:min-h-[70vh] text-center px-0 sm:px-4 overflow-hidden">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[90vw] sm:w-[500px] h-[90vw] sm:h-[500px] rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <ProgressDots current={3} className="mb-3 sm:mb-6" />
        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-primary/[0.12] flex items-center justify-center mb-3 sm:mb-6 mx-auto ring-1 ring-primary/20">
          <Sparkles className="w-7 h-7 sm:w-9 sm:h-9 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-2 sm:mb-3">You&apos;re all set!</h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-8">
          {selectedIds.size > 0 ? `${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""} added to your wallet.` : "Your account is ready to go."}
        </p>
        <p className="text-sm text-muted-foreground mb-3 sm:mb-4">What do you want to do first?</p>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
          {[
            { label: "Best Card", description: "Find the right card for any purchase", icon: <Sparkles className="w-6 h-6 text-primary" />, href: "/best-card" },
            { label: "Credits", description: "Track credits before they expire", icon: <Gift className="w-6 h-6 text-muted-foreground" />, href: "/benefits" },
            { label: "Keep/Cancel", description: "See if your annual fee is worth it", icon: <Scale className="w-6 h-6 text-muted-foreground" />, href: "/keep-or-cancel" },
            { label: "Fee Calc", description: "Reveal a premium card's real cost", icon: <Calculator className="w-6 h-6 text-muted-foreground" />, href: "/calculator" },
          ].map(({ label, description, icon, href }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="min-h-[116px] sm:min-h-[160px] p-3 sm:p-4 flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 rounded-2xl border border-border bg-card hover:bg-muted/50 active:scale-95 transition-all"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center bg-muted">
                {icon}
              </div>
              <p className="font-semibold text-[13px] sm:text-sm text-center leading-tight">{label}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground text-center leading-tight sm:leading-snug">{description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Flex card category picker sheet ─────────────────────────────────────────
function FlexSheet({
  flexSheet,
  flexSelectedCatIds,
  setFlexSelectedCatIds,
  setFlexSheet,
  categories,
  confirmFlexSelection,
}: {
  flexSheet: { template: CardTemplate; config: { multiplier: number; count: number; categories: string[] } };
  flexSelectedCatIds: string[];
  setFlexSelectedCatIds: React.Dispatch<React.SetStateAction<string[]>>;
  setFlexSheet: React.Dispatch<React.SetStateAction<typeof flexSheet | null>>;
  categories: SpendingCategory[];
  confirmFlexSelection: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setFlexSheet(null); setFlexSelectedCatIds([]); }} />
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-border/60 p-5 pb-8 animate-in slide-in-from-bottom duration-200">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-7 rounded-lg flex-shrink-0" style={{ backgroundColor: flexSheet.template.color ?? "#6366f1" }} />
          <div>
            <p className="font-semibold text-sm">{flexSheet.template.name}</p>
            <p className="text-xs text-muted-foreground">
              {flexSheet.config.multiplier}x on {flexSheet.config.count === 1 ? "one category" : `${flexSheet.config.count} categories`} of your choice
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {flexSheet.config.count === 1 ? "Pick your bonus category:" : `Pick ${flexSheet.config.count} bonus categories (${flexSelectedCatIds.length}/${flexSheet.config.count}):`}
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
                        prev.includes(cat!.id) ? prev.filter((id) => id !== cat!.id) : prev.length < flexSheet.config.count ? [...prev, cat!.id] : prev
                      );
                    }
                  }}
                  disabled={atMax}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all",
                    isSelected ? "border-primary/50 bg-primary/[0.08]" : atMax ? "border-border opacity-40 cursor-not-allowed" : "border-border hover:bg-muted/50"
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
          <Button variant="outline" className="flex-1" onClick={() => { setFlexSheet(null); setFlexSelectedCatIds([]); }}>Cancel</Button>
          <Button className="flex-1" disabled={flexSelectedCatIds.length !== flexSheet.config.count} onClick={confirmFlexSelection}>Add Card</Button>
        </div>
      </div>
    </div>
  );
}
