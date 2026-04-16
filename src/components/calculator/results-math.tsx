import { ANNUAL_FEE, EQUINOX_CREDIT, type CalculatorState } from "./calculator-types";
import { formatCurrency } from "@/lib/utils/format";

export type EafBreakdown = {
  annualFee: number;
  creditValue: number;
  rewardsValue: number;
  eaf: number;
  isProfit: boolean;
};

export function computeEaf(state: CalculatorState): EafBreakdown {
  const cpp = state.pointValuation ?? 0.01;
  const multiplier = state.spendMultiplier;
  const { dining, travel, groceries } = state.monthlySpend;
  const totalMonthly = (dining + travel + groceries) * multiplier;
  const rewardsValue = totalMonthly * 12 * cpp;
  const creditValue = EQUINOX_CREDIT * state.utilizationFactor;
  const eaf = ANNUAL_FEE - creditValue - rewardsValue;

  return {
    annualFee: ANNUAL_FEE,
    creditValue,
    rewardsValue,
    eaf,
    isProfit: eaf < 0,
  };
}

type ResultsMathProps = {
  breakdown: EafBreakdown;
};

export function ResultsMath({ breakdown }: ResultsMathProps) {
  const { annualFee, creditValue, rewardsValue } = breakdown;

  return (
    <ul className="space-y-2 text-sm" aria-label="EAF calculation breakdown">
      <li className="flex items-center justify-between">
        <span className="text-muted-foreground">Annual fee</span>
        <span className="font-mono tabular-nums">{formatCurrency(annualFee)}</span>
      </li>
      <li className="flex items-center justify-between">
        <span className="text-muted-foreground">− Equinox credit used</span>
        <span className="font-mono tabular-nums text-emerald-400">
          −{formatCurrency(creditValue)}
        </span>
      </li>
      <li className="flex items-center justify-between">
        <span className="text-muted-foreground">− Rewards value</span>
        <span className="font-mono tabular-nums text-emerald-400">
          −{formatCurrency(rewardsValue)}
        </span>
      </li>
    </ul>
  );
}
