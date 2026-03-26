"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, StatementCredit } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Clock, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, endOfMonth, differenceInDays } from "date-fns";
import { seedCreditsFromTemplate } from "@/lib/utils/seed-credits";

type Filter = "all" | "unused" | "expiring" | "used";
type CreditWithCard = StatementCredit & { card: UserCard };

function inferCadence(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("/mo") || n.includes("monthly") || n.includes("per month")) return "Monthly";
  if (n.includes("quarterly")) return "Quarterly";
  if (n.includes("semi-annual")) return "Semi-Annual";
  return "Annual";
}

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("dining") || n.includes("restaurant") || n.includes("food") || n.includes("grubhub") || n.includes("resy") || n.includes("dunkin")) return "Dining";
  if (n.includes("travel") || n.includes("airline") || n.includes("hotel") || n.includes("delta") || n.includes("hyatt") || n.includes("hilton") || n.includes("marriott") || n.includes("ihg") || n.includes("flight") || n.includes("united") || n.includes("resort")) return "Travel";
  if (n.includes("uber") || n.includes("lyft") || n.includes("transit")) return "Transit";
  if (n.includes("saks") || n.includes("shopping") || n.includes("lululemon")) return "Shopping";
  if (n.includes("entertainment") || n.includes("streaming") || n.includes("digital") || n.includes("disney") || n.includes("spotify") || n.includes("walmart") || n.includes("membership") || n.includes("adobe")) return "Subscription";
  if (n.includes("equinox") || n.includes("fitness") || n.includes("clear") || n.includes("oura") || n.includes("wellness") || n.includes("peloton") || n.includes("lifestyle")) return "Lifestyle";
  if (n.includes("dell") || n.includes("business") || n.includes("lounge")) return "Business";
  return "Other";
}

const CATEGORY_STYLES: Record<string, string> = {
  Dining: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Travel: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Transit: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  Shopping: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  Subscription: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Lifestyle: "bg-green-500/15 text-green-400 border-green-500/20",
  Business: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  Other: "bg-muted text-muted-foreground border-border",
};

function getDaysUntilReset(resetMonth: number): number {
  const now = new Date();
  const resetEnd = endOfMonth(new Date(now.getFullYear(), resetMonth - 1));
  return differenceInDays(resetEnd, now);
}

function getCreditStatus(credit: StatementCredit): "used" | "expiring" | "unused" {
  if (credit.used_amount >= credit.annual_amount) return "used";
  const days = getDaysUntilReset(credit.reset_month);
  if (days <= 7) return "expiring";
  return "unused";
}

export function BenefitsPage({ userId }: { userId: string }) {
  const supabase = createClient();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [credits, setCredits] = useState<StatementCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [seeding, setSeeding] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: userCards }, { data: statementCredits }] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("statement_credits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at"),
    ]);
    setCards((userCards as UserCard[]) ?? []);
    setCredits(statementCredits ?? []);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function updateUsed(creditId: string, newUsed: number) {
    const credit = credits.find((c) => c.id === creditId);
    if (!credit) return;
    const clamped = Math.min(Math.max(newUsed, 0), credit.annual_amount);
    try {
      await supabase.from("statement_credits").update({ used_amount: clamped }).eq("id", creditId);
      setCredits((prev) => prev.map((c) => (c.id === creditId ? { ...c, used_amount: clamped } : c)));
      if (clamped >= credit.annual_amount) toast.success("Credit fully used!");
    } catch {
      toast.error("Failed to update");
    }
  }

  const creditsWithCard: CreditWithCard[] = credits
    .map((c) => ({ ...c, card: cards.find((card) => card.id === c.user_card_id)! }))
    .filter((c) => c.card);

  const counts = {
    all: creditsWithCard.length,
    unused: creditsWithCard.filter((c) => c.used_amount < c.annual_amount).length,
    expiring: creditsWithCard.filter((c) => getCreditStatus(c) === "expiring").length,
    used: creditsWithCard.filter((c) => c.used_amount >= c.annual_amount).length,
  };

  const filtered = creditsWithCard.filter((c) => {
    if (cardFilter && c.user_card_id !== cardFilter) return false;
    if (filter === "used") return c.used_amount >= c.annual_amount;
    if (filter === "unused") return c.used_amount < c.annual_amount;
    if (filter === "expiring") return getCreditStatus(c) === "expiring";
    return true;
  });

  const seedableCards = cards.filter((card) =>
    !!card.card_template_id && !credits.some((c) => c.user_card_id === card.id)
  );

  async function seedAll() {
    setSeeding(true);
    try {
      let total = 0;
      for (const card of seedableCards) {
        if (!card.card_template_id) continue;
        total += await seedCreditsFromTemplate(supabase, card.id, userId, card.card_template_id);
      }
      if (total > 0) { toast.success(`Added ${total} credits`); fetchData(); }
      else toast.info("No known credits found for these cards");
    } catch {
      toast.error("Failed to seed credits");
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-52 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Benefits</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track and manage all your credit card benefits</p>
      </div>

      {/* Seed banner */}
      {seedableCards.length > 0 && (
        <div className="rounded-2xl bg-primary/[0.06] border border-primary/20 p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {seedableCards.length === 1
                ? `${getCardName(seedableCards[0])} has known credits`
                : `${seedableCards.length} cards have known credits`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-populate statement credits for your cards</p>
          </div>
          <Button size="sm" onClick={seedAll} disabled={seeding} className="flex-shrink-0 gap-1.5">
            <Wand2 className="w-3.5 h-3.5" />
            {seeding ? "Adding..." : "Auto-populate"}
          </Button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "unused", "expiring", "used"] as Filter[]).map((f) => {
          const labels: Record<Filter, string> = { all: "All", unused: "Unused", expiring: "Expiring Soon", used: "Used" };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >
              {labels[f]}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                filter === f ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Card filter chips */}
      {cards.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCardFilter(null)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              !cardFilter ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            All Cards
          </button>
          {cards.map((card) => {
            const color = getCardColor(card);
            const name = getCardName(card);
            const isActive = cardFilter === card.id;
            return (
              <button
                key={card.id}
                onClick={() => setCardFilter(isActive ? null : card.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  isActive ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {credits.length === 0 && seedableCards.length === 0 && (
        <div className="py-20 text-center">
          <p className="font-medium mb-1">No benefits tracked yet</p>
          <p className="text-muted-foreground text-sm">Add cards to your wallet to track statement credits.</p>
        </div>
      )}

      {filtered.length === 0 && credits.length > 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">No benefits match this filter</p>
        </div>
      )}

      {/* Benefit cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((credit) => {
          const status = getCreditStatus(credit);
          const isExpanded = expandedId === credit.id;
          const cadence = inferCadence(credit.name);
          const category = inferCategory(credit.name);
          const cardColor = getCardColor(credit.card);
          const cardName = getCardName(credit.card);
          const remaining = credit.annual_amount - credit.used_amount;
          const days = getDaysUntilReset(credit.reset_month);
          const expiresDate = format(
            endOfMonth(new Date(new Date().getFullYear(), credit.reset_month - 1)),
            "MMM d"
          );
          const pct = Math.min((credit.used_amount / credit.annual_amount) * 100, 100);
          const inputVal = inputValues[credit.id] ?? credit.used_amount.toFixed(0);

          return (
            <div
              key={credit.id}
              className={cn(
                "rounded-2xl border p-4 flex flex-col gap-3 transition-all",
                status === "used"
                  ? "bg-card/40 border-border/40"
                  : status === "expiring"
                  ? "bg-card border-amber-500/25"
                  : "bg-card border-border"
              )}
            >
              {/* Title + Amount */}
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-sm leading-snug flex-1">{credit.name}</p>
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    "text-lg font-bold leading-none",
                    status === "used" ? "line-through text-muted-foreground" : "text-amber-400"
                  )}>
                    ${remaining.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">left</p>
                </div>
              </div>

              {/* Status + Category + Cadence badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {status === "used" ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/20">Used</span>
                ) : status === "expiring" ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium border border-amber-500/20">{days}d left</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium border border-border">Available</span>
                )}
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other)}>
                  {category}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  {cadence}
                </span>
              </div>

              {/* Card name */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cardColor }} />
                {cardName}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-300", pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-primary/60")}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Expires + actions */}
              <div className="flex items-center justify-between gap-2 mt-auto">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires {expiresDate}
                </p>
                {status === "used" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => updateUsed(credit.id, 0)}
                  >
                    Undo
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setExpandedId(isExpanded ? null : credit.id)}
                  >
                    {isExpanded ? "Close" : "Log Usage"}
                  </Button>
                )}
              </div>

              {/* Expanded: Slider + Input */}
              {isExpanded && (
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[parseFloat(inputVal) || 0]}
                      min={0}
                      max={credit.annual_amount}
                      step={1}
                      onValueChange={([v]) =>
                        setInputValues((p) => ({ ...p, [credit.id]: v.toFixed(0) }))
                      }
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={inputVal}
                        onChange={(e) =>
                          setInputValues((p) => ({ ...p, [credit.id]: e.target.value }))
                        }
                        className="h-7 w-16 text-xs px-2"
                        min={0}
                        max={credit.annual_amount}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                      updateUsed(credit.id, parseFloat(inputVal) || 0);
                      setExpandedId(null);
                    }}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
