"use client";

import { formatCurrency } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { APPLY_LINKS } from "@/lib/constants/affiliate-links";
import { type CardAnalysis } from "./keep-or-cancel-page";

export function AlternativeCard({
  analysis,
  isPremium,
}: {
  analysis: CardAnalysis;
  isPremium: boolean;
}) {
  const { bestAlternative, allAlternatives, netValue } = analysis;

  if (!bestAlternative) return null;

  const advantage = netValue - bestAlternative.rewardsValue;

  return (
    <div className="border-t border-border/60 px-4 sm:px-5 py-4 space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <ArrowRight className="w-3 h-3" />
        Best No-Fee Alternative{isPremium && "s"}
      </h4>

      {/* Best alternative — always visible */}
      <AlternativeRow
        name={bestAlternative.template.name}
        issuer={bestAlternative.template.issuer}
        color={bestAlternative.template.color}
        rewardsValue={bestAlternative.rewardsValue}
        rewardUnit={bestAlternative.template.reward_unit}
        advantage={advantage}
        rank={1}
      />

      {analysis.rewardsValue === 0 && (
        <p className="text-[10px] text-muted-foreground italic -mt-1">
          Based on benefits only — enter monthly spending above for full comparison
        </p>
      )}

      {/* Additional alternatives — premium only */}
      {isPremium ? (
        allAlternatives.slice(1).map((alt, i) => (
          <AlternativeRow
            key={alt.template.id}
            name={alt.template.name}
            issuer={alt.template.issuer}
            color={alt.template.color}
            rewardsValue={alt.rewardsValue}
            rewardUnit={alt.template.reward_unit}
            advantage={netValue - alt.rewardsValue}
            rank={i + 2}
          />
        ))
      ) : allAlternatives.length > 1 ? (
        <div className="relative">
          <div className="absolute inset-0 backdrop-blur-[6px] bg-background/60 z-10 rounded-xl flex flex-col items-center justify-center gap-1.5">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium">+{allAlternatives.length - 1} more with Premium</p>
          </div>
          <div className="opacity-20 pointer-events-none space-y-2">
            <div className="h-12 bg-muted rounded-xl" />
            <div className="h-12 bg-muted rounded-xl" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AlternativeRow({
  name,
  issuer,
  color,
  rewardsValue,
  rewardUnit,
  advantage,
  rank,
}: {
  name: string;
  issuer: string;
  color: string | null;
  rewardsValue: number;
  rewardUnit: string;
  advantage: number;
  rank: number;
}) {
  const applyLink = APPLY_LINKS[name];

  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-5 rounded flex-shrink-0"
          style={{ backgroundColor: color ?? "#6b7280" }}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-[10px] text-muted-foreground">{issuer} &middot; $0/yr &middot; {rewardUnit}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <div className="text-right">
          <p className="text-sm font-bold">{formatCurrency(rewardsValue)}</p>
          <p className={`text-[10px] font-medium ${advantage >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {advantage >= 0 ? "You're ahead by " : "You'd save "}
            {formatCurrency(Math.abs(advantage))}
          </p>
        </div>
        {applyLink && (
          <a
            href={applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
            title="Apply"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        )}
      </div>
    </div>
  );
}
