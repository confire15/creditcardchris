/**
 * Pure reward math helpers for the Best Card Finder.
 *
 * Keep this module side-effect-free and framework-agnostic so it can be unit
 * tested without a DOM or Supabase client. Mirrors the pattern used in
 * `src/components/calculator/results-math.ts`.
 */

/**
 * Annual spend (in dollars) needed in a bonus category to offset a card's
 * annual fee, given its multiplier over a 1x baseline.
 *
 * Returns `0` when there is no fee, no uplift over baseline, or inputs are
 * non-positive — callers can treat `0` as "no break-even applies".
 */
export function breakEvenAnnualSpend(
  annualFee: number,
  multiplier: number,
): number {
  if (annualFee <= 0 || multiplier <= 1) return 0;
  return Math.ceil(annualFee / ((multiplier - 1) * 0.01));
}

/**
 * True when a user's entered **monthly** spend, annualized, falls short of the
 * break-even threshold for a card's annual fee at the given multiplier.
 *
 * Used by the Best Card Finder to flag fee cards the user will not profit from
 * at their current spend level.
 */
export function isBelowBreakEven(
  monthlySpend: number,
  annualFee: number,
  multiplier: number,
): boolean {
  if (monthlySpend <= 0) return false;
  const breakEven = breakEvenAnnualSpend(annualFee, multiplier);
  if (breakEven <= 0) return false;
  return monthlySpend * 12 < breakEven;
}
