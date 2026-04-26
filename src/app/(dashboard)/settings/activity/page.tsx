import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { ActivityLog } from "@/components/settings/activity-log";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const page = Math.max(Number(searchParams.page ?? "1") || 1, 1);
  const offset = (page - 1) * PAGE_SIZE;
  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);

  const [{ data: sub }, logsRes, countRes] = await Promise.all([
    supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).single(),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", since90.toISOString())
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since90.toISOString()),
  ]);

  const isPremium = isPremiumPlan(sub);
  const total = countRes.count ?? 0;
  const hasPrev = page > 1;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground text-base mt-2">Your latest wallet and rewards actions from the last 90 days.</p>
      </div>

      <ActivityLog logs={(logsRes.data ?? []) as never[]} isPremium={isPremium} />

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={!hasPrev} asChild={hasPrev}>
          {hasPrev ? <Link href={`/settings/activity?page=${page - 1}`}>Previous</Link> : <span>Previous</span>}
        </Button>
        <p className="text-sm text-muted-foreground">Page {page}</p>
        <Button variant="outline" disabled={!hasNext} asChild={hasNext}>
          {hasNext ? <Link href={`/settings/activity?page=${page + 1}`}>Next</Link> : <span>Next</span>}
        </Button>
      </div>
    </div>
  );
}
