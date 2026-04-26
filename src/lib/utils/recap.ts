import { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";

export type YearRecap = {
  year: number;
  totalCardsHeld: number;
  totalAnnualFeesPaid: number;
  totalCreditsCaptured: number;
  totalCreditsAvailable: number;
  totalSubsEarned: number;
  netValue: number;
  topCardByValue: { name: string; netValue: number; cardId: string };
  byMonth: { month: number; creditsCaptured: number }[];
};

export async function buildYearRecap(
  supabase: SupabaseClient,
  userId: string,
  year: number,
): Promise<YearRecap> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const [cardsRes, creditsRes, perksRes, subsRes] = await Promise.all([
    supabase
      .from("user_cards")
      .select("id, custom_name, nickname, custom_annual_fee, card_template:card_templates(name, annual_fee)")
      .eq("user_id", userId),
    supabase
      .from("statement_credits")
      .select("user_card_id, annual_amount, used_amount, created_at")
      .eq("user_id", userId)
      .gte("created_at", `${start}T00:00:00.000Z`)
      .lte("created_at", `${end}T23:59:59.999Z`),
    supabase
      .from("card_perks")
      .select("user_card_id, annual_value, used_value, created_at")
      .eq("user_id", userId)
      .gte("created_at", `${start}T00:00:00.000Z`)
      .lte("created_at", `${end}T23:59:59.999Z`),
    supabase
      .from("card_subs")
      .select("reward_amount, is_met, met_at")
      .eq("user_id", userId)
      .eq("is_met", true)
      .gte("met_at", `${start}T00:00:00.000Z`)
      .lte("met_at", `${end}T23:59:59.999Z`),
  ]);

  const cards = cardsRes.data ?? [];
  const credits = creditsRes.data ?? [];
  const perks = perksRes.data ?? [];
  const subs = subsRes.data ?? [];

  const totalAnnualFeesPaid = cards.reduce((sum, card) => {
    const template = Array.isArray(card.card_template) ? card.card_template[0] : card.card_template;
    return sum + Number(card.custom_annual_fee ?? template?.annual_fee ?? 0);
  }, 0);

  const totalCreditsCaptured =
    credits.reduce((sum, credit) => sum + Number(credit.used_amount ?? 0), 0) +
    perks.reduce((sum, perk) => sum + Number(perk.used_value ?? 0), 0);
  const totalCreditsAvailable =
    credits.reduce((sum, credit) => sum + Number(credit.annual_amount ?? 0), 0) +
    perks.reduce((sum, perk) => sum + Number(perk.annual_value ?? 0), 0);
  const totalSubsEarned = subs.reduce((sum, sub) => sum + Number(sub.reward_amount ?? 0), 0);
  const netValue = totalCreditsCaptured + totalSubsEarned - totalAnnualFeesPaid;

  const byMonth = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, creditsCaptured: 0 }));
  for (const credit of credits) {
    const month = Number(format(new Date(credit.created_at), "M"));
    byMonth[month - 1].creditsCaptured += Number(credit.used_amount ?? 0);
  }
  for (const perk of perks) {
    const month = Number(format(new Date(perk.created_at), "M"));
    byMonth[month - 1].creditsCaptured += Number(perk.used_value ?? 0);
  }

  const cardValueById = new Map<string, number>();
  for (const credit of credits) {
    cardValueById.set(
      credit.user_card_id,
      (cardValueById.get(credit.user_card_id) ?? 0) + Number(credit.used_amount ?? 0),
    );
  }
  for (const perk of perks) {
    cardValueById.set(
      perk.user_card_id,
      (cardValueById.get(perk.user_card_id) ?? 0) + Number(perk.used_value ?? 0),
    );
  }

  let topCard = { name: "N/A", netValue: 0, cardId: "" };
  for (const card of cards) {
    const template = Array.isArray(card.card_template) ? card.card_template[0] : card.card_template;
    const cardName = card.nickname ?? card.custom_name ?? template?.name ?? "Card";
    const value = cardValueById.get(card.id) ?? 0;
    const fee = Number(card.custom_annual_fee ?? template?.annual_fee ?? 0);
    const cardNet = value - fee;
    if (cardNet > topCard.netValue) {
      topCard = { name: cardName, netValue: cardNet, cardId: card.id };
    }
  }

  return {
    year,
    totalCardsHeld: cards.length,
    totalAnnualFeesPaid,
    totalCreditsCaptured,
    totalCreditsAvailable,
    totalSubsEarned,
    netValue,
    topCardByValue: topCard,
    byMonth,
  };
}
