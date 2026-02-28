import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Sparkles, CreditCard, Calendar } from "lucide-react";
import { format } from "date-fns";

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

  if (!profile) {
    notFound();
  }

  const memberSince = format(new Date(profile.member_since), "MMMM yyyy");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-base font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Credit Card Chris</span>
          </div>
        </div>

        {/* Profile card */}
        <div className="bg-card border border-white/[0.06] rounded-2xl p-8 text-center space-y-6">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-primary">
              {profile.display_name[0].toUpperCase()}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
            <p className="text-muted-foreground text-sm mt-1">Rewards Optimizer</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
            <div>
              <p className="text-2xl font-bold text-primary">
                {profile.cards_count}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Cards</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Number(profile.total_rewards).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total pts</p>
            </div>
            <div className="flex flex-col items-center">
              <Calendar className="w-5 h-5 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Since {memberSince}</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-3 justify-center">
          {profile.cards_count >= 3 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              <CreditCard className="w-3 h-3" />
              Multi-card optimizer
            </div>
          )}
          {Number(profile.total_rewards) >= 100000 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
              <Sparkles className="w-3 h-3" />
              100k+ points earned
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center pt-2">
          <p className="text-sm text-muted-foreground mb-4">
            Want to maximize your own rewards?
          </p>
          <a
            href={`https://creditcardchris.com/signup?ref=${profile.referral_code}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
          >
            Get started free
          </a>
        </div>
      </div>
    </div>
  );
}
