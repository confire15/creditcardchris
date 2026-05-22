import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WalletCopilotPanel } from "@/components/agentic/wallet-copilot-panel";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";

export const metadata: Metadata = {
  title: "Wallet Copilot | Credit Card Chris",
  description: "Review next best actions from your credit card wallet.",
};

export default async function WalletCopilotPage() {
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

  return <WalletCopilotPanel isPremium={isPremiumPlan(sub)} />;
}
