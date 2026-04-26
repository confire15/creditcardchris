"use client";

import { SpendChallenge } from "@/lib/types/database";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ChallengeCard({
  challenge,
  ownerLabel,
}: {
  challenge: SpendChallenge & {
    user_card?: { nickname?: string | null; custom_name?: string | null; card_template?: { name?: string | null } | { name?: string | null }[] | null } | null;
    category?: { display_name?: string | null } | { display_name?: string | null }[] | null;
  };
  ownerLabel?: string;
}) {
  const pct = Math.min((challenge.current_spend / Math.max(challenge.target_spend, 1)) * 100, 100);
  const isMet = challenge.is_met;
  const card = Array.isArray(challenge.user_card) ? challenge.user_card[0] : challenge.user_card;
  const cardTemplate = Array.isArray(card?.card_template) ? card?.card_template[0] : card?.card_template;
  const category = Array.isArray(challenge.category) ? challenge.category[0] : challenge.category;

  return (
    <div className="rounded-2xl border border-overlay-subtle bg-card p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{challenge.title}</p>
        <div className="flex items-center gap-2">
          {ownerLabel ? <Badge variant="outline">{ownerLabel}</Badge> : null}
          <Badge variant={isMet ? "default" : "secondary"}>{isMet ? "Met" : "In progress"}</Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        ${(challenge.current_spend ?? 0).toLocaleString("en-US")} / ${challenge.target_spend.toLocaleString("en-US")} · ends {format(new Date(challenge.ends_on), "MMM d, yyyy")}
      </p>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", isMet ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {[card?.nickname || card?.custom_name || cardTemplate?.name, category?.display_name].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}
