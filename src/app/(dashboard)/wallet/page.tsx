import { createClient } from "@/lib/supabase/server";
import { CardList } from "@/components/wallet/card-list";

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <CardList userId={user!.id} />;
}
