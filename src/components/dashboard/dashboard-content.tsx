"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard, StatementCredit, SpendingCategory, CardPerk, UserCategorySpend } from "@/lib/types/database";
import {
  CreditCard,
  Sparkles,
  Gift,
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { WalletScorecard } from "./wallet-scorecard";
import { SmartNudges } from "./smart-nudges";
import { BestCardLookup } from "./best-card-lookup";
import { WalletBreakdown } from "./wallet-breakdown";
import { CreditsProgress } from "./credits-progress";

export function DashboardContent({ userId }: { userId: string }) {
  const supabase = createClient();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [credits, setCredits] = useState<StatementCredit[]>([]);
  const [perks, setPerks] = useState<CardPerk[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [globalSpend, setGlobalSpend] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [cardsRes, creditsRes, perksRes, catsRes, spendRes] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*, rewards:card_template_rewards(*)), rewards:user_card_rewards(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("statement_credits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at"),
      supabase
        .from("card_perks")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase.from("spending_categories").select("*").order("display_name"),
      supabase
        .from("user_category_spend")
        .select("*")
        .eq("user_id", userId),
    ]);

    setCards((cardsRes.data as UserCard[]) ?? []);
    setCredits(creditsRes.data ?? []);
    setPerks(perksRes.data ?? []);
    setCategories(catsRes.data ?? []);

    // Build global spend map (aggregate across all cards per category)
    const spendMap: Record<string, number> = {};
    for (const row of (spendRes.data ?? []) as UserCategorySpend[]) {
      spendMap[row.category_id] = Math.max(spendMap[row.category_id] ?? 0, Number(row.monthly_amount));
    }
    setGlobalSpend(spendMap);

    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  // No cards state
  if (cards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-10 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="rounded-2xl bg-card border border-border/60 p-8 text-center">
          <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Add your first card</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Add cards to your wallet to start tracking rewards and credits.
          </p>
          <Link href="/wallet">
            <Button size="sm" className="gap-1.5 text-xs">
              <CreditCard className="w-3.5 h-3.5" />
              Go to Wallet
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-10 space-y-5 animate-[fade-in_0.3s_ease_both]">
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Wallet Scorecard */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.3, ease: "easeOut" }}>
        <WalletScorecard
          cards={cards}
          credits={credits}
          perks={perks}
          categories={categories}
          globalSpend={globalSpend}
        />
      </motion.div>

      {/* Smart Nudges */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.3, ease: "easeOut" }}>
        <SmartNudges
          cards={cards}
          credits={credits}
          perks={perks}
          categories={categories}
          globalSpend={globalSpend}
        />
      </motion.div>

      {/* Best Card Quick Lookup */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.3, ease: "easeOut" }}>
        <BestCardLookup
          cards={cards}
          categories={categories}
          globalSpend={globalSpend}
        />
      </motion.div>

      {/* Wallet Value Breakdown */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.3, ease: "easeOut" }}>
        <WalletBreakdown
          cards={cards}
          credits={credits}
          perks={perks}
          categories={categories}
          globalSpend={globalSpend}
        />
      </motion.div>

      {/* Credits Progress */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.3, ease: "easeOut" }}>
        <CreditsProgress
          cards={cards}
          credits={credits}
        />
      </motion.div>

      {/* No credits prompt */}
      {credits.length === 0 && (
        <div className="rounded-2xl bg-card border border-border/60 p-8 text-center">
          <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Set up your statement credits</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Track which annual credits you&apos;re actually using — and catch ones expiring before the month ends.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/benefits">
              <Button size="sm" className="gap-1.5 text-xs">
                <Gift className="w-3.5 h-3.5" />
                Set Up Benefits
              </Button>
            </Link>
            <Link href="/best-card">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Find Best Card
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
