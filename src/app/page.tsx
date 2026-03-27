"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Sparkles,
  Check,
  ArrowRight,
  Sun,
  Moon,
  CreditCard,
  Gift,
  Bell,
  Utensils,
  ShoppingCart,
  Fuel,
  Plane,
  Tv,
  ShoppingBag,
  Trophy,
} from "lucide-react";

const DEMO_CATEGORIES = [
  { id: "dining",    Icon: Utensils,     label: "Dining",    color: "#f97316" },
  { id: "groceries", Icon: ShoppingCart, label: "Groceries", color: "#22c55e" },
  { id: "gas",       Icon: Fuel,         label: "Gas",       color: "#eab308" },
  { id: "travel",    Icon: Plane,        label: "Travel",    color: "#3b82f6" },
  { id: "streaming", Icon: Tv,           label: "Streaming", color: "#a855f7" },
  { id: "online",    Icon: ShoppingBag,  label: "Online",    color: "#ec4899" },
] as const;

const DEMO_RESULTS: Record<string, { name: string; rate: string; unit: string; color: string }[]> = {
  dining: [
    { name: "Amex Gold",               rate: "4x", unit: "points",   color: "#c9a840" },
    { name: "Chase Sapphire Preferred", rate: "3x", unit: "points",   color: "#1a56db" },
    { name: "Citi Double Cash",         rate: "2x", unit: "cashback", color: "#be123c" },
  ],
  groceries: [
    { name: "Blue Cash Preferred",      rate: "6%", unit: "cashback", color: "#0ea5e9" },
    { name: "Amex Gold",               rate: "4x", unit: "points",   color: "#c9a840" },
    { name: "Chase Freedom Flex",       rate: "3x", unit: "cashback", color: "#1a56db" },
  ],
  gas: [
    { name: "Citi Custom Cash",         rate: "5x", unit: "cashback", color: "#be123c" },
    { name: "Chase Freedom Flex",       rate: "3x", unit: "cashback", color: "#1a56db" },
    { name: "Citi Double Cash",         rate: "2x", unit: "cashback", color: "#be123c" },
  ],
  travel: [
    { name: "Chase Sapphire Reserve",   rate: "3x", unit: "points",   color: "#1a1a2e" },
    { name: "Capital One Venture X",    rate: "2x", unit: "miles",    color: "#c41230" },
    { name: "Chase Sapphire Preferred", rate: "2x", unit: "points",   color: "#1a56db" },
  ],
  streaming: [
    { name: "Citi Custom Cash",         rate: "5x", unit: "cashback", color: "#be123c" },
    { name: "Chase Sapphire Reserve",   rate: "3x", unit: "points",   color: "#1a1a2e" },
    { name: "Amex Gold",               rate: "1x", unit: "points",   color: "#c9a840" },
  ],
  online: [
    { name: "Chase Freedom Flex",       rate: "5x", unit: "cashback", color: "#1a56db" },
    { name: "Citi Custom Cash",         rate: "5x", unit: "cashback", color: "#be123c" },
    { name: "Citi Double Cash",         rate: "2x", unit: "cashback", color: "#be123c" },
  ],
};

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [demoCategory, setDemoCategory] = useState<string>("dining");

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
              More rewards, zero spreadsheets.
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              Which card should
              <br />
              <span className="text-primary">you use right now?</span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Tap a category. See your best card in 2 seconds. Stop leaving hundreds of dollars in rewards on the table every year.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                Start free — 2 min setup
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
                { value: "104+", label: "Cards supported" },
                { value: "20+", label: "Issuers covered" },
                { value: "17", label: "Spending categories" },
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

        {/* Interactive Demo */}
        <section className="py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: text */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/[0.08] text-primary text-xs font-medium mb-6">
                  <Sparkles className="w-3 h-3" />
                  Live demo
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  The answer in<br />2 seconds flat
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Tap any category on the right. Your cards rank instantly by reward rate — no mental math, no second-guessing.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {[
                    "Multipliers from 104+ real cards pre-loaded",
                    "Custom overrides for your actual rates",
                    "Break-even shown for annual fee cards",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 mt-8 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                >
                  Try it with your cards
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Right: app mockup */}
              <div className="relative">
                {/* Glow */}
                <div className="absolute inset-0 bg-primary/[0.06] blur-3xl rounded-3xl pointer-events-none" />
                <div className="relative rounded-3xl border border-white/[0.08] bg-[#0f1117] p-4 sm:p-6 shadow-2xl">
                  {/* Mock header */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    <div className="ml-2 text-xs text-white/30 font-medium">Best Card Finder</div>
                  </div>

                  {/* Category grid */}
                  <p className="text-xs text-white/40 font-medium mb-3">Pick a category</p>
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {DEMO_CATEGORIES.map(({ id, Icon, label, color }) => {
                      const isSelected = demoCategory === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setDemoCategory(id)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "border-orange-500/50 bg-orange-500/10"
                              : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]"
                          }`}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: isSelected ? "#d4621a" : color }}
                          />
                          <span className={`text-[10px] font-medium leading-none ${isSelected ? "text-orange-400" : "text-white/50"}`}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Results */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 font-medium mb-2">
                      Best cards for <span className="text-orange-400">{DEMO_CATEGORIES.find(c => c.id === demoCategory)?.label}</span>
                    </p>
                    {(DEMO_RESULTS[demoCategory] ?? []).map((card, i) => (
                      <div
                        key={card.name}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          i === 0
                            ? "border-orange-500/30 bg-orange-500/[0.06]"
                            : "border-white/[0.06] bg-white/[0.02]"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          i === 0 ? "bg-orange-500 text-white" : "bg-white/10 text-white/50"
                        }`}>
                          {i === 0 ? <Trophy className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <div
                          className="w-8 h-5 rounded flex-shrink-0"
                          style={{ backgroundColor: card.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/90 truncate">{card.name}</p>
                          <p className="text-[10px] text-white/40">{card.unit}</p>
                        </div>
                        <div className={`text-sm font-bold flex-shrink-0 ${i === 0 ? "text-orange-400" : "text-white/70"}`}>
                          {card.rate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">How it works</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Set up once. Use every time you pull out your wallet.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Add your cards",
                  desc: "Choose from 104+ cards. Reward rates and bonus categories come pre-loaded — no manual setup needed.",
                },
                {
                  step: "02",
                  title: "Tap a category at checkout",
                  desc: "Dining, groceries, gas, travel — tap any category and instantly see your cards ranked by reward rate. Use the best one.",
                },
                {
                  step: "03",
                  title: "Never miss a credit",
                  desc: "Track statement credits per card with progress bars. Get notified before monthly or annual credits reset unused.",
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

        {/* Testimonials */}
        <section className="py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Loved by rewards maximizers</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Real people earning more on every swipe.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  quote: "I was leaving hundreds of dollars on the table every year using the wrong card for groceries. This app fixed that in 5 minutes.",
                  name: "Marcus T.",
                  role: "Chase Sapphire + Amex Gold user",
                },
                {
                  quote: "The category comparison is unreal. I never knew my Citi card was better than my Chase card for gas until I saw it side by side.",
                  name: "Priya R.",
                  role: "5-card wallet optimizer",
                },
                {
                  quote: "The statement credit tracker is the killer feature. I used to forget my dining credits all the time. Not anymore.",
                  name: "Daniel K.",
                  role: "Travel rewards enthusiast",
                },
              ].map(({ quote, name, role }) => (
                <div key={name} className="p-6 rounded-2xl border border-overlay-subtle bg-card flex flex-col gap-4">
                  <div className="flex gap-0.5 text-primary text-sm">★★★★★</div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3 core features */}
        <section className="py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Three things. Done right.</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                We cut everything that doesn&apos;t help at checkout. What&apos;s left is exactly what you need.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  icon: Sparkles,
                  title: "Best Card Finder",
                  desc: "Tap any of 17 spending categories and instantly see your cards ranked by reward rate. Multiplier, reward type, and break-even shown upfront.",
                  badge: "Core feature",
                },
                {
                  icon: CreditCard,
                  title: "Card Wallet",
                  desc: "Add cards from 104+ supported cards — reward rates, bonus categories, and annual fees pre-loaded. Custom overrides for promotional rates.",
                  badge: null,
                },
                {
                  icon: Gift,
                  title: "Statement Credit Tracker",
                  desc: "Track every annual credit per card with progress bars. Monthly and annual resets. Never let a $10 dining credit go unused again.",
                  badge: null,
                },
              ].map(({ icon: Icon, title, desc, badge }) => (
                <div key={title} className="p-8 rounded-2xl border border-overlay-subtle bg-card hover:bg-overlay-hover transition-colors group relative overflow-hidden">
                  {badge && (
                    <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                      {badge}
                    </div>
                  )}
                  <div className="w-11 h-11 rounded-xl bg-primary/[0.12] group-hover:bg-primary/[0.18] flex items-center justify-center mb-5 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's free */}
        <section className="py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  The whole app is free.<br />Upgrade when you&apos;re ready.
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  The core three features are completely free. Premium unlocks AI category detection and automatic bank sync — coming soon.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                >
                  Create free account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Best card recommendations", premium: false },
                  { label: "104+ cards", premium: false },
                  { label: "Card wallet management", premium: false },
                  { label: "Statement credit tracker", premium: false },
                  { label: "17 spending categories", premium: false },
                  { label: "Mobile-friendly PWA", premium: false },
                  { label: "AI category detection", premium: true },
                  { label: "Bank sync via Plaid", premium: true },
                  { label: "Spending insights", premium: true },
                ].map(({ label, premium }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/[0.15] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{label}</span>
                    {premium && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none">Premium</span>
                    )}
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
                Core features free forever. Upgrade for AI and bank sync.
              </p>
              <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-xl bg-muted/40 border border-overlay-subtle">
                <button
                  onClick={() => setBillingAnnual(false)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${!billingAnnual ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingAnnual(true)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billingAnnual ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Annual
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">Save 17%</span>
                </button>
              </div>
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
                    "Best card recommendations",
                    "104+ cards",
                    "Card wallet management",
                    "Statement credit tracker",
                    "Push notifications",
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
                  COMING SOON
                </div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Premium</p>
                <div className="flex items-end gap-1 mb-1">
                  <p className="text-4xl font-bold">{billingAnnual ? "$3.25" : "$3.99"}</p>
                  <p className="text-sm text-muted-foreground mb-1.5">/mo</p>
                </div>
                {billingAnnual && (
                  <p className="text-xs text-emerald-400 font-medium -mt-1 mb-1">Billed as $39/yr — save $8.88</p>
                )}
                <p className="text-sm text-muted-foreground mb-6">{billingAnnual ? "One payment, full year access" : "Cancel anytime"}</p>
                <div className="space-y-3 mb-8">
                  {[
                    "Everything in Free",
                    "AI category detection",
                    "Bank sync via Plaid",
                    "Automatic transaction import",
                    "Spending insights",
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
                  <Bell className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Stop guessing at checkout
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                  Add your cards in 2 minutes. From now on you&apos;ll always know which one to use.
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
                <p className="text-xs text-muted-foreground mt-6">Free forever · No credit card required</p>
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
          </nav>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Credit Card Chris. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
