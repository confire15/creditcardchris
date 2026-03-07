import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TransactionList } from "@/components/transactions/transaction-list";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TransactionList userId={user.id} />;
}
