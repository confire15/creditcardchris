"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInDays, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { buildUpcomingAlerts } from "@/lib/alerts/upcoming-alerts";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { getHouseholdMemberIds } from "@/lib/utils/household";

export function useNavAlertCounts(userId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [expiringCreditsCount, setExpiringCreditsCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    (async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const monthStart = `${now.toISOString().slice(0, 7)}-01`;
      const memberIds = await getHouseholdMemberIds(supabase, userId);

      const [
        creditsRes,
        subRes,
        annualFeesRes,
        perksRes,
        budgetsRes,
        txRes,
        subsRes,
        challengesRes,
      ] = await Promise.all([
        supabase
          .from("statement_credits")
          .select("reset_month, annual_amount, used_amount")
          .in("user_id", memberIds),
        supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_cards")
          .select("id, nickname, annual_fee_date, custom_annual_fee, card_template:card_templates(name, annual_fee)")
          .in("user_id", memberIds)
          .eq("is_active", true)
          .not("annual_fee_date", "is", null),
        supabase
          .from("card_perks")
          .select(
            "id, name, reset_cadence, reset_month, last_reset_at, value_type, annual_value, used_value, annual_count, used_count, is_redeemed",
          )
          .in("user_id", memberIds)
          .eq("is_active", true)
          .eq("notify_before_reset", true),
        supabase
          .from("spending_budgets")
          .select("category_id, monthly_limit, category:spending_categories(display_name)")
          .eq("user_id", userId),
        supabase
          .from("transactions")
          .select("category_id, amount")
          .eq("user_id", userId)
          .gte("transaction_date", monthStart),
        supabase
          .from("card_subs")
          .select("id, current_spend, required_spend, created_at, deadline, is_met, user_card:user_cards(nickname, custom_name, card_template:card_templates(name))")
          .in("user_id", memberIds),
        supabase
          .from("spend_challenges")
          .select("id, title, target_spend, current_spend, is_met")
          .in("user_id", memberIds),
      ]);

      if (!active) return;

      const credits = creditsRes.data ?? [];
      setExpiringCreditsCount(
        credits.filter((credit) => {
          if ((credit.used_amount ?? 0) >= (credit.annual_amount ?? 0)) return false;
          if (credit.reset_month !== currentMonth) return false;
          return differenceInDays(endOfMonth(now), now) <= 7;
        }).length,
      );

      if (!isPremiumPlan(subRes.data)) {
        setAlertsCount(0);
        return;
      }

      const alerts = buildUpcomingAlerts({
        now,
        windowDays: 7,
        annualFeeCards: annualFeesRes.data ?? [],
        perks: perksRes.data ?? [],
        budgets: budgetsRes.data ?? [],
        transactions: txRes.data ?? [],
        subPaceInputs: (subsRes.data ?? []).map((sub) => {
          const card = Array.isArray(sub.user_card) ? sub.user_card[0] : sub.user_card;
          const cardTemplate = Array.isArray(card?.card_template) ? card.card_template[0] : card?.card_template;
          return {
            id: sub.id,
            current_spend: Number(sub.current_spend),
            required_spend: Number(sub.required_spend),
            created_at: sub.created_at,
            deadline: sub.deadline,
            is_met: sub.is_met,
            card_name: card?.nickname || card?.custom_name || cardTemplate?.name || "Card",
          };
        }),
        challengeInputs: (challengesRes.data ?? []).map((challenge) => ({
          id: challenge.id,
          title: challenge.title,
          target_spend: Number(challenge.target_spend),
          current_spend: Number(challenge.current_spend),
          is_met: challenge.is_met,
        })),
      });
      setAlertsCount(alerts.length);
    })();

    return () => {
      active = false;
    };
  }, [userId, supabase]);

  return { expiringCreditsCount, alertsCount };
}
