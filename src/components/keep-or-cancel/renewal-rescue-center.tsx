"use client";

import { useEffect, useMemo, useState } from "react";
import { CardRenewalReview } from "@/lib/types/database";
import { type CardAnalysis } from "@/lib/utils/card-analysis";
import { getCardName } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { PremiumGate } from "@/components/premium/premium-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock, PhoneCall } from "lucide-react";
import { addDays, differenceInDays, format, parseISO } from "date-fns";
import { toast } from "sonner";

export function RenewalRescueCenter({
  isPremium,
  analyses,
}: {
  isPremium: boolean;
  analyses: CardAnalysis[];
}) {
  const [reviews, setReviews] = useState<CardRenewalReview[]>([]);
  const [savingCardId, setSavingCardId] = useState<string | null>(null);
  const upcoming = useMemo(
    () =>
      analyses
        .filter((analysis) => analysis.card.annual_fee_date)
        .map((analysis) => ({
          analysis,
          days: differenceInDays(parseISO(analysis.card.annual_fee_date!), new Date()),
          review: reviews.find((review) => review.user_card_id === analysis.card.id) ?? null,
        }))
        .filter((item) => item.days >= -30 && item.days <= 90)
        .sort((a, b) => a.days - b.days),
    [analyses, reviews],
  );

  async function loadReviews() {
    if (!isPremium) return;
    const res = await fetch("/api/renewals/reviews");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setReviews(data.reviews ?? []);
  }

  useEffect(() => {
    void loadReviews();
  }, [isPremium]);

  async function quickSave(analysis: CardAnalysis, decision: string) {
    const posted = analysis.card.annual_fee_date ?? new Date().toISOString().slice(0, 10);
    setSavingCardId(analysis.card.id);
    const res = await fetch("/api/renewals/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userCardId: analysis.card.id,
        annualFeePostedOn: posted,
        refundDeadline: format(addDays(parseISO(posted), 30), "yyyy-MM-dd"),
        retentionOfferValue: reviews.find((review) => review.user_card_id === analysis.card.id)?.retention_offer_value ?? 0,
        decision,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(data.error ?? "Failed to save renewal review");
    else {
      toast.success("Renewal review saved");
      void loadReviews();
    }
    setSavingCardId(null);
  }

  async function saveRetention(analysis: CardAnalysis, value: string) {
    const current = reviews.find((review) => review.user_card_id === analysis.card.id);
    const posted = current?.annual_fee_posted_on ?? analysis.card.annual_fee_date ?? new Date().toISOString().slice(0, 10);
    const res = await fetch("/api/renewals/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userCardId: analysis.card.id,
        annualFeePostedOn: posted,
        refundDeadline: current?.refund_deadline ?? format(addDays(parseISO(posted), 30), "yyyy-MM-dd"),
        retentionOfferValue: Number(value || 0),
        retentionOfferNotes: current?.retention_offer_notes,
        decision: current?.decision ?? "undecided",
      }),
    });
    if (res.ok) void loadReviews();
  }

  return (
    <div className="mb-6 rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-primary" />
            Renewal Rescue Center
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Annual fee timing, refund windows, retention value, and downgrade decisions.</p>
        </div>
      </div>

      <PremiumGate isPremium={isPremium} label="Unlock renewal rescue with Premium" preview={<div className="h-28 rounded-xl bg-muted/30" />}>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No renewal windows in the next 90 days.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 4).map(({ analysis, days, review }) => {
              const refundDeadline = review?.refund_deadline ? parseISO(review.refund_deadline) : analysis.card.annual_fee_date ? addDays(parseISO(analysis.card.annual_fee_date), 30) : null;
              const refundDays = refundDeadline ? differenceInDays(refundDeadline, new Date()) : null;
              return (
                <div key={analysis.card.id} className="rounded-xl border border-border bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{getCardName(analysis.card)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Fee {days >= 0 ? `in ${days}d` : `posted ${Math.abs(days)}d ago`} · {formatCurrency(analysis.annualFee)} · {analysis.verdict.replace("_", " ")}
                      </p>
                      {refundDeadline && (
                        <p className="mt-1 text-xs text-amber-400">Refund window: {format(refundDeadline, "MMM d")}{refundDays != null && refundDays >= 0 ? ` (${refundDays}d)` : ""}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {["keep", "downgrade", "cancel"].map((decision) => (
                        <Button key={decision} size="sm" variant="outline" className="h-8 px-2 text-xs capitalize" disabled={savingCardId === analysis.card.id} onClick={() => quickSave(analysis, decision)}>
                          {decision}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <PhoneCall className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="h-8 text-xs"
                      inputMode="decimal"
                      placeholder="Retention offer value"
                      defaultValue={review?.retention_offer_value ? String(review.retention_offer_value) : ""}
                      onBlur={(event) => saveRetention(analysis, event.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PremiumGate>
    </div>
  );
}
