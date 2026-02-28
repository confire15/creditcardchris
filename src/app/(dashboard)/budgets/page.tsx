import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SpendingBudgets } from "@/components/settings/spending-budgets";

export default async function BudgetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground text-base mt-2">
          Set monthly spending limits per category and track your progress.
        </p>
      </div>
      <div className="max-w-2xl">
        <SpendingBudgets userId={user.id} />
      </div>
    </div>
  );
}
