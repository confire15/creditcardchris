import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { PageHeader } from "@/components/layout/page-header";
import { ActivityLog } from "@/components/settings/activity-log";
import { Button } from "@/components/ui/button";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { buildHouseholdOwnerLabels } from "@/lib/utils/household-labels";

const PAGE_SIZE = 50;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const page = Math.max(Number(resolvedSearchParams.page ?? "1") || 1, 1);
  const offset = (page - 1) * PAGE_SIZE;
  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);
  const memberIds = await getHouseholdMemberIds(supabase, user.id);

  const [{ data: sub }, logsRes, countRes] = await Promise.all([
    supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).single(),
    supabase
      .from("audit_logs")
      .select("*")
      .in("user_id", memberIds)
      .gte("created_at", since90.toISOString())
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .in("user_id", memberIds)
      .gte("created_at", since90.toISOString()),
  ]);

  const isPremium = isPremiumPlan(sub);
  const total = countRes.count ?? 0;
  const hasPrev = page > 1;
  const hasNext = offset + PAGE_SIZE < total;
  const ownerLabels = buildHouseholdOwnerLabels(memberIds);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        className="mb-0"
        title="Activity"
        description="Your latest wallet and rewards actions from the last 90 days."
      />

      <ActivityLog logs={(logsRes.data ?? []) as never[]} isPremium={isPremium} ownerLabels={ownerLabels} />

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
