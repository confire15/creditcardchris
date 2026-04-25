import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NotificationSettings } from "@/components/settings/notification-settings";

export const metadata: Metadata = {
  title: "Alerts | Credit Card Chris",
  description: "Manage smart alerts across push, email, and SMS.",
};

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground text-base mt-2">
          Stay ahead of fees, perk expirations, and budget misses.
        </p>
      </div>

      <div className="max-w-2xl">
        <NotificationSettings userId={user.id} />
      </div>
    </div>
  );
}
