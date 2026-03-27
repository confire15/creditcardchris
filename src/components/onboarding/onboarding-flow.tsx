"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CardTemplate, SpendingCategory } from "@/lib/types/database";
import { Search, Check, Sparkles, ArrowRight, ChevronRight, Database, Loader2, X, Gift } from "lucide-react";
import { seedCreditsFromTemplate } from "@/lib/utils/seed-credits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

const SAMPLE_CARDS = [
  "Chase Sapphire Preferred® Card",
  "American Express® Gold Card",
  "Citi Double Cash® Card",
];

const SAMPLE_TRANSACTIONS = [
  { merchant: "Chipotle", category: "dining", amount: 14.5, daysAgo: 2 },
  { merchant: "Sweetgreen", category: "dining", amount: 18.0, daysAgo: 8 },
  { merchant: "Shake Shack", category: "dining", amount: 22.75, daysAgo: 15 },
  { merchant: "Nobu Restaurant", category: "dining", amount: 145.0, daysAgo: 22 },
  { merchant: "Starbucks", category: "dining", amount: 8.5, daysAgo: 30 },
  { merchant: "Chipotle", category: "dining", amount: 13.75, daysAgo: 37 },
  { merchant: "The Smith", category: "dining", amount: 87.0, daysAgo: 45 },
  { merchant: "Whole Foods Market", category: "groceries", amount: 124.3, daysAgo: 4 },
  { merchant: "Trader Joe's", category: "groceries", amount: 68.9, daysAgo: 18 },
  { merchant: "Costco", category: "groceries", amount: 213.5, daysAgo: 32 },
  { merchant: "Whole Foods Market", category: "groceries", amount: 97.4, daysAgo: 50 },
  { merchant: "Shell", category: "gas", amount: 52.0, daysAgo: 6 },
  { merchant: "BP", category: "gas", amount: 48.5, daysAgo: 21 },
  { merchant: "Chevron", category: "gas", amount: 55.0, daysAgo: 41 },
  { merchant: "Delta Air Lines", category: "travel", amount: 420.0, daysAgo: 12 },
  { merchant: "Marriott Hotels", category: "hotels", amount: 289.0, daysAgo: 14 },
  { merchant: "Uber", category: "transit", amount: 24.5, daysAgo: 26 },
  { merchant: "Netflix", category: "streaming", amount: 15.49, daysAgo: 5 },
  { merchant: "Spotify", category: "streaming", amount: 10.99, daysAgo: 5 },
  { merchant: "Amazon", category: "online_shopping", amount: 67.99, daysAgo: 9 },
  { merchant: "Target", category: "online_shopping", amount: 43.2, daysAgo: 28 },
  { merchant: "Amazon", category: "online_shopping", amount: 112.5, daysAgo: 44 },
  { merchant: "AMC Theatres", category: "entertainment", amount: 32.0, daysAgo: 19 },
  { merchant: "CVS Pharmacy", category: "drugstore", amount: 28.5, daysAgo: 7 },
  { merchant: "Walgreens", category: "drugstore", amount: 15.0, daysAgo: 33 },
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
  return (
    <div className="flex items-center gap-2 justify-center mb-10">
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
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [issuerFilter, setIssuerFilter] = useState<string | null>(null);

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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setSearch("");
        setIssuerFilter(null);
      }
      return next;
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
        // For flexible cards (Citi Custom Cash, etc.), only copy base-rate rewards.
        // The flex bonus category must be chosen by the user in the wallet.
        const FLEXIBLE_CARDS = ["Citi Custom Cash", "US Bank Cash+", "Bank of America Customized Cash Rewards"];
        const isFlexCard = FLEXIBLE_CARDS.includes(template.name);
        const rewardsToInsert = isFlexCard
          ? templateRewards.filter((r) => {
              const maxMult = Math.max(...templateRewards.map((tr) => tr.multiplier));
              return r.multiplier < maxMult;
            })
          : templateRewards;

        if (rewardsToInsert.length > 0) {
          await supabase.from("user_card_rewards").insert(
            rewardsToInsert.map((r) => ({
              user_card_id: userCard.id,
              category_id: r.category_id,
              multiplier: r.multiplier,
              cap_amount: r.cap_amount,
            }))
          );
        }
      }

      if (template.id) {
        await seedCreditsFromTemplate(supabase, userCard.id, userId, template.id);
      }
    }
    return addedCards;
  }

  async function addSelectedCards() {
    if (selectedIds.size === 0) {
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    try {
      await addCards(selectedIds);
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
      const addedCards = await addCards(new Set(toAdd.map((t) => t.id)));

      const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));
      const otherCatId = catMap["other"];
      const today = new Date();

      const txInserts = SAMPLE_TRANSACTIONS.map((tx, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - tx.daysAgo);
        return {
          user_id: userId,
          user_card_id: addedCards[i % addedCards.length].id,
          merchant: tx.merchant,
          amount: tx.amount,
          category_id: catMap[tx.category] ?? otherCatId,
          transaction_date: date.toISOString().slice(0, 10),
          rewards_earned: null,
        };
      });

      await supabase.from("transactions").insert(txInserts);
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

  // Step 1: Welcome
  if (step === 1) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[70vh] text-center px-4 overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.08] blur-3xl pointer-events-none" />
        <div className="relative z-10 w-full max-w-sm">
          <ProgressDots current={1} />
          <div className="mb-8">
            <img src="/logo.png" alt="Credit Card Chris" className="h-16 w-auto mx-auto" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Welcome to<br />
            <span className="text-primary">Credit Card Chris</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Track your rewards, optimize spending, and always know which card to use.
          </p>
          <div className="space-y-3">
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
          <p className="text-xs text-muted-foreground mt-4">
            Sample data adds 3 popular cards and 25 example transactions
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Add Cards
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
            {templates.filter((t) => selectedIds.has(t.id)).map((t) => (
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
                <span className="max-w-[140px] truncate">{t.name.replace(/®|™/g, "")}</span>
                <X className="w-3 h-3 opacity-60" />
              </button>
            ))}
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
                          {template.annual_fee > 0 ? `$${template.annual_fee}/yr` : "No annual fee"}
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

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            I'll add cards later
          </button>
          <Button onClick={addSelectedCards} disabled={loading} className="gap-2">
            {loading
              ? "Adding..."
              : selectedIds.size > 0
              ? `Continue with ${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""}`
              : "Continue"}
            {!loading && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Done
  const addedTemplates = templates.filter((t) => selectedIds.has(t.id));

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[70vh] text-center px-4 overflow-hidden">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <ProgressDots current={3} />

        {/* Icon */}
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

        {/* Cards preview */}
        {addedTemplates.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            {addedTemplates.slice(0, 6).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.color ?? "#6366f1" }}
                />
                <span className="max-w-[120px] truncate">{t.name.replace(/®|™/g, "")}</span>
              </div>
            ))}
            {addedTemplates.length > 6 && (
              <div className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground">
                +{addedTemplates.length - 6} more
              </div>
            )}
          </div>
        )}

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

        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
