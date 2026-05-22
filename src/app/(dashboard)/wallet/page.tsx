import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { buildHouseholdOwnerLabels } from "@/lib/utils/household-labels";
import { loadAnnualFeeEvents } from "@/lib/annual-fees/load-annual-fee-events";
import { CardList } from "@/components/wallet/card-list";
import { BenefitsPage } from "@/components/benefits/benefits-page";
import { OffersPage } from "@/components/offers/offers-page";
import { PointsWalletPage } from "@/components/points/points-wallet-page";
import { ChallengesList } from "@/components/challenges/challenges-list";
import { ApplicationsPage } from "@/components/applications/applications-page";
import { AnnualFeeCalendarPage } from "@/components/annual-fees/annual-fee-calendar-page";
import { WalletTabs, isWalletTab, type WalletTabKey } from "@/components/wallet/wallet-tabs";

export const metadata: Metadata = {
  title: "Wallet | Credit Card Chris",
  description: "Cards, credits, offers, points, challenges, applications, and annual fees — one place.",
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolved = await searchParams;
  const tab: WalletTabKey = isWalletTab(resolved.tab) ? resolved.tab : "cards";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();
  const isPremium = isPremiumPlan(sub);

  return (
    <div>
      <WalletTabs active={tab} />
      <WalletTabPanel tab={tab} userId={user.id} isPremium={isPremium} />
    </div>
  );
}

async function WalletTabPanel({
  tab,
  userId,
  isPremium,
}: {
  tab: WalletTabKey;
  userId: string;
  isPremium: boolean;
}) {
  if (tab === "cards") {
    return <CardList userId={userId} isPremium={isPremium} />;
  }
  if (tab === "credits-benefits") {
    return <BenefitsPage userId={userId} isPremium={isPremium} />;
  }
  if (tab === "offers") {
    return <OffersPage userId={userId} isPremium={isPremium} />;
  }
  if (tab === "points") {
    return <PointsWalletPage isPremium={isPremium} />;
  }
  if (tab === "applications") {
    return <ApplicationsPage isPremium={isPremium} />;
  }
  if (tab === "challenges") {
    const supabase = await createClient();
    const memberIds = await getHouseholdMemberIds(supabase, userId);
    const [{ data: cards }, { data: categories }] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*)")
        .in("user_id", memberIds)
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("spending_categories").select("*").order("display_name"),
    ]);
    const ownerLabels = buildHouseholdOwnerLabels(memberIds);
    return (
      <ChallengesList
        isPremium={isPremium}
        cards={cards ?? []}
        categories={categories ?? []}
        ownerLabels={ownerLabels}
      />
    );
  }
  if (tab === "annual-fees") {
    const supabase = await createClient();
    const allEvents = await loadAnnualFeeEvents({ supabase, userId });
    const visibleEvents = isPremium ? allEvents : allEvents.slice(0, 1);
    return (
      <AnnualFeeCalendarPage
        userId={userId}
        isPremium={isPremium}
        events={visibleEvents}
        lockedCount={isPremium ? 0 : Math.max(allEvents.length - visibleEvents.length, 0)}
        totalCount={allEvents.length}
      />
    );
  }
  return null;
}
