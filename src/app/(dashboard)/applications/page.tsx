import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplicationsList } from "@/components/applications/applications-list";

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ApplicationsList userId={user.id} />;
}
