"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, Check, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";

type Subscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

export function SubscriptionCard({ userId }: { userId: string }) {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [managing, setManaging] = useState(false);
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, stripe_customer_id")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setSub(data);
        setLoading(false);
      });

    // Show success message if redirected from Stripe
    if (searchParams.get("upgraded") === "true") {
      toast.success("Welcome to Premium! Full Keep or Cancel analysis is now unlocked.");
    }
  }, [userId, supabase, searchParams]);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error("Failed to start checkout");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setUpgrading(false);
    }
  }

  async function handleManage() {
    setManaging(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error("Failed to open billing portal");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setManaging(false);
    }
  }

  if (loading) return <div className="h-40 bg-muted animate-pulse rounded-2xl" />;

  const isPremium = sub?.plan === "premium" && sub?.status === "active";

  if (isPremium) {
    return (
      <div className="bg-card border border-primary/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Premium</h2>
                <p className="text-xs text-primary font-medium">Active</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleManage} disabled={managing}>
              {managing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Manage Plan"}
            </Button>
          </div>
          <div className="space-y-2">
            {["Full Keep or Cancel analysis", "Alternative card comparisons", "Downgrade path guidance", "Email & SMS alerts"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
          {sub?.current_period_end && (
            <p className="text-xs text-muted-foreground mt-4">
              Renews {format(new Date(sub.current_period_end), "MMMM d, yyyy")}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold">Upgrade to Premium</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Unlock the full Keep or Cancel analysis to see exactly which annual-fee cards are worth keeping.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Free */}
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold mb-3">Free</p>
            <div className="space-y-2">
              {["Best Card Finder", "Wallet (104+ cards)", "Statement credits tracker", "Keep/Cancel verdict", "All push alerts"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <p className="text-lg font-bold mt-4">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          </div>

          {/* Premium */}
          <div className="rounded-xl border border-primary/30 bg-primary/[0.05] p-4 relative">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
              POPULAR
            </div>
            <p className="text-sm font-semibold mb-3">Premium</p>
            <div className="space-y-2">
              {["Everything in Free", "Full value breakdown", "Top 3 free alternatives", "Downgrade guidance", "Email & SMS alerts"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <p className="text-lg font-bold mt-4">$3.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          </div>
        </div>

        <Button onClick={handleUpgrade} disabled={upgrading} className="w-full gap-2">
          {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {upgrading ? "Redirecting..." : "Upgrade to Premium — $3.99/mo"}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Cancel anytime · $39/yr (save 17%)
        </p>
      </div>
    </div>
  );
}
