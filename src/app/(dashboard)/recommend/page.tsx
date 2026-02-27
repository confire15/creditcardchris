import { createClient } from "@/lib/supabase/server";
import { RecommendTool } from "@/components/recommend/recommend-tool";

export default async function RecommendPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <RecommendTool userId={user!.id} />;
}
