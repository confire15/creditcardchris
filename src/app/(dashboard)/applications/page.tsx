import { createClient } from "@/lib/supabase/server";
import { ApplicationsList } from "@/components/applications/applications-list";

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <ApplicationsList userId={user!.id} />;
}
