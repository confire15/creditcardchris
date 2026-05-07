"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleDollarSign, CreditCard, Gauge } from "lucide-react";
import type { DashboardSectionProps } from "@/lib/types/dashboard";
import { buildWalletInsights } from "@/lib/utils/card-analysis";
import { formatCurrency } from "@/lib/utils/format";
import { PremiumGate } from "@/components/premium/premium-gate";

type Props = DashboardSectionProps & { isPremium: boolean };

export function WalletRoiAutopilot({ cards, credits, perks, categories, globalSpend, isPremium }: Props) {
  const insights = buildWalletInsights({ cards, credits, perks, categories, globalSpend });
  const topLeak = insights.topMoneyLeaks[0] ?? "No major leaks detected";
  const renewal = insights.renewalWarnings[0];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm shadow-black/10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Gauge className="h-4 w-4 text-primary" />
            Wallet ROI Autopilot
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Premium value check across fees, credits, perks, and rewards.</p>
        </div>
        <Link href="/keep-or-cancel" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Open Keep or Cancel">
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <PremiumGate
        isPremium={isPremium}
        label="Unlock ROI Autopilot with Premium"
        preview={<div className="grid grid-cols-3 gap-2"><div className="h-20 rounded-xl bg-muted/40" /><div className="h-20 rounded-xl bg-muted/40" /><div className="h-20 rounded-xl bg-muted/40" /></div>}
        className="min-h-[148px]"
      >
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <p className="text-[11px] text-muted-foreground">Net value</p>
            <p className={insights.netValue >= 0 ? "mt-1 text-xl font-bold text-emerald-400" : "mt-1 text-xl font-bold text-red-400"}>
              {formatCurrency(insights.netValue)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <p className="text-[11px] text-muted-foreground">Credit capture</p>
            <p className="mt-1 text-xl font-bold">{insights.creditCaptureRate}%</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <p className="text-[11px] text-muted-foreground">Cancel candidates</p>
            <p className="mt-1 text-xl font-bold text-amber-400">{insights.cancelCandidates.length}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link href="/benefits" className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 hover:bg-muted/40">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
            <div className="min-w-0">
              <p className="text-xs font-semibold">Top money leak</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{topLeak}</p>
            </div>
          </Link>
          <Link href="/keep-or-cancel" className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 hover:bg-muted/40">
            {renewal ? <CreditCard className="mt-0.5 h-4 w-4 text-blue-400" /> : <CircleDollarSign className="mt-0.5 h-4 w-4 text-emerald-400" />}
            <div className="min-w-0">
              <p className="text-xs font-semibold">{renewal ? "Next renewal" : "Fees tracked"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {renewal
                  ? `${renewal.card.nickname || renewal.card.card_template?.name || "Card"} in ${renewal.renewalDaysUntil}d`
                  : `${formatCurrency(insights.totalAnnualFees)} in annual fees`}
              </p>
            </div>
          </Link>
        </div>
      </PremiumGate>
    </div>
  );
}
