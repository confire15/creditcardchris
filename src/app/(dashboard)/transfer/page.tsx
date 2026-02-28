import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TransferCalculator } from "@/components/transfer/transfer-calculator";

export default async function TransferPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TransferCalculator />;
}
