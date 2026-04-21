"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, StatementCredit } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { Button } from "@/components/ui/button";
import { Clock, Wand2, X, Gift, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { format, endOfMonth, differenceInDays } from "date-fns";
import { seedCreditsFromTemplate } from "@/lib/utils/seed-credits";
import Link from "next/link";

type Filter = "all" | "unused" | "expiring" | "used";
type CreditWithCard = StatementCredit & { card: UserCard };
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

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
  const shouldReduceMotion = useReducedMotion();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [credits, setCredits] = useState<StatementCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [drawerCredit, setDrawerCredit] = useState<CreditWithCard | null>(null);
  const [drawerValue, setDrawerValue] = useState<string>("0");
  const [seeding, setSeeding] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: userCards }, { data: statementCredits }] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order")
        .limit(100),
      supabase
        .from("statement_credits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at")
        .limit(500),
    ]);
    setCards((userCards as UserCard[]) ?? []);
    setCredits((statementCredits as StatementCredit[]) ?? []);
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

  const totalCreditsValue = creditsWithCard.reduce((s, c) => s + c.annual_amount, 0);
  const totalRemaining = creditsWithCard.reduce((s, c) => s + Math.max(c.annual_amount - c.used_amount, 0), 0);

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
  }).sort((a, b) => {
    // Fully used go last
    const aUsed = a.used_amount >= a.annual_amount;
    const bUsed = b.used_amount >= b.annual_amount;
    if (aUsed !== bUsed) return aUsed ? 1 : -1;
    // Expiring soonest first
    return getDaysUntilReset(a.reset_month) - getDaysUntilReset(b.reset_month);
  });

  const seedableCards = cards.filter((card) =>
    !!card.card_template_id && !credits.some((c) => c.user_card_id === card.id)
  );

  const currentMonth = new Date().getMonth() + 1;
  const thisMonthCredits = creditsWithCard.filter((c) => c.reset_month === currentMonth);
  const thisMonthPotential = thisMonthCredits.reduce((s, c) => s + c.annual_amount, 0);
  const thisMonthUsed = thisMonthCredits.reduce((s, c) => s + c.used_amount, 0);
  const thisMonthPct = thisMonthPotential > 0 ? (thisMonthUsed / thisMonthPotential) * 100 : 0;
  const resettableCredits = creditsWithCard.filter(
    (c) => inferCadence(c.name) === "Monthly" && c.reset_month === currentMonth && c.used_amount > 0
  );

  async function bulkReset() {
    const ids = resettableCredits.map((c) => c.id);
    try {
      await supabase.from("statement_credits").update({ used_amount: 0 }).in("id", ids);
      setCredits((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, used_amount: 0 } : c)));
      toast.success(`Reset ${ids.length} monthly credit${ids.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to reset credits");
    }
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-52 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-3 animate-[fade-in_0.25s_ease_both] sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-4xl">Benefits</h1>
          {creditsWithCard.length > 0 ? (
            <p className="text-muted-foreground text-base mt-1.5">
              <span className="text-foreground font-semibold">{formatCurrency(totalRemaining)}</span> remaining of {formatCurrency(totalCreditsValue)}
            </p>
          ) : (
            <p className="text-muted-foreground text-base mt-1.5">Track statement credits before they expire</p>
          )}
        </div>
        {resettableCredits.length > 0 && (
          <Button variant="outline" size="sm" onClick={bulkReset} className="h-10 w-full gap-1.5 sm:w-auto sm:flex-shrink-0">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset {resettableCredits.length} monthly
          </Button>
        )}
      </div>

      {/* This month's progress */}
      {thisMonthPotential > 0 && (
        <div className="rounded-2xl bg-card border border-border/60 px-4 py-4">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <span className="text-sm font-semibold">This month</span>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">${fmt(thisMonthUsed)}</span> / ${fmt(thisMonthPotential)}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700 motion-safe:animate-[grow-width_0.8s_ease-out_0.2s_both]", thisMonthPct >= 100 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : thisMonthPct >= 70 ? "bg-gradient-to-r from-amber-400 to-amber-300" : "bg-gradient-to-r from-primary to-primary/70")}
              style={{ width: `${Math.min(thisMonthPct, 100)}%` }}
            />
          </div>
          {thisMonthPct >= 100 && (
            <p className="text-[10px] text-emerald-400 mt-1.5 font-medium">All monthly credits used</p>
          )}
        </div>
      )}

      {/* Seed banner */}
      {seedableCards.length > 0 && (
        <div className="rounded-2xl bg-primary/[0.07] border border-primary/20 p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug">
              {seedableCards.length === 1
                ? `${getCardName(seedableCards[0])} has known credits`
                : `${seedableCards.length} cards have known credits`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Auto-populate statement credits for your cards.</p>
          </div>
          <Button size="sm" onClick={seedAll} disabled={seeding} className="h-11 w-full flex-shrink-0 gap-1.5 sm:w-auto">
            <Wand2 className="w-3.5 h-3.5" />
            {seeding ? "Adding..." : "Auto-populate"}
          </Button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="-mx-6 overflow-x-auto px-6 scrollbar-hide sm:mx-0 sm:px-0">
        <div className="flex w-max items-center gap-2">
        {(["all", "unused", "expiring", "used"] as Filter[]).map((f) => {
          const labels: Record<Filter, string> = { all: "All", unused: "Unused", expiring: "Expiring", used: "Used" };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-all",
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
      </div>

      {/* Card filter chips */}
      {cards.length > 1 && (
        <div className="-mx-6 overflow-x-auto px-6 scrollbar-hide sm:mx-0 sm:px-0">
        <div className="flex w-max items-center gap-2">
          <button
            onClick={() => setCardFilter(null)}
            className={cn(
              "min-h-9 whitespace-nowrap px-3 rounded-full text-xs font-medium border transition-all",
              !cardFilter ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            All Cards
          </button>
          {cards.map((card) => {
            const color = getCardColor(card);
            const name = getCardName(card);
            const isActive = cardFilter === card.id;
            const cardTotal = creditsWithCard
              .filter((c) => c.user_card_id === card.id)
              .reduce((s, c) => s + c.annual_amount, 0);
            return (
              <button
                key={card.id}
                onClick={() => setCardFilter(isActive ? null : card.id)}
                className={cn(
                  "flex min-h-9 max-w-[240px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-all",
                  isActive ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate">{name}</span>
                {cardTotal > 0 && (
                  <span className={cn("flex-shrink-0 opacity-60", isActive ? "" : "text-muted-foreground")}>
                    ${fmt(cardTotal)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>
      )}

      {/* Empty state */}
      {credits.length === 0 && seedableCards.length === 0 && (
        <div className="text-center px-6 py-14 border border-dashed border-border rounded-2xl">
          <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No credits tracked yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
            Add cards to your wallet, then track statement credits here.
          </p>
          {cards.length === 0 && (
            <Link href="/wallet">
              <Button size="sm" className="h-10 gap-1.5">
                Add Cards
              </Button>
            </Link>
          )}
        </div>
      )}

      {filtered.length === 0 && credits.length > 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">No benefits match this filter</p>
        </div>
      )}

      {/* Benefit cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((credit) => {
          const status = getCreditStatus(credit);
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

          return (
            <div
              key={credit.id}
              className={cn(
                "rounded-2xl border p-4 flex flex-col gap-3 transition-all shadow-sm shadow-black/10",
                status === "used"
                  ? "bg-card/40 border-border/40"
                  : status === "expiring"
                  ? "bg-card border-amber-500/35"
                  : "bg-card border-border"
              )}
            >
              {/* Title + Amount */}
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-base leading-snug flex-1 line-clamp-2">{credit.name}</p>
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    "text-2xl font-bold leading-none",
                    status === "used" ? "line-through text-muted-foreground" : "text-amber-400"
                  )}>
                    ${fmt(remaining)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                    of ${fmt(credit.annual_amount)}
                  </p>
                </div>
              </div>

              {/* Card + expiry */}
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cardColor }} />
                  <span className="truncate">{cardName}</span>
                </div>
                <p className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {expiresDate}
                </p>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 motion-safe:animate-[grow-width_0.8s_ease-out_0.2s_both]", pct >= 100 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : pct >= 70 ? "bg-gradient-to-r from-amber-400 to-amber-300" : "bg-gradient-to-r from-primary to-primary/70")}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Status + actions */}
              <div className="flex items-center justify-between gap-3 mt-auto">
                <div className="flex min-w-0 items-center gap-1.5">
                  {status === "used" ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/20">Used</span>
                  ) : status === "expiring" ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 font-medium border border-amber-500/20">{days}d left</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium border border-border">Available</span>
                  )}
                  <span className={cn("hidden text-xs px-2 py-1 rounded-full font-medium border min-[390px]:inline", CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other)}>
                    {category}
                  </span>
                  <span className="hidden text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border sm:inline">
                    {cadence}
                  </span>
                </div>
                {status === "used" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 flex-shrink-0 px-3 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => updateUsed(credit.id, 0)}
                  >
                    Reset
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-9 flex-shrink-0 px-3 text-xs"
                    onClick={() => {
                      setDrawerCredit(drawerCredit?.id === credit.id ? null : credit);
                      setDrawerValue(credit.used_amount.toFixed(0));
                    }}
                  >
                    {drawerCredit?.id === credit.id ? "Cancel" : "Log"}
                  </Button>
                )}
              </div>

              {/* Inline expand */}
              <AnimatePresence>
              {drawerCredit?.id === credit.id && (
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0.01 : 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                  {/* Quick amounts */}
                  {(() => {
                    const total = credit.annual_amount;
                    const cad = inferCadence(credit.name);
                    let suggestions: { label: string; value: number }[] = [];
                    if (cad === "Monthly") {
                      const m = credit.name.match(/\$(\d+)\/mo/i);
                      const monthly = m ? parseInt(m[1]) : Math.round(total / 12);
                      suggestions = [
                        { label: `$${Math.round(monthly * 0.5)}`, value: Math.round(monthly * 0.5) },
                        { label: `$${monthly} Full`, value: monthly },
                      ].filter((s) => s.value > 0 && s.value <= total);
                    } else if (cad === "Semi-Annual") {
                      const half = Math.round(total / 2);
                      suggestions = [
                        { label: `$${half} Half`, value: half },
                        { label: `$${total} Full`, value: total },
                      ];
                    } else if (cad === "Quarterly") {
                      const q = Math.round(total / 4);
                      suggestions = [
                        { label: `$${Math.round(q * 0.5)}`, value: Math.round(q * 0.5) },
                        { label: `$${q} Full`, value: q },
                      ].filter((s) => s.value > 0);
                    } else {
                      suggestions = [
                        { label: `$${Math.round(total * 0.25)}`, value: Math.round(total * 0.25) },
                        { label: `$${Math.round(total * 0.5)}`, value: Math.round(total * 0.5) },
                        { label: `$${Math.round(total * 0.75)}`, value: Math.round(total * 0.75) },
                        { label: `$${total} Full`, value: total },
                      ].filter((s) => s.value > 0);
                    }
                    const unique = suggestions.filter((s, i, arr) => arr.findIndex((x) => x.value === s.value) === i);
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        {unique.map((s) => {
                          const isSel = drawerValue === s.value.toFixed(0);
                          return (
                            <button
                              key={s.value}
                              onClick={() => setDrawerValue(s.value.toFixed(0))}
                              className={cn(
                                "min-h-10 rounded-xl border px-3 text-sm font-medium transition-all",
                                isSel
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted/40 border-border text-foreground hover:bg-muted"
                              )}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Exact amount input */}
                  <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-3 bg-muted/20">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.]*"
                      value={drawerValue === "0" ? "" : drawerValue}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        setDrawerValue(val || "0");
                      }}
                      placeholder="Enter amount"
                      className="flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Confirm + Cancel */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-11 text-sm font-semibold"
                      onClick={() => {
                        updateUsed(credit.id, parseFloat(drawerValue) || 0);
                        setDrawerCredit(null);
                      }}
                    >
                      Save ${parseFloat(drawerValue) || 0}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 px-3"
                      onClick={() => setDrawerCredit(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
