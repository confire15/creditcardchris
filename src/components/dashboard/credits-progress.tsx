"use client";

import { UserCard, StatementCredit } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { Gift, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { differenceInDays, endOfMonth, format } from "date-fns";

type Props = {
  cards: UserCard[];
  credits: StatementCredit[];
};

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function inferCadence(name: string): "Monthly" | "Semi-Annual" | "Annual" {
  const n = name.toLowerCase();
  if (n.includes("monthly") || n.includes("/mo") || n.includes("per month") || n.includes("each month")) return "Monthly";
  if (n.includes("semi-annual") || n.includes("semi annual") || n.includes("every six months") || n.includes("biannual") || n.includes("twice a year")) return "Semi-Annual";
  return "Annual";
}

function inferCategory(name: string): { label: string; className: string } {
  const n = name.toLowerCase();
  if (n.includes("dining") || n.includes("food") || n.includes("restaurant") || n.includes("grubhub") || n.includes("doordash") || n.includes("seamless") || n.includes("cheesecake") || n.includes("goldbelly") || n.includes("resy"))
    return { label: "Dining", className: "bg-emerald-500/15 text-emerald-400" };
  if (n.includes("travel") || n.includes("trip")) return { label: "Travel", className: "bg-blue-500/15 text-blue-400" };
  if (n.includes("uber") || n.includes("lyft") || n.includes("transit") || n.includes("ride")) return { label: "Transit", className: "bg-sky-500/15 text-sky-400" };
  if (n.includes("walmart") || n.includes("membership") || n.includes("subscription") || n.includes("digital")) return { label: "Subscription", className: "bg-purple-500/15 text-purple-400" };
  if (n.includes("airline") || n.includes("flight") || n.includes("delta") || n.includes("united") || n.includes("southwest") || n.includes("american airlines")) return { label: "Airline", className: "bg-indigo-500/15 text-indigo-400" };
  if (n.includes("hotel") || n.includes("resort") || n.includes("marriott") || n.includes("hilton") || n.includes("hyatt")) return { label: "Hotel", className: "bg-amber-500/15 text-amber-400" };
  if (n.includes("entertainment") || n.includes("streaming") || n.includes("netflix") || n.includes("spotify") || n.includes("hulu") || n.includes("disney") || n.includes("peacock") || n.includes("audible") || n.includes("nytimes")) return { label: "Entertainment", className: "bg-pink-500/15 text-pink-400" };
  if (n.includes("clear") || n.includes("global entry") || n.includes("tsa") || n.includes("lounge") || n.includes("priority pass")) return { label: "Lifestyle", className: "bg-teal-500/15 text-teal-400" };
  if (n.includes("saks") || n.includes("shop") || n.includes("retail")) return { label: "Shopping", className: "bg-rose-500/15 text-rose-400" };
  if (n.includes("equinox") || n.includes("fitness") || n.includes("gym") || n.includes("wellness")) return { label: "Fitness", className: "bg-orange-500/15 text-orange-400" };
  return { label: "Credit", className: "bg-primary/15 text-primary" };
}

type CreditWithMeta = StatementCredit & {
  card: UserCard;
  status: "attention" | "on_track" | "complete";
  cadence: "Monthly" | "Semi-Annual" | "Annual";
};

export function CreditsProgress({ cards, credits }: Props) {
  if (credits.length === 0) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const daysLeft = differenceInDays(endOfMonth(now), now) + 1;
  const isSemiAnnualExpiry = currentMonth === 6 || currentMonth === 12;

  const totalPotential = credits.reduce((s, c) => s + c.annual_amount, 0);
  const totalUsed = credits.reduce((s, c) => s + c.used_amount, 0);
  const yearPct = totalPotential > 0 ? (totalUsed / totalPotential) * 100 : 0;

  const enriched: CreditWithMeta[] = credits
    .map((c) => {
      const card = cards.find((card) => card.id === c.user_card_id);
      if (!card) return null;
      const cadence = inferCadence(c.name);
      const isComplete = c.used_amount >= c.annual_amount;
      const isExpiring =
        !isComplete &&
        ((cadence === "Monthly" && c.reset_month === currentMonth) ||
          (cadence === "Semi-Annual" && isSemiAnnualExpiry));
      const status: CreditWithMeta["status"] = isComplete
        ? "complete"
        : isExpiring
        ? "attention"
        : "on_track";
      return { ...c, card, status, cadence };
    })
    .filter((c): c is CreditWithMeta => c !== null);

  // Sort: attention first, then on_track, then complete
  const statusOrder = { attention: 0, on_track: 1, complete: 2 };
  const sorted = enriched.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  const displayed = sorted.slice(0, 5);
  const attentionCount = enriched.filter((c) => c.status === "attention").length;

  return (
    <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          Credits
          {attentionCount > 0 && (
            <span className="text-xs bg-amber-400/10 text-amber-400/80 px-2 py-0.5 rounded-full">
              {attentionCount} expiring · {daysLeft}d left
            </span>
          )}
        </h2>
        <Link href="/benefits" className="text-xs text-primary font-medium hover:underline">
          See all
        </Link>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">${fmt(totalUsed)}</span> of ${fmt(totalPotential)} used
          </span>
          <span className="text-[10px] text-muted-foreground">{yearPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700 animate-[grow-width_0.8s_ease-out_0.3s_both]"
            style={{ width: `${Math.min(yearPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Credit list */}
      <div className="divide-y divide-border/40">
        {displayed.map((credit) => {
          const remaining = credit.annual_amount - credit.used_amount;
          const category = inferCategory(credit.name);
          const cardColor = getCardColor(credit.card);
          const cardName = getCardName(credit.card);

          const StatusIcon =
            credit.status === "complete"
              ? CheckCircle2
              : credit.status === "attention"
              ? AlertTriangle
              : Clock;
          const statusColor =
            credit.status === "complete"
              ? "text-emerald-400"
              : credit.status === "attention"
              ? "text-amber-400"
              : "text-muted-foreground/60";

          return (
            <div key={credit.id} className="flex items-center gap-2.5 px-4 py-2.5">
              <StatusIcon className={cn("w-3.5 h-3.5 flex-shrink-0", statusColor)} />
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cardColor }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{credit.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{cardName}</p>
              </div>
              <span className={cn("flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium", category.className)}>
                {category.label}
              </span>
              {credit.status === "complete" ? (
                <span className="flex-shrink-0 text-[10px] text-emerald-400 font-medium">Done</span>
              ) : credit.status === "attention" ? (
                <Link
                  href="/benefits"
                  className="flex-shrink-0 h-6 px-2 text-[10px] gap-1 inline-flex items-center rounded-md bg-amber-400/15 text-amber-400 font-medium hover:bg-amber-400/25 transition-colors"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Log
                </Link>
              ) : (
                <span className="flex-shrink-0 text-xs font-semibold text-muted-foreground">${fmt(remaining)}</span>
              )}
            </div>
          );
        })}
      </div>

      {enriched.length > 5 && (
        <div className="px-4 py-2 border-t border-border/40">
          <Link href="/benefits" className="text-xs text-primary font-medium hover:underline">
            See all {enriched.length} credits
          </Link>
        </div>
      )}
    </div>
  );
}
