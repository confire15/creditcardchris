import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Sparkles, CreditCard, Trophy, ArrowRight, Star } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("referral_code", code.toUpperCase())
    .single();

  if (!profile) notFound();

  const memberSince = format(new Date(profile.member_since), "MMMM yyyy");
  const totalRewards = Number(profile.total_rewards ?? 0);
  const cardsCount = profile.cards_count ?? 0;

  const badges = [
    cardsCount >= 5 && { label: "Power User", icon: Star, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    cardsCount >= 3 && cardsCount < 5 && { label: "Multi-card optimizer", icon: CreditCard, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    totalRewards >= 500000 && { label: "500k+ points", icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    totalRewards >= 100000 && totalRewards < 500000 && { label: "100k+ points earned", icon: Sparkles, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  ].filter(Boolean) as Array<{ label: string; icon: React.ElementType; color: string; bg: string }>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Gradient orb */}
      <div className="fixed -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm space-y-5">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <img src="/logo.png" alt="Credit Card Chris" className="h-9 w-auto" />
            <span className="text-lg font-bold tracking-tight">Credit Card Chris</span>
          </div>

          {/* Invited by */}
          <p className="text-center text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">{profile.display_name}</span> invited you to join
          </p>

          {/* Profile card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header band */}
            <div className="h-20 bg-gradient-to-br from-primary/[0.15] to-primary/[0.05] border-b border-border relative">
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                <div className="w-16 h-16 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-primary">
                    {profile.display_name[0].toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-12 pb-6 px-6 text-center">
              <h1 className="text-xl font-bold">{profile.display_name}</h1>
              <p className="text-xs text-muted-foreground mt-1">Member since {memberSince}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">{cardsCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cards tracked</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-2xl font-bold">
                    {totalRewards >= 1000
                      ? `${(totalRewards / 1000).toFixed(0)}k`
                      : totalRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Points earned</p>
                </div>
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {badges.map((b) => {
                    const Icon = b.icon;
                    return (
                      <span key={b.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${b.bg} ${b.color}`}>
                        <Icon className="w-3 h-3" />
                        {b.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-base font-semibold mb-1">Track your rewards too</p>
            <p className="text-sm text-muted-foreground mb-5">
              Free forever. Know exactly which card to use for every purchase.
            </p>
            <Link
              href={`/signup?ref=${profile.referral_code}`}
              className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="block mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
