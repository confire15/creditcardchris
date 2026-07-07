"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PremiumGate } from "@/components/premium/premium-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCard, UserCardOffer } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { Check, Plus, Search } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { toast } from "sonner";

export function OffersPage({ userId, isPremium }: { userId: string; isPremium: boolean }) {
  const supabase = createClient();
  const [offers, setOffers] = useState<UserCardOffer[]>([]);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [merchant, setMerchant] = useState("");
  const [userCardId, setUserCardId] = useState("none");
  const [valueAmount, setValueAmount] = useState("");
  const [minimumSpend, setMinimumSpend] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [query, setQuery] = useState("");

  async function load() {
    if (!isPremium) return;
    const [offersRes, cardsRes] = await Promise.all([
      fetch("/api/offers"),
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order"),
    ]);
    const offerPayload = await offersRes.json().catch(() => ({}));
    if (offersRes.ok) setOffers(offerPayload.offers ?? []);
    setCards((cardsRes.data as UserCard[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, [isPremium]);

  const visibleOffers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return offers.filter((offer) => !needle || offer.merchant.toLowerCase().includes(needle) || offer.notes?.toLowerCase().includes(needle));
  }, [offers, query]);
  const activeValue = offers.filter((offer) => !offer.is_used).reduce((sum, offer) => sum + Number(offer.value_amount ?? 0), 0);

  async function saveOffer() {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant,
        userCardId: userCardId === "none" ? null : userCardId,
        valueAmount: valueAmount || null,
        minimumSpend: minimumSpend || null,
        expiresOn: expiresOn || null,
        isActivated: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save offer");
      return;
    }
    setMerchant("");
    setValueAmount("");
    setMinimumSpend("");
    setExpiresOn("");
    toast.success("Offer added");
    void load();
  }

  async function markUsed(offer: UserCardOffer) {
    await fetch("/api/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: offer.id,
        merchant: offer.merchant,
        userCardId: offer.user_card_id,
        valueAmount: offer.value_amount,
        valuePercent: offer.value_percent,
        minimumSpend: offer.minimum_spend,
        expiresOn: offer.expires_on,
        offerType: offer.offer_type,
        isActivated: offer.is_activated,
        isUsed: true,
        notes: offer.notes,
      }),
    });
    void load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        className="mb-0"
        title="Offer Matcher"
        description="Manual Amex, Chase, Citi, and merchant offers matched to the cards already in your wallet."
      />

      <PremiumGate isPremium={isPremium} label="Unlock offer matching with Premium" preview={<div className="h-40 rounded-2xl border border-border bg-muted/30" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Active value</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(activeValue)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Open offers</p>
            <p className="mt-1 text-2xl font-bold">{offers.filter((offer) => !offer.is_used).length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Cards covered</p>
            <p className="mt-1 text-2xl font-bold">{new Set(offers.map((offer) => offer.user_card_id).filter(Boolean)).size}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_.8fr_.8fr_.9fr_auto]">
            <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Merchant" />
            <Select value={userCardId} onValueChange={setUserCardId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Card" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any card</SelectItem>
                {cards.map((card) => <SelectItem key={card.id} value={card.id}>{getCardName(card)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={valueAmount} onChange={(e) => setValueAmount(e.target.value)} inputMode="decimal" placeholder="$ value" />
            <Input value={minimumSpend} onChange={(e) => setMinimumSpend(e.target.value)} inputMode="decimal" placeholder="Min spend" />
            <Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            <Button onClick={saveOffer} className="gap-1.5"><Plus className="h-4 w-4" />Add</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search merchant or notes" className="h-9 flex-1 bg-transparent text-sm outline-none" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {visibleOffers.map((offer) => {
            const card = cards.find((candidate) => candidate.id === offer.user_card_id);
            const days = offer.expires_on ? differenceInDays(parseISO(offer.expires_on), new Date()) : null;
            return (
              <div key={offer.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{offer.merchant}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {card ? getCardName(card) : "Any card"}
                      {offer.minimum_spend ? ` · min ${formatCurrency(offer.minimum_spend)}` : ""}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{offer.value_amount ? formatCurrency(offer.value_amount) : `${offer.value_percent ?? 0}%`}</p>
                </div>
                {offer.expires_on && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Expires {format(parseISO(offer.expires_on), "MMM d")}
                    {days != null && days <= 14 && <span className="ml-2 text-amber-600 dark:text-amber-400">{Math.max(days, 0)}d left</span>}
                  </p>
                )}
                {!offer.is_used && (
                  <Button size="sm" variant="outline" className="mt-3 h-8 gap-1.5" onClick={() => markUsed(offer)}>
                    <Check className="h-3.5 w-3.5" />
                    Mark used
                  </Button>
                )}
              </div>
            );
          })}
          {visibleOffers.length === 0 && (
            <EmptyState
              className="sm:col-span-2"
              title="No offers saved yet"
              description="When your card app shows a deal — like &ldquo;$10 back at Starbucks&rdquo; — save it here so you don't forget to use it before it expires."
            />
          )}
        </div>
      </PremiumGate>
    </div>
  );
}
