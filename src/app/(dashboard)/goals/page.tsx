import { createClient } from "@/lib/supabase/server";
import { GoalsList } from "@/components/goals/goals-list";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Total all-time rewards earned
  const { data: txData } = await supabase
    .from("transactions")
    .select("rewards_earned")
    .eq("user_id", user!.id);

  const totalRewards = (txData ?? []).reduce(
    (sum, t) => sum + (t.rewards_earned ?? 0),
    0
  );

  return <GoalsList userId={user!.id} totalRewards={Math.round(totalRewards)} />;
}
