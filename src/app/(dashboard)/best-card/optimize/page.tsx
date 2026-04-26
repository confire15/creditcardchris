import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { OptimizeTool } from "@/components/optimize/optimize-tool";

export default async function OptimizePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  if (!isPremiumPlan(sub)) redirect("/settings?upgrade=optimize");

  const [cardsRes, categoriesRes] = await Promise.all([
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*, rewards:card_template_rewards(*)), rewards:user_card_rewards(*)")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase.from("spending_categories").select("*").order("display_name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Spend Optimizer</h1>
      <p className="text-muted-foreground">Split a basket across categories to maximize projected rewards.</p>
      <OptimizeTool cards={cardsRes.data ?? []} categories={categoriesRes.data ?? []} />
    </div>
  );
}
