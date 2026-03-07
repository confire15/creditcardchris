import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionsList } from "@/components/subscriptions/subscriptions-list";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Track recurring charges and catch price increases automatically
        </p>
      </div>
      <SubscriptionsList userId={user.id} />
    </div>
  );
}
