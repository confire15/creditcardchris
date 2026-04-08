import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardList } from "@/components/wallet/card-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet | Credit Card Chris",
  description: "Manage your credit cards, view details, and track annual fees.",
};

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <CardList userId={user.id} />;
}
