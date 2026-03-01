"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Sparkles,
  Receipt,
  BarChart3,
  Bell,
  Target,
  Check,
  GitCompareArrows,
  Zap,
  ArrowRight,
  Sun,
  Moon,
  MessageCircle,
  Building2,
  TrendingUp,
  PiggyBank,
  Shield,
} from "lucide-react";

export default function Home() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-overlay-subtle backdrop-blur-xl bg-background/80">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Credit Card Chris" className="h-8 w-auto" />
            <span className="hidden sm:block text-lg font-bold tracking-tight">Credit Card Chris</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-overlay-hover transition-all"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/login"
              className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all whitespace-nowrap"
            >
              <span className="sm:hidden">Get started</span>
              <span className="hidden sm:inline">Start free</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-24 pb-20 px-6 sm:px-8">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.07] blur-3xl pointer-events-none" />
          <div className="absolute top-40 right-0 w-[500px] h-[500px] rounded-full bg-blue-500/[0.04] blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/[0.08] text-primary text-sm font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              AI-powered rewards optimizer
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              Stop leaving points
              <br />
              <span className="text-primary">on the table</span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Know exactly which card to use for every purchase. Track spending, earn more rewards, and sync your bank automatically.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] px-8 py-4 text-base font-semibold hover:bg-white/[0.07] transition-all"
              >
                Sign in
              </Link>
            </div>

            {/* Stats bar */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-overlay-subtle">
              {[
                { value: "59+", label: "Cards supported" },
                { value: "20+", label: "Issuers covered" },
                { value: "1.5¢", label: "Avg point value" },
                { value: "2 min", label: "To get started" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card px-6 py-5 text-center">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem → Solution */}
        <section className="py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">How it works</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Set up in minutes. Keep earning more forever.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Add your cards",
                  desc: "Choose from 59+ card templates. Reward rates, annual fees, and bonus categories come pre-loaded — no manual setup.",
                },
                {
                  step: "02",
                  title: "Sync or import",
                  desc: "Connect your bank for automatic transaction import (Premium), or add spending manually and bulk-import via CSV.",
                },
                {
                  step: "03",
                  title: "Optimize every swipe",
                  desc: "Get instant recommendations for every merchant category. Know exactly which card earns the most before you tap.",
                },
              ].map((item) => (
                <div key={item.step} className="relative p-8 rounded-2xl border border-overlay-subtle bg-card hover:bg-overlay-hover transition-colors">
                  <div className="text-5xl font-bold text-primary/20 mb-4 leading-none">{item.step}</div>
                  <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Everything you need to earn more</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Built for people who actually care about maximizing every dollar spent.
              </p>
            </div>

            {/* Featured: Bank sync */}
            <div className="mb-6 p-8 rounded-2xl border border-primary/20 bg-primary/[0.05] relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                PREMIUM
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Automatic bank sync</h3>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                    Connect 12,000+ financial institutions via Plaid. Transactions import automatically — categorized, tagged with your card, and rewards calculated. No more manual entry.
                  </p>
                </div>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex-shrink-0"
                >
                  Try Premium
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Sparkles,
                  title: "Best card for every purchase",
                  desc: "Real-time recommendations for dining, travel, groceries, gas, and 15+ more categories. Never leave multipliers on the table.",
                },
                {
                  icon: MessageCircle,
                  title: "AI rewards assistant",
                  desc: "Chat with an AI trained on your wallet. Ask which card to use, how to hit a bonus, or how to maximize a trip — in plain English.",
                },
                {
                  icon: TrendingUp,
                  title: "Spending insights",
                  desc: "Month-over-month comparisons, category breakdowns, top merchants, and rewards earned. See exactly where you're winning and where you're not.",
                },
                {
                  icon: Receipt,
                  title: "Full transaction history",
                  desc: "Every purchase logged with rewards calculated automatically. Filter by card, category, date, or merchant. Export to CSV anytime.",
                },
                {
                  icon: Bell,
                  title: "Annual fee & budget alerts",
                  desc: "Get notified 30, 7, and 1 day before annual fee charges. Set monthly spending budgets with over-limit push notifications.",
                },
                {
                  icon: Target,
                  title: "Goals & statement credits",
                  desc: "Set a target — flight, hotel, cashback threshold — and track progress. Never miss a statement credit with the built-in tracker.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-8 rounded-2xl border border-overlay-subtle bg-card hover:bg-overlay-hover transition-colors group">
                  <div className="w-11 h-11 rounded-xl bg-primary/[0.12] flex items-center justify-center mb-5 group-hover:bg-primary/[0.18] transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof / checklist */}
        <section className="py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  The full picture,<br />all in one app
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Everything from YNAB-style budgets to Plaid bank sync — designed specifically for credit card rewards optimization.
                </p>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/[0.06] border border-primary/15">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Bank connections are read-only via Plaid. We never store your credentials.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "AI rewards assistant",
                  "Bank sync via Plaid",
                  "Spending insights & trends",
                  "Transfer partner calculator",
                  "Spending budgets & alerts",
                  "CSV import & export",
                  "Application tracker",
                  "Statement credit tracker",
                  "Per-card rewards summary",
                  "Points value calculator",
                  "Mobile-friendly PWA",
                  "Global cmd+K search",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/[0.15] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Simple pricing</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                All the core features are free. Upgrade for automatic bank sync and hands-free tracking.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Free */}
              <div className="rounded-2xl border border-overlay-subtle bg-card p-8">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Free</p>
                <div className="flex items-end gap-1 mb-1">
                  <p className="text-4xl font-bold">$0</p>
                </div>
                <p className="text-sm text-muted-foreground mb-6">No credit card required</p>
                <div className="space-y-3 mb-8">
                  {[
                    "59+ card templates",
                    "AI rewards assistant",
                    "Best card recommendations",
                    "Manual transaction entry",
                    "Spending insights & charts",
                    "Goals, budgets & alerts",
                    "CSV import/export",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup"
                  className="block text-center rounded-xl border border-white/[0.1] py-3 text-sm font-semibold hover:bg-overlay-hover transition-all"
                >
                  Get started free
                </Link>
              </div>

              {/* Premium */}
              <div className="rounded-2xl border border-primary/40 bg-primary/[0.05] p-8 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/[0.08] blur-2xl pointer-events-none" />
                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                  MOST POPULAR
                </div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Premium</p>
                <div className="flex items-end gap-1 mb-1">
                  <p className="text-4xl font-bold">$9.99</p>
                  <p className="text-sm text-muted-foreground mb-1.5">/mo</p>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Cancel anytime, no commitment</p>
                <div className="space-y-3 mb-8">
                  {[
                    "Everything in Free",
                    "Bank account sync (Plaid)",
                    "Automatic transaction import",
                    "12,000+ institutions supported",
                    "Real-time balance data",
                    "Hands-free rewards tracking",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup"
                  className="block text-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all relative z-10"
                >
                  Start free → upgrade later
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden bg-primary/[0.08] border border-primary/20 p-12 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.14] to-transparent pointer-events-none" />
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary/[0.12] blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <PiggyBank className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Start earning what you deserve
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                  Free forever for manual tracking. Connect your bank when you're ready for autopilot.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-10 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  >
                    Create free account
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] px-10 py-4 text-base font-semibold hover:bg-white/[0.07] transition-all"
                  >
                    Sign in
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mt-6">No credit card required · Cancel anytime</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-overlay-subtle py-10 px-6 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Credit Card Chris" className="h-7 w-auto" />
            <span className="text-sm font-semibold">Credit Card Chris</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </nav>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Credit Card Chris. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
