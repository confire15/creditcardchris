import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="text-center space-y-8 max-w-3xl px-8 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <span className="text-2xl font-bold text-white">C</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Card Chris</h1>
        </div>
        <h2 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
          Maximize every
          <br />
          <span className="text-primary">swipe</span>
        </h2>
        <p className="text-xl sm:text-2xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Track your credit cards, optimize your spending, and never miss a reward again.
        </p>
        <div className="flex gap-4 justify-center pt-6">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-8 py-4 text-base font-semibold hover:bg-white/[0.07] transition-all"
          >
            Sign In
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-16 text-left">
          <div className="p-8 rounded-2xl border border-white/[0.06] bg-card hover:bg-white/[0.02] transition-colors">
            <h3 className="text-lg font-semibold mb-3">Best Card Picks</h3>
            <p className="text-base text-muted-foreground">
              Know which card to use for every purchase to earn maximum rewards.
            </p>
          </div>
          <div className="p-8 rounded-2xl border border-white/[0.06] bg-card hover:bg-white/[0.02] transition-colors">
            <h3 className="text-lg font-semibold mb-3">Track Spending</h3>
            <p className="text-base text-muted-foreground">
              Log transactions and see exactly how much you&apos;re earning back.
            </p>
          </div>
          <div className="p-8 rounded-2xl border border-white/[0.06] bg-card hover:bg-white/[0.02] transition-colors">
            <h3 className="text-lg font-semibold mb-3">Rewards Dashboard</h3>
            <p className="text-base text-muted-foreground">
              Visualize your rewards across all cards in one beautiful dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
