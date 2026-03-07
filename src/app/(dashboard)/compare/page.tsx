import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardCompare } from "@/components/compare/card-compare";

export default async function ComparePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <CardCompare userId={user.id} />;
}
