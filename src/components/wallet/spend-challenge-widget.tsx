"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumGate } from "@/components/premium/premium-gate";

type ChallengeSummary = {
  id: string;
  title: string;
  target_spend: number;
  current_spend: number;
  is_met: boolean;
};

export function SpendChallengeWidget({ isPremium }: { isPremium: boolean }) {
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);

  useEffect(() => {
    if (!isPremium) return;
    fetch("/api/challenges")
      .then((res) => res.json())
      .then((data) => setChallenges(data?.challenges ?? []))
      .catch(() => {});
  }, [isPremium]);

  const activeCount = challenges.filter((challenge) => !challenge.is_met).length;

  return (
    <PremiumGate
      isPremium={isPremium}
      label="Unlock spend challenges with Premium"
      preview={<div className="h-20 rounded-xl bg-muted" />}
    >
      <div className="rounded-2xl border border-overlay-subtle bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Spend Challenges</h3>
          </div>
          <Link href="/wallet/challenges">
            <Button size="sm" variant="outline">Open</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {activeCount > 0 ? `${activeCount} active challenge${activeCount === 1 ? "" : "s"}` : "No active challenges"}.
        </p>
      </div>
    </PremiumGate>
  );
}
