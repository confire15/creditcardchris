"use client";

import { useEffect, useState } from "react";
import { SpendingCategory, SpendChallenge, UserCard } from "@/lib/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PremiumGate } from "@/components/premium/premium-gate";
import { AddChallengeDialog } from "./add-challenge-dialog";
import { ChallengeCard } from "./challenge-card";

export function ChallengesList({
  isPremium,
  cards,
  categories,
  ownerLabels,
}: {
  isPremium: boolean;
  cards: UserCard[];
  categories: SpendingCategory[];
  ownerLabels?: Record<string, string>;
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
      <PageHeader
        className="mb-0"
        title="Challenges"
        actions={isPremium ? <Button onClick={() => setOpen(true)}>Add challenge</Button> : null}
      />

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
          <EmptyState
            title="No spending goals yet"
            description="A challenge tracks progress toward a spending target — like &ldquo;spend $4,000 in 3 months to earn a welcome bonus.&rdquo;"
            action={isPremium ? <Button variant="outline" onClick={() => setOpen(true)}>Add your first challenge</Button> : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} ownerLabel={ownerLabels?.[challenge.user_id]} />
            ))}
          </div>
        )}
      </PremiumGate>

      <AddChallengeDialog open={open} onOpenChange={setOpen} cards={cards} categories={categories} onSaved={fetchChallenges} />
    </div>
  );
}
