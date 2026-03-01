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
} from "lucide-react";

export default function Home() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border backdrop-blur-xl bg-background/80">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Credit Card Chris" className="h-8 w-auto" />
            <span className="hidden sm:block text-lg font-bold tracking-tight">Credit Card Chris</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
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
              <span className="hidden sm:inline">Get started free</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-24 pb-20 px-6 sm:px-8">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/[0.07] blur-3xl pointer-events-none" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/[0.04] blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/[0.08] text-primary text-sm font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Free rewards optimizer
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              Maximize every
              <br />
              <span className="text-primary">swipe</span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Track all your credit cards, know exactly which to use for every purchase, and watch your rewards grow — all in one place.
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
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-muted/40 px-8 py-4 text-base font-semibold hover:bg-muted/60 transition-all"
              >
                Sign in
              </Link>
            </div>

            {/* Stats bar */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
              {[
                { value: "59+", label: "Cards supported" },
                { value: "20+", label: "Issuers covered" },
                { value: "1.5¢", label: "Avg point value" },
                { value: "Free", label: "Always" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card px-6 py-5 text-center">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-6 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">How it works</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Get set up in minutes and start earning more on every purchase.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { step: "01", title: "Add your cards", desc: "Select from 59+ cards. We pull in reward rates, annual fees, and bonus categories automatically." },
                { step: "02", title: "Log transactions", desc: "Add spending as you go or import from CSV. The app calculates rewards earned per transaction." },
                { step: "03", title: "Optimize", desc: "Get instant recommendations on which card to use for each category to earn the most points." },
              ].map((item) => (
                <div key={item.step} className="relative p-8 rounded-2xl border border-border bg-card hover:bg-muted/20 transition-colors">
                  <div className="text-5xl font-bold text-primary/20 mb-4 leading-none">{item.step}</div>
                  <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20 px-6 sm:px-8 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Everything you need</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">A complete toolkit for serious points earners.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Sparkles, title: "Best Card Picks", desc: "Real-time recommendations for every merchant category — dining, travel, groceries, gas, and more." },
                { icon: MessageCircle, title: "AI Rewards Assistant", desc: "Chat with an AI trained on your wallet. Ask which card to use, how to hit a bonus, or how to maximize a trip." },
                { icon: Receipt, title: "Transaction Tracking", desc: "Log spending, assign cards, and see rewards calculated automatically. Import via CSV." },
                { icon: BarChart3, title: "Spending Insights", desc: "Visualize spending trends, category breakdowns, top merchants, and rewards earned month-over-month." },
                { icon: Bell, title: "Annual Fee Alerts", desc: "Never be surprised by an annual fee again. Get notified before your renewal date." },
                { icon: Target, title: "Rewards Goals", desc: "Set a target — flight, hotel, cashback — and track your progress automatically." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-8 rounded-2xl border border-border bg-card hover:bg-muted/20 transition-colors group">
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

        {/* Bonus features checklist */}
        <section className="py-20 px-6 sm:px-8 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">The full picture, all in one app</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">Built for people who actually care about maximizing every dollar spent.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "AI rewards assistant", "Spending insights & trends", "Transfer partner calculator",
                  "Spending budgets & alerts", "CSV import & export", "Application tracker",
                  "Custom card nicknames", "Statement credit tracker", "Per-card rewards summary",
                  "Dark & light mode", "Mobile-friendly PWA", "Global cmd+K search",
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
        <section className="py-20 px-6 sm:px-8 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Simple pricing</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Start free. Upgrade when you want automatic bank sync.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Free */}
              <div className="rounded-2xl border border-border bg-card p-8">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Free</p>
                <p className="text-4xl font-bold mb-1">$0</p>
                <p className="text-sm text-muted-foreground mb-6">Forever free, no card required</p>
                <div className="space-y-3 mb-8">
                  {[
                    "59+ card templates",
                    "Manual transaction entry",
                    "Rewards optimization",
                    "AI assistant",
                    "Spending insights",
                    "Goals & budgets",
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
                  className="block text-center rounded-xl border border-border py-3 text-sm font-semibold hover:bg-muted/40 transition-all"
                >
                  Get started free
                </Link>
              </div>

              {/* Premium */}
              <div className="rounded-2xl border border-primary/40 bg-primary/[0.05] p-8 relative">
                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                  POPULAR
                </div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Premium</p>
                <p className="text-4xl font-bold mb-1">$9.99</p>
                <p className="text-sm text-muted-foreground mb-6">per month, cancel anytime</p>
                <div className="space-y-3 mb-8">
                  {[
                    "Everything in Free",
                    "Bank account sync (Plaid)",
                    "Automatic transaction import",
                    "All accounts in one view",
                    "Real-time balance data",
                    "Priority support",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup"
                  className="block text-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                >
                  Start free trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-6 sm:px-8 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden bg-primary/[0.08] border border-primary/20 p-12 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.12] to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Start earning more from every purchase</h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">Free to start. Connect your bank for automatic sync. Set up in under 2 minutes.</p>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-10 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                >
                  Create free account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6 sm:px-8">
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
