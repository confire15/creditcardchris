import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InsightsContent } from "@/components/insights/insights-content";
import { subMonths, format } from "date-fns";

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sixMonthsAgo = format(subMonths(new Date(), 6), "yyyy-MM-dd");

  const [txRes, cardsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, category:spending_categories(*), user_card:user_cards(*, card_template:card_templates(*))")
      .eq("user_id", user.id)
      .gte("transaction_date", sixMonthsAgo)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*)")
      .eq("user_id", user.id)
      .eq("is_active", true),
  ]);

  return (
    <InsightsContent
      transactions={txRes.data ?? []}
      cards={cardsRes.data ?? []}
    />
  );
}
