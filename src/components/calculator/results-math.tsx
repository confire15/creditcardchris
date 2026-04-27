import type { CalculatorState } from "./calculator-types";
import type { PremiumCard } from "./premium-cards";
import { formatCurrency } from "@/lib/utils/format";

export type CreditLine = {
  id: string;
  name: string;
  amount: number;
  utilization: number;
  applied: number;
};

export type EafBreakdown = {
  annualFee: number;
  creditLines: CreditLine[];
  creditTotal: number;
  rewardsValue: number;
  eaf: number;
  isProfit: boolean;
};

export function computeEaf(
  state: CalculatorState,
  card: PremiumCard,
): EafBreakdown {
  const cpp = state.pointValuation ?? 0.01;
  const mult = state.spendMultiplier;
  const { dining, travel, groceries, hotels, gas, transit } = state.monthlySpend;
  const r = card.rates;

  // Weighted monthly = raw spend × the card's category multiplier, summed.
  // travel is interpreted as flights for the rate lookup (per plan).
  // Optional categories (hotels/gas/transit) only contribute if the card defines a rate.
  const weightedMonthly =
    dining * r.dining +
    travel * r.travel +
    groceries * r.groceries +
    hotels * (r.hotels ?? 0) +
    gas * (r.gas ?? 0) +
    transit * (r.transit ?? 0);
  const rewardsValue = weightedMonthly * mult * 12 * cpp;

  const creditLines: CreditLine[] = card.credits.map((credit) => {
    const utilization = state.creditUtilization[credit.id] ?? 0;
    return {
      id: credit.id,
      name: credit.name,
      amount: credit.amount,
      utilization,
      applied: credit.amount * utilization,
    };
  });
  const creditTotal = creditLines.reduce((s, l) => s + l.applied, 0);

  const eaf = card.annualFee - creditTotal - rewardsValue;

  return {
    annualFee: card.annualFee,
    creditLines,
    creditTotal,
    rewardsValue,
    eaf,
    isProfit: eaf < 0,
  };
}

type ResultsMathProps = {
  breakdown: EafBreakdown;
};

export function ResultsMath({ breakdown }: ResultsMathProps) {
  const { annualFee, creditLines, rewardsValue } = breakdown;
  const usedLines = creditLines.filter((l) => l.applied > 0);

  return (
    <ul className="space-y-2 text-sm" aria-label="EAF calculation breakdown">
      <li className="flex items-center justify-between">
        <span className="text-muted-foreground">Annual fee</span>
        <span className="font-mono tabular-nums">{formatCurrency(annualFee)}</span>
      </li>
      {usedLines.length === 0 ? (
        <li className="flex items-center justify-between">
          <span className="text-muted-foreground">− Credits used</span>
          <span className="font-mono tabular-nums text-muted-foreground">−$0</span>
        </li>
      ) : (
        usedLines.map((line) => (
          <li key={line.id} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground truncate">
              − {line.name}
              {line.utilization < 1 && (
                <span className="text-xs ml-1 opacity-70">
                  ({Math.round(line.utilization * 100)}%)
                </span>
              )}
            </span>
            <span className="font-mono tabular-nums text-emerald-400 shrink-0">
              −{formatCurrency(line.applied)}
            </span>
          </li>
        ))
      )}
      <li className="flex items-center justify-between">
        <span className="text-muted-foreground">− Rewards value</span>
        <span className="font-mono tabular-nums text-emerald-400">
          −{formatCurrency(rewardsValue)}
        </span>
      </li>
    </ul>
  );
}
