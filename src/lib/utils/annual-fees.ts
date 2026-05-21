import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { CardPerk, SpendingCategory, StatementCredit, UserCard } from "@/lib/types/database";
import { computeRewardsValue } from "@/lib/utils/card-analysis";
import { getCardIssuer, getCardName, getRewardUnit } from "@/lib/utils/rewards";
import { getDefaultCpp } from "@/lib/constants/default-spend";

export type AnnualFeeWorthStatus = "worth_it" | "close_call" | "not_worth_it" | "needs_data";
export type AnnualFeeDateSource = "exact" | "estimated_from_opened_on" | "unknown";

export type AnnualFeeEvent = {
  id: string;
  userCardId: string;
  userId: string;
  cardName: string;
  issuer: string;
  annualFee: number;
  dueDate: string | null;
  dateSource: AnnualFeeDateSource;
  daysUntil: number | null;
  worthStatus: AnnualFeeWorthStatus;
  netValue: number;
  totalValue: number;
  creditsValue: number;
  perksValue: number;
  rewardsValue: number;
  remindersEnabled: boolean;
  reminderDays: number[];
  canManage: boolean;
  googleCalendarUrl: string | null;
};

const DEFAULT_REMINDER_DAYS = [30, 7, 1];

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toCalendarDate(date: Date): string {
  return format(date, "yyyyMMdd");
}

export function getNextAnnualDate(dateValue: string | null, now = new Date()): string | null {
  if (!dateValue) return null;

  const source = parseDateOnly(dateValue);
  const today = startOfDay(now);
  let next = new Date(today.getFullYear(), source.getMonth(), source.getDate());

  if (next < today) {
    next = new Date(today.getFullYear() + 1, source.getMonth(), source.getDate());
  }

  return toDateOnly(next);
}

export function getAnnualFeeDate(card: UserCard, now = new Date()): {
  dueDate: string | null;
  source: AnnualFeeDateSource;
} {
  if (card.annual_fee_date) {
    return { dueDate: getNextAnnualDate(card.annual_fee_date, now), source: "exact" };
  }

  if (card.account_opened_on) {
    return {
      dueDate: getNextAnnualDate(card.account_opened_on, now),
      source: "estimated_from_opened_on",
    };
  }

  return { dueDate: null, source: "unknown" };
}

export function getWorthStatus({
  annualFee,
  totalValue,
  hasSpendData,
}: {
  annualFee: number;
  totalValue: number;
  hasSpendData: boolean;
}): AnnualFeeWorthStatus {
  const netValue = totalValue - annualFee;
  if (!hasSpendData && totalValue < annualFee && annualFee > 0) return "needs_data";
  if (netValue >= 50) return "worth_it";
  if (netValue <= -50) return "not_worth_it";
  return "close_call";
}

export function buildGoogleCalendarAnnualFeeUrl(event: {
  cardName: string;
  issuer: string;
  annualFee: number;
  dueDate: string;
  worthStatus: AnnualFeeWorthStatus;
  netValue: number;
}): string {
  const start = parseDateOnly(event.dueDate);
  const end = addDays(start, 1);
  const worthLabel = annualFeeWorthLabel(event.worthStatus);
  const details = [
    `${event.cardName} annual fee: $${formatAmount(event.annualFee)}`,
    event.issuer ? `Issuer: ${event.issuer}` : null,
    `Worth it status: ${worthLabel}`,
    `Estimated net value: ${event.netValue >= 0 ? "+" : "-"}$${formatAmount(Math.abs(event.netValue))}`,
    "Review in Credit Card Chris: https://creditcardchris.com/annual-fees",
  ].filter(Boolean).join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Annual fee: ${event.cardName}`,
    dates: `${toCalendarDate(start)}/${toCalendarDate(end)}`,
    details,
    recur: "RRULE:FREQ=YEARLY",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildAnnualFeeEvents({
  cards,
  credits,
  perks,
  categories,
  categorySpend,
  currentUserId,
  now = new Date(),
}: {
  cards: UserCard[];
  credits: StatementCredit[];
  perks: CardPerk[];
  categories: SpendingCategory[];
  categorySpend: Record<string, Record<string, number>>;
  currentUserId: string;
  now?: Date;
}): AnnualFeeEvent[] {
  return cards
    .filter((card) => card.is_active !== false)
    .map((card) => {
      const annualFee = Number(card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0);
      if (annualFee <= 0) return null;

      const cardCredits = credits.filter((credit) => credit.user_card_id === card.id);
      const creditsValue = cardCredits
        .filter((credit) => credit.will_use)
        .reduce((sum, credit) => sum + Number(credit.annual_amount ?? 0), 0);
      const perksValue = perks
        .filter((perk) => perk.user_card_id === card.id)
        .reduce((sum, perk) => sum + Number(perk.annual_value ?? 0), 0);
      const spend = categorySpend[card.id] ?? {};
      const hasSpendData = Object.values(spend).some((amount) => Number(amount) > 0);
      const rewardsValue = computeRewardsValue(card, categories, spend, getDefaultCpp(getRewardUnit(card)));
      const totalValue = creditsValue + perksValue + rewardsValue;
      const netValue = totalValue - annualFee;
      const { dueDate, source } = getAnnualFeeDate(card, now);
      const daysUntil = dueDate ? differenceInCalendarDays(parseDateOnly(dueDate), startOfDay(now)) : null;
      const worthStatus = getWorthStatus({ annualFee, totalValue, hasSpendData });
      const reminderDays = Array.isArray(card.annual_fee_reminder_days) && card.annual_fee_reminder_days.length > 0
        ? card.annual_fee_reminder_days
        : DEFAULT_REMINDER_DAYS;

      return {
        id: `annual-fee-${card.id}`,
        userCardId: card.id,
        userId: card.user_id,
        cardName: getCardName(card),
        issuer: getCardIssuer(card),
        annualFee,
        dueDate,
        dateSource: source,
        daysUntil,
        worthStatus,
        netValue,
        totalValue,
        creditsValue,
        perksValue,
        rewardsValue,
        remindersEnabled: card.annual_fee_reminders_enabled !== false,
        reminderDays,
        canManage: card.user_id === currentUserId,
        googleCalendarUrl: dueDate
          ? buildGoogleCalendarAnnualFeeUrl({
              cardName: getCardName(card),
              issuer: getCardIssuer(card),
              annualFee,
              dueDate,
              worthStatus,
              netValue,
            })
          : null,
      } satisfies AnnualFeeEvent;
    })
    .filter((event): event is AnnualFeeEvent => event !== null)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return a.cardName.localeCompare(b.cardName);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
}

export function annualFeeWorthLabel(status: AnnualFeeWorthStatus): string {
  if (status === "worth_it") return "Worth it";
  if (status === "not_worth_it") return "Not worth it";
  if (status === "needs_data") return "Needs spend data";
  return "Close call";
}

export function annualFeeDateLabel(event: Pick<AnnualFeeEvent, "dueDate" | "dateSource">): string {
  if (!event.dueDate) return "Date needed";
  const label = format(parseDateOnly(event.dueDate), "MMM d, yyyy");
  return event.dateSource === "estimated_from_opened_on" ? `${label} est.` : label;
}

export function formatAmount(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toFixed(2);
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildAnnualFeeIcs(events: AnnualFeeEvent[], now = new Date()): string {
  const stamp = `${format(now, "yyyyMMdd")}T${format(now, "HHmmss")}Z`;
  const body = events
    .filter((event) => event.dueDate)
    .map((event) => {
      const start = parseDateOnly(event.dueDate!);
      const end = addDays(start, 1);
      const description = [
        `${event.cardName} annual fee: $${formatAmount(event.annualFee)}`,
        event.issuer ? `Issuer: ${event.issuer}` : null,
        `Worth it status: ${annualFeeWorthLabel(event.worthStatus)}`,
        `Estimated net value: ${event.netValue >= 0 ? "+" : "-"}$${formatAmount(Math.abs(event.netValue))}`,
        "Review: https://creditcardchris.com/annual-fees",
      ].filter(Boolean).join("\n");

      return [
        "BEGIN:VEVENT",
        `UID:annual-fee-${event.userCardId}@creditcardchris.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${toCalendarDate(start)}`,
        `DTEND;VALUE=DATE:${toCalendarDate(end)}`,
        "RRULE:FREQ=YEARLY",
        `SUMMARY:${escapeIcs(`Annual fee: ${event.cardName}`)}`,
        `DESCRIPTION:${escapeIcs(description)}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Credit Card Chris//Annual Fee Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    body,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
