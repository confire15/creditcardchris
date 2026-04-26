import { addYears, parseISO } from "date-fns";
import type { CardPerk } from "@/lib/types/database";

type PerkResetFields = Pick<CardPerk, "reset_cadence" | "reset_month" | "last_reset_at">;
type PerkValueFields = Pick<
  CardPerk,
  "value_type" | "annual_value" | "used_value" | "annual_count" | "used_count" | "is_redeemed"
>;

export function getNextResetDate(perk: PerkResetFields, fromDate = new Date()): Date {
  const month = (perk.reset_month ?? 1) - 1;

  if (perk.reset_cadence === "monthly") {
    return new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1);
  }

  if (perk.reset_cadence === "calendar_year") {
    const thisYear = new Date(fromDate.getFullYear(), month, 1);
    return fromDate >= thisYear
      ? new Date(fromDate.getFullYear() + 1, month, 1)
      : thisYear;
  }

  if (perk.last_reset_at) {
    return addYears(parseISO(perk.last_reset_at), 1);
  }

  const thisYear = new Date(fromDate.getFullYear(), month, 1);
  return fromDate >= thisYear
    ? new Date(fromDate.getFullYear() + 1, month, 1)
    : thisYear;
}

export function hasPerkRemainingValue(perk: PerkValueFields): boolean {
  if (perk.value_type === "dollar") {
    return (perk.annual_value ?? 0) - (perk.used_value ?? 0) > 0;
  }
  if (perk.value_type === "count") {
    return (perk.annual_count ?? 0) - (perk.used_count ?? 0) > 0;
  }
  return !perk.is_redeemed;
}
