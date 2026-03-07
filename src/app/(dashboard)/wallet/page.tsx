import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardList } from "@/components/wallet/card-list";

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <CardList userId={user.id} />;
}
