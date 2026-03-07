import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PerksList } from "@/components/perks/perks-list";

export default async function PerksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Card Perks</h1>
        <p className="text-muted-foreground mt-1">
          Track every benefit and use them before they reset
        </p>
      </div>
      <PerksList userId={user.id} />
    </div>
  );
}
