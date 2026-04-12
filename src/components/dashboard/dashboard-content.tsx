"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, StatementCredit } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Scale,
  Gift,
  Clock,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { endOfMonth, differenceInDays, format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function inferCategory(name: string): { label: string; className: string } {
  const n = name.toLowerCase();
  if (
    n.includes("dining") || n.includes("food") || n.includes("restaurant") ||
    n.includes("grubhub") || n.includes("doordash") || n.includes("seamless") ||
    n.includes("cheesecake") || n.includes("goldbelly") || n.includes("resy")
  ) return { label: "Dining", className: "bg-emerald-500/15 text-emerald-400" };
  if (n.includes("travel") || n.includes("trip"))
    return { label: "Travel", className: "bg-blue-500/15 text-blue-400" };
  if (n.includes("uber") || n.includes("lyft") || n.includes("transit") || n.includes("ride"))
    return { label: "Transit", className: "bg-sky-500/15 text-sky-400" };
  if (
    n.includes("walmart") || n.includes("membership") ||
    n.includes("subscription") || n.includes("digital")
  ) return { label: "Subscription", className: "bg-purple-500/15 text-purple-400" };
  if (
    n.includes("airline") || n.includes("flight") || n.includes("delta") ||
    n.includes("united") || n.includes("southwest") || n.includes("american airlines")
  ) return { label: "Airline", className: "bg-indigo-500/15 text-indigo-400" };
  if (
    n.includes("hotel") || n.includes("resort") || n.includes("marriott") ||
    n.includes("hilton") || n.includes("hyatt")
  ) return { label: "Hotel", className: "bg-amber-500/15 text-amber-400" };
  if (
    n.includes("entertainment") || n.includes("streaming") || n.includes("netflix") ||
    n.includes("spotify") || n.includes("hulu") || n.includes("disney") ||
    n.includes("peacock") || n.includes("audible") || n.includes("nytimes")
  ) return { label: "Entertainment", className: "bg-pink-500/15 text-pink-400" };
  if (
    n.includes("clear") || n.includes("global entry") || n.includes("tsa") ||
    n.includes("lounge") || n.includes("priority pass")
  ) return { label: "Lifestyle", className: "bg-teal-500/15 text-teal-400" };
  if (n.includes("saks") || n.includes("shop") || n.includes("retail"))
    return { label: "Shopping", className: "bg-rose-500/15 text-rose-400" };
  if (n.includes("equinox") || n.includes("fitness") || n.includes("gym") || n.includes("wellness"))
    return { label: "Fitness", className: "bg-orange-500/15 text-orange-400" };
  return { label: "Credit", className: "bg-primary/15 text-primary" };
}

function inferCadence(name: string): "Monthly" | "Semi-Annual" | "Annual" {
  const n = name.toLowerCase();
  if (
    n.includes("monthly") || n.includes("/mo") ||
    n.includes("per month") || n.includes("each month")
  ) return "Monthly";
  if (
    n.includes("semi-annual") || n.includes("semi annual") ||
    n.includes("every six months") || n.includes("biannual") ||
    n.includes("twice a year")
  ) return "Semi-Annual";
  return "Annual";
}

type CreditWithCard = StatementCredit & { card: UserCard };


export function DashboardContent({ userId }: { userId: string }) {
  const supabase = createClient();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [credits, setCredits] = useState<StatementCredit[]>([]);


  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [{ data: userCards }, { data: statementCredits }] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*), rewards:user_card_rewards(*)")
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function updateUsed(creditId: string, newUsed: number) {
    const credit = credits.find((c) => c.id === creditId);
    if (!credit) return;
    const clamped = Math.min(Math.max(newUsed, 0), credit.annual_amount);
    try {
      const { error } = await supabase
        .from("statement_credits")
        .update({ used_amount: clamped })
        .eq("id", creditId);
      if (error) throw error;
      setCredits((prev) =>
        prev.map((c) => (c.id === creditId ? { ...c, used_amount: clamped } : c))
      );
      if (clamped >= credit.annual_amount) toast.success("Credit fully used!");
    } catch {
      toast.error("Failed to update");
    }
  }


  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  // ─── Computed Stats ───────────────────────────────────────────────────────
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const daysLeft = differenceInDays(endOfMonth(now), now) + 1;

  const totalPotential = credits.reduce((s, c) => s + c.annual_amount, 0);
  const totalUsed = credits.reduce((s, c) => s + c.used_amount, 0);
  const totalRemaining = totalPotential - totalUsed;

  const isSemiAnnualExpiry = currentMonth === 6 || currentMonth === 12;
  const expiringCredits: CreditWithCard[] = credits
    .filter((c) => {
      if (c.used_amount >= c.annual_amount) return false;
      const cadence = inferCadence(c.name);
      if (cadence === "Monthly") return c.reset_month === currentMonth;
      if (cadence === "Semi-Annual") return isSemiAnnualExpiry;
      return false;
    })
    .map((c) => ({ ...c, card: cards.find((card) => card.id === c.user_card_id)! }))
    .filter((c) => c.card);

  const expiringTotal = expiringCredits.reduce(
    (s, c) => s + (c.annual_amount - c.used_amount),
    0
  );

  const yearPct = totalPotential > 0 ? (totalUsed / totalPotential) * 100 : 0;

  // Upcoming renewals (annual_fee_date within 60 days)
  const upcomingRenewals = cards
    .filter((c) => (c.custom_annual_fee ?? c.card_template?.annual_fee ?? 0) > 0 && c.annual_fee_date)
    .map((c) => ({ card: c, days: differenceInDays(parseISO(c.annual_fee_date!), now) }))
    .filter(({ days }) => days >= 0 && days <= 60)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-10 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {cards.length} card{cards.length !== 1 ? "s" : ""}
          {totalPotential > 0 && ` · $${fmt(totalPotential)} in credits`}
        </p>
      </div>

      {/* ── Action nudges ─────────────────────────────────────────────── */}
      {(expiringCredits.length > 0 || upcomingRenewals.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {expiringCredits.length > 0 && (
            <Link href="/benefits" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 border-l-[3px] border-l-amber-400 text-xs text-amber-400 hover:bg-amber-500/15 transition-colors">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {expiringCredits.length} credit{expiringCredits.length > 1 ? "s" : ""} expiring · ${fmt(expiringTotal)}
            </Link>
          )}
          {upcomingRenewals.length > 0 && (
            <Link href="/keep-or-cancel" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 border-l-[3px] border-l-blue-400 text-xs text-blue-400 hover:bg-blue-500/15 transition-colors">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              {getCardName(upcomingRenewals[0].card)} fee in {upcomingRenewals[0].days}d
              {upcomingRenewals.length > 1 && ` +${upcomingRenewals.length - 1}`}
            </Link>
          )}
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { href: "/best-card", icon: Sparkles, label: "Best Card" },
          { href: "/benefits",  icon: Gift,     label: "Benefits" },
          { href: "/keep-or-cancel", icon: Scale, label: "Keep/Cancel" },
          { href: "/wallet",    icon: CreditCard, label: "Wallet" },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <div className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-card border border-border/60 hover:bg-muted/40 hover:border-primary/20 hover:shadow-sm active:scale-95 transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-primary/[0.08] flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground leading-none truncate max-w-full">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Savings Overview ───────────────────────────────────────────── */}
      {credits.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-border/60">
            <div className="px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Used</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-400">${fmt(totalUsed)}</p>
            </div>
            <div className="px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Remaining</p>
              <p className="text-lg sm:text-2xl font-bold text-orange-300">${fmt(totalRemaining)}</p>
            </div>
          </div>
          <div className="px-5 pb-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(yearPct, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-right">{yearPct.toFixed(0)}% of ${fmt(totalPotential)} used</p>
          </div>
        </div>
      )}

      {/* ── Expiring Soon ──────────────────────────────────────────────── */}
      {expiringCredits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Expiring Soon
            </h2>
            <span className="text-xs bg-amber-400/10 text-amber-400/80 px-2 py-0.5 rounded-full">
              {daysLeft}d left this month
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {expiringCredits.slice(0, 3).map((credit) => {
              const category = inferCategory(credit.name);
              const cadence = inferCadence(credit.name);
              const remaining = credit.annual_amount - credit.used_amount;
              const cardName = getCardName(credit.card);
              const cardColor = getCardColor(credit.card);
              const expiresDate = cadence === "Semi-Annual"
                ? format(endOfMonth(new Date(now.getFullYear(), currentMonth === 6 ? 5 : 11)), "MMM d")
                : format(endOfMonth(new Date(now.getFullYear(), credit.reset_month - 1)), "MMM d");
              return (
                <div key={credit.id} className="rounded-2xl bg-card border border-border/60 p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug truncate">{credit.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cardColor }} />
                        <span className="text-xs text-muted-foreground truncate">{cardName}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg sm:text-xl font-bold text-orange-300">${fmt(remaining)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground -mt-0.5">left</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium", category.className)}>
                        {category.label}
                      </span>
                      <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {cadence}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Exp {expiresDate}</p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 w-full text-xs gap-1"
                    onClick={() => {
                      const periodAmount = cadence === "Monthly"
                        ? credit.annual_amount / 12
                        : cadence === "Semi-Annual"
                        ? credit.annual_amount / 2
                        : credit.annual_amount;
                      updateUsed(credit.id, Math.min(credit.used_amount + periodAmount, credit.annual_amount));
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Mark Used
                  </Button>
                </div>
              );
            })}
          </div>
          {expiringCredits.length > 3 && (
            <Link href="/benefits" className="block text-center">
              <p className="text-xs text-primary font-medium hover:underline">
                See all {expiringCredits.length} expiring credits →
              </p>
            </Link>
          )}
        </section>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {cards.length > 0 && credits.length === 0 && (
        <div className="rounded-2xl bg-card border border-border/60 p-8 text-center">
          <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Set up your statement credits</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Track which annual credits you&apos;re actually using — and catch ones expiring before the month ends.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/benefits">
              <Button size="sm" className="gap-1.5 text-xs">
                <Gift className="w-3.5 h-3.5" />
                Set Up Benefits
              </Button>
            </Link>
            <Link href="/best-card">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Find Best Card
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── No cards state ───────────────────────────────────────────────── */}
      {cards.length === 0 && (
        <div className="rounded-2xl bg-card border border-border/60 p-8 text-center">
          <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Add your first card</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Add cards to your wallet to start tracking rewards and credits.
          </p>
          <Link href="/wallet">
            <Button size="sm" className="gap-1.5 text-xs">
              <CreditCard className="w-3.5 h-3.5" />
              Go to Wallet
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
