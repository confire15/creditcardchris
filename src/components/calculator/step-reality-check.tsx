"use client";

import { Button } from "@/components/ui/button";
import { MousePointerClick } from "lucide-react";
import { CardMockup } from "./card-mockup";
import { CreditToggle } from "./credit-toggle";
import type { PremiumCard } from "./premium-cards";
import type { CreditUtilization } from "./calculator-types";

type StepRealityCheckProps = {
  card: PremiumCard;
  creditUtilization: CreditUtilization;
  onSetCreditUtilization: (creditId: string, value: number) => void;
  onContinue: () => void;
};

export function StepRealityCheck({
  card,
  creditUtilization,
  onSetCreditUtilization,
  onContinue,
}: StepRealityCheckProps) {
  return (
    <div className="space-y-3">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
          Step 4 · Reality check
        </p>
        <h2 className="text-2xl sm:text-3xl font-heading leading-tight">
          The {card.shortName} comes with these credits.
        </h2>
        <p className="text-sm text-muted-foreground">
          Be honest about which ones you&apos;d actually use.
        </p>
      </header>

      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.08] px-3 py-2 text-primary">
        <MousePointerClick className="h-4 w-4 shrink-0" />
        <p className="text-xs font-medium leading-snug">
          Tap each credit below to mark what you&apos;ll actually use.
        </p>
      </div>

      <div className="mx-auto w-40 sm:w-56">
        <CardMockup card={card} size="md" />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em]">
          Tap credits to set usage
        </h3>
        <div className="space-y-2.5">
          {card.credits.map((credit) => (
            <CreditToggle
              key={credit.id}
              credit={credit}
              utilization={creditUtilization[credit.id]}
              onChange={(value) => onSetCreditUtilization(credit.id, value)}
            />
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Button size="lg" onClick={onContinue} className="w-full">
          See the real number
        </Button>
      </div>
    </div>
  );
}
