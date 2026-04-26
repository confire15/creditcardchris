"use client";

import { useEffect, useState } from "react";
import { SpendingCategory, SpendChallenge, UserCard } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { PremiumGate } from "@/components/premium/premium-gate";
import { AddChallengeDialog } from "./add-challenge-dialog";
import { ChallengeCard } from "./challenge-card";

export function ChallengesList({
  isPremium,
  cards,
  categories,
}: {
  isPremium: boolean;
  cards: UserCard[];
  categories: SpendingCategory[];
}) {
  const [challenges, setChallenges] = useState<SpendChallenge[]>([]);
  const [open, setOpen] = useState(false);

  const fetchChallenges = async () => {
    if (!isPremium) return;
    const res = await fetch("/api/challenges");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setChallenges(data?.challenges ?? []);
  };

  useEffect(() => {
    void fetchChallenges();
  }, [isPremium]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Challenges</h1>
        {isPremium && <Button onClick={() => setOpen(true)}>Add challenge</Button>}
      </div>

      <PremiumGate
        isPremium={isPremium}
        label="Track spend challenges with Premium"
        preview={
          <div className="grid gap-3">
            <div className="h-24 rounded-xl bg-muted" />
            <div className="h-24 rounded-xl bg-muted" />
          </div>
        }
      >
        {challenges.length === 0 ? (
          <div className="rounded-2xl border border-overlay-subtle bg-card p-6 text-sm text-muted-foreground">
            No challenges yet. Add one to track progress.
          </div>
        ) : (
          <div className="grid gap-3">
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}
      </PremiumGate>

      <AddChallengeDialog open={open} onOpenChange={setOpen} cards={cards} categories={categories} onSaved={fetchChallenges} />
    </div>
  );
}
