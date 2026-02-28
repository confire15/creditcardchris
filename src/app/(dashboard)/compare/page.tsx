import { createClient } from "@/lib/supabase/server";
import { CardCompare } from "@/components/compare/card-compare";

export default async function ComparePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <CardCompare userId={user!.id} />;
}
