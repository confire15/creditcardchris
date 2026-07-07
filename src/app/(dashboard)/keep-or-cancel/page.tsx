import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { KeepOrCancelPage } from "@/components/keep-or-cancel/keep-or-cancel-page";
import { WizardLayout } from "@/components/calculator/wizard-layout";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keep or Cancel | Credit Card Chris",
  description: "Is your annual fee worth it? Get a KEEP / CANCEL / CLOSE CALL verdict for every card.",
};

export default async function KeepOrCancel({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { mode } = await searchParams;
  if (mode === "calculator") {
    return (
      <div>
        <div className="mx-auto max-w-xl">
          <Link
            href="/keep-or-cancel"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Keep or Cancel
          </Link>
        </div>
        <WizardLayout />
      </div>
    );
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  return (
    <KeepOrCancelPage
      userId={user.id}
      isPremium={isPremiumPlan(sub)}
    />
  );
}
