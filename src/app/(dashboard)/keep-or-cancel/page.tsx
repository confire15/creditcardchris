import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KeepOrCancelPage } from "@/components/keep-or-cancel/keep-or-cancel-page";

export default async function KeepOrCancel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  return (
    <KeepOrCancelPage
      userId={user.id}
      isPremium={sub?.plan === "premium"}
    />
  );
}
