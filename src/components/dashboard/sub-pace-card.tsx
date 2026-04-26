"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type AtRiskSub = {
  id: string;
  cardName: string;
  ownerLabel?: string | null;
  current_spend: number;
  required_spend: number;
  daysLeft: number;
  perDay: number;
};

export function SubPaceCard({ isPremium }: { isPremium: boolean }) {
  const [sub, setSub] = useState<AtRiskSub | null>(null);

  useEffect(() => {
    if (!isPremium) return;
    fetch("/api/subs/at-risk")
      .then((res) => res.json())
      .then((data) => setSub(data?.sub ?? null))
      .catch(() => {});
  }, [isPremium]);

  if (!isPremium || !sub) return null;

  return (
    <div className="rounded-2xl border border-overlay-subtle bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">SUB pace</p>
      <p className="text-sm font-medium">
        {sub.cardName}
        {sub.ownerLabel ? ` (${sub.ownerLabel})` : ""}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        ${sub.current_spend.toLocaleString("en-US")} / ${sub.required_spend.toLocaleString("en-US")} · {sub.daysLeft} days left · need ${Math.ceil(sub.perDay).toLocaleString("en-US")}/day
      </p>
      <Link href="/wallet" className="inline-block mt-3">
        <Button size="sm" variant="outline">Open wallet</Button>
      </Link>
    </div>
  );
}
