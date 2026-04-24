"use client";

import Link from "next/link";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { CalendarClock, Lock } from "lucide-react";
import { UserCard } from "@/lib/types/database";

type FeeEvent = {
  cardId: string;
  cardName: string;
  dueDate: Date;
  fee: number;
};

function getNextFeeDate(annualFeeDate: string): Date {
  const today = new Date();
  let next = parseISO(annualFeeDate);
  while (next < today) {
    next = new Date(next.getFullYear() + 1, next.getMonth(), next.getDate());
  }
  return next;
}

function fmt(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function AnnualFeeCalendar({
  cards,
  isPremium,
}: {
  cards: UserCard[];
  isPremium: boolean;
}) {
  const now = new Date();
  const horizon = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  const events: FeeEvent[] = cards
    .map((card) => {
      const fee = card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0;
      if (fee <= 0 || !card.annual_fee_date) return null;
      const dueDate = getNextFeeDate(card.annual_fee_date);
      if (isBefore(dueDate, now) || isAfter(dueDate, horizon)) return null;
      return {
        cardId: card.id,
        cardName: card.nickname || card.custom_name || card.card_template?.name || "Card",
        dueDate,
        fee,
      };
    })
    .filter((event): event is FeeEvent => event !== null)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const monthGroups: { month: string; total: number; runningTotal: number; events: FeeEvent[] }[] = [];
  let running = 0;
  for (const event of events) {
    const month = format(event.dueDate, "MMM yyyy");
    const existing = monthGroups.find((group) => group.month === month);
    running += event.fee;
    if (existing) {
      existing.events.push(event);
      existing.total += event.fee;
      existing.runningTotal = running;
    } else {
      monthGroups.push({ month, total: event.fee, runningTotal: running, events: [event] });
    }
  }

  return (
    <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-primary font-semibold">Premium</p>
          <h3 className="text-lg font-semibold leading-tight">Annual Fee Renewal Calendar</h3>
        </div>
        <CalendarClock className="w-4 h-4 text-muted-foreground" />
      </div>

      {isPremium ? (
        monthGroups.length > 0 ? (
          <div className="space-y-3">
            {monthGroups.map((group) => (
              <div key={group.month} className="rounded-xl bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold">{group.month}</p>
                  <p className="text-muted-foreground">
                    ${fmt(group.total)} · Running ${fmt(group.runningTotal)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {group.events.map((event) => (
                    <div
                      key={`${event.cardId}-${event.dueDate.toISOString()}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <p className="truncate pr-3">{event.cardName}</p>
                      <p className="text-muted-foreground shrink-0">
                        {format(event.dueDate, "MMM d")} · ${fmt(event.fee)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set renewal dates on your fee cards to see the 12-month calendar.
          </p>
        )
      ) : (
        <div className="relative">
          <div className="absolute inset-0 backdrop-blur-[6px] bg-background/60 z-10 rounded-xl flex flex-col items-center justify-center gap-1.5">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium">12-month fee calendar with Premium</p>
            <Link href="/settings" className="text-xs text-primary hover:underline font-medium">
              Upgrade for $3.99/mo
            </Link>
          </div>
          <div className="opacity-20 pointer-events-none space-y-2">
            <div className="h-16 bg-muted rounded-xl" />
            <div className="h-16 bg-muted rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}

