"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Sparkles,
  Check,
  ArrowRight,
  Sun,
  Moon,
  CreditCard,
  Utensils,
  ShoppingCart,
  Fuel,
  Plane,
  Tv,
  ShoppingBag,
  Trophy,
  ChevronDown,
  Wallet,
  Target,
  Scale,
  Lock,
  Bell,
  Calendar,
} from "lucide-react";

/* ─── Demo data ──────────────────────────────────────────────────────────── */

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

const FEATURES = [
  { icon: Trophy,    title: "Best Card Finder",   desc: "Instantly ranks your cards by reward rate for any category." },
  { icon: Wallet,    title: "Digital Wallet",      desc: "104+ card templates. Drag to reorder, archive, and override rates." },
  { icon: Sparkles,  title: "Statement Credits",   desc: "Progress bars, reset tracking, and log usage in one tap." },
  { icon: Calendar,  title: "Perks & Resets",      desc: "Track Amex and Chase perks. Never miss a quarterly or annual reset." },
  { icon: Scale,     title: "Keep or Cancel",      desc: "KEEP / CANCEL / CLOSE CALL verdict per annual-fee card, with downgrade paths." },
  { icon: Bell,      title: "Smart Alerts",        desc: "Free push notifications for fees, perks, and budget. Email + SMS on Premium." },
];

const TESTIMONIALS = [
  { quote: "I used to fumble through 6 cards at checkout. Now I just check the app \u2014 takes 2 seconds.", initials: "MR", name: "Mike R.", role: "7 cards" },
  { quote: "The Keep or Cancel feature saved me $550 in annual fees I was wasting on cards I didn\u2019t need.", initials: "JL", name: "Jessica L.", role: "12 cards" },
  { quote: "Finally an app that just tells me the best card. No budgets, no transactions, just answers.", initials: "DK", name: "David K.", role: "5 cards" },
];

const FAQS = [
  { q: "How do I cancel Premium?", a: "One click in Settings. You keep free-tier access and all your data." },
  { q: "Is my financial data safe?", a: "We never ask for bank logins. You add cards manually \u2014 no sensitive credentials stored." },
  { q: "What alerts does Premium include?", a: "All push alerts are free (annual fee reminders, perk reset, budget). Premium adds email and text (SMS) as extra channels for the same alerts." },
];

/* ─── Hooks ──────────────────────────────────────────────────────────────── */

function useScrollReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("reveal-visible"); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [demoCategory, setDemoCategory] = useState<string>("dining");
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const demoRef = useScrollReveal();
  const featuresRef = useScrollReveal();
  const socialRef = useScrollReveal();
  const pricingRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  const cardsCount = useCountUp(104);
  const categoriesCount = useCountUp(17);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-overlay-subtle backdrop-blur-xl bg-background/80">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Credit Card Chris" className="h-8 w-auto" />
            <span className="hidden sm:block text-lg font-bold tracking-tight">Credit Card Chris</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-overlay-hover transition-all cursor-pointer"
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
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-[0.98] whitespace-nowrap"
            >
              <span className="sm:hidden">Get started</span>
              <span className="hidden sm:inline">Start free</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-24 pb-20 px-6 sm:px-8">
          {/* Background effects */}
          <div className="absolute inset-0 dot-pattern pointer-events-none" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.07] blur-3xl pointer-events-none animate-[drift_10s_ease-in-out_infinite]" />
          <div className="absolute top-40 right-0 w-[500px] h-[500px] rounded-full bg-amber-400/[0.03] blur-3xl pointer-events-none animate-[drift_13s_ease-in-out_infinite_reverse]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none animate-[drift_9s_ease-in-out_infinite_2s]" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/[0.08] text-primary text-sm font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              More rewards, zero spreadsheets
            </div>

            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              Which card should
              <br />
              <span className="text-primary">you use right now?</span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
              Know which card earns the most at every checkout &mdash; and whether your annual fees are worth keeping.
            </p>

            <div className="flex items-center justify-center gap-3 sm:gap-5 mb-10 text-sm text-muted-foreground">
              <span ref={cardsCount.ref}>{cardsCount.count}+ cards</span>
              <span className="text-border">&middot;</span>
              <span ref={categoriesCount.ref}>{categoriesCount.count} categories</span>
              <span className="text-border">&middot;</span>
              <span>Free to start</span>
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Start free &mdash; 2 min setup
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Demo ──────────────────────────────────────────────────────────── */}
        <section id="demo" ref={demoRef as React.RefObject<HTMLElement>} className="reveal-section py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: text + steps */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/[0.08] text-primary text-xs font-medium mb-6">
                  <Sparkles className="w-3 h-3" />
                  Live demo
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl tracking-tight mb-4">
                  The answer in<br />2 seconds flat
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  Tap a category. Your cards rank by reward rate instantly &mdash; no math, no guessing.
                </p>

                {/* Compact steps */}
                <ol className="space-y-3 mb-8">
                  {[
                    { n: 1, text: "Add your cards — 104+ templates, takes 2 minutes." },
                    { n: 2, text: "Pick a spending category — 17 covered." },
                    { n: 3, text: "See your best card instantly ranked by reward rate." },
                  ].map(({ n, text }) => (
                    <li key={n} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                        {n}
                      </span>
                      {text}
                    </li>
                  ))}
                </ol>

                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  Try it with your cards
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Right: app mockup */}
              <div className="relative">
                <div className="absolute inset-0 bg-primary/[0.06] blur-3xl rounded-3xl pointer-events-none" />
                <div className="relative rounded-3xl border border-white/[0.08] bg-[#0f1117] p-4 sm:p-6 shadow-2xl overflow-hidden dark-mockup">
                  {/* Top edge highlight */}
                  <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
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
                  <div key={demoCategory} className="space-y-2">
                    <p className="text-xs text-white/40 font-medium mb-2">
                      Best cards for <span className="text-orange-400">{DEMO_CATEGORIES.find(c => c.id === demoCategory)?.label}</span>
                    </p>
                    {(DEMO_RESULTS[demoCategory] ?? []).map((card, i) => (
                      <div
                        key={card.name}
                        style={{ animation: `stagger-slide-up 0.3s ease-out ${i * 60}ms both` }}
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
                          <p className="text-xs font-medium text-white/90">{card.name}</p>
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

        {/* ── Features Grid ─────────────────────────────────────────────────── */}
        <section ref={featuresRef as React.RefObject<HTMLElement>} className="reveal-section py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl tracking-tight mb-4">Everything you need to maximize rewards</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Six tools, one mission: never leave points on the table.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-overlay-subtle bg-card p-7 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 transition-all duration-200 group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Testimonials ──────────────────────────────────────────────────── */}
        <section ref={socialRef as React.RefObject<HTMLElement>} className="reveal-section py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="rounded-2xl border border-overlay-subtle bg-card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────────── */}
        <section ref={pricingRef as React.RefObject<HTMLElement>} className="reveal-section py-20 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-heading text-3xl sm:text-4xl tracking-tight mb-4">Simple pricing</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                Core features free forever. Premium unlocks the full Keep or Cancel analysis and email/SMS alerts.
              </p>
              {/* Billing toggle */}
              <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-overlay-subtle gap-0.5">
                <button
                  onClick={() => setBilling("yearly")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${billing === "yearly" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Yearly <span className="text-emerald-500 text-xs font-semibold ml-1">&ndash;17%</span>
                </button>
                <button
                  onClick={() => setBilling("monthly")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${billing === "monthly" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Free */}
              <div className="rounded-2xl border border-overlay-subtle bg-card p-8 hover:shadow-md hover:border-border transition-all duration-200">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Free</p>
                <div className="flex items-end gap-1 mb-1">
                  <p className="text-4xl font-bold">$0</p>
                </div>
                <p className="text-sm text-muted-foreground mb-6">No credit card required</p>
                <div className="space-y-3 mb-8">
                  {[
                    "Best card recommendations",
                    "Statement credits + perks tracker",
                    "104+ cards supported",
                    "Push alerts (fees, perks, budget)",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                  {["Keep or Cancel analysis", "Email & SMS alerts"].map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground/40">
                      <Lock className="w-4 h-4 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup"
                  className="block text-center rounded-xl border border-overlay-subtle py-3 text-sm font-semibold hover:bg-overlay-hover active:scale-[0.98] transition-all"
                >
                  Get started free
                </Link>
              </div>

              {/* Premium */}
              <div className="rounded-2xl border border-primary/40 bg-primary/[0.05] p-8 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/[0.08] blur-2xl pointer-events-none" />
                {/* Most popular badge */}
                <div className="absolute -top-px left-1/2 -translate-x-1/2 px-3 py-1 rounded-b-lg bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25">
                  Most popular
                </div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 mt-2">Premium</p>
                {billing === "yearly" ? (
                  <>
                    <div className="flex items-end gap-1 mb-1">
                      <p className="text-4xl font-bold">$39</p>
                      <p className="text-sm text-muted-foreground mb-1.5">/yr</p>
                    </div>
                    <p className="text-xs text-emerald-400 font-medium mb-1 animate-[pop-in_0.2s_ease_both]">$3.25/mo equiv. &mdash; save 17%</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-end gap-1 mb-1">
                      <p className="text-4xl font-bold">$3.99</p>
                      <p className="text-sm text-muted-foreground mb-1.5">/mo</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">$47.88/yr billed monthly</p>
                  </>
                )}
                <p className="text-sm text-muted-foreground mb-6">Cancel anytime</p>
                <div className="space-y-3 mb-8">
                  {[
                    "Everything in Free",
                    "Full Keep or Cancel analysis",
                    "No-fee alternatives + downgrade paths",
                    "Email & SMS alerts",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup"
                  className="block text-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-[0.98] transition-all relative z-10"
                >
                  Start free &rarr; upgrade later
                </Link>
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-12 max-w-2xl mx-auto space-y-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="rounded-xl border border-overlay-subtle overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-left hover:bg-overlay-hover transition-colors cursor-pointer"
                  >
                    {faq.q}
                    <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 ml-2 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  <div
                    className="grid transition-all duration-200 ease-out"
                    style={{ gridTemplateRows: openFaq === i ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section ref={ctaRef as React.RefObject<HTMLElement>} className="reveal-section py-24 px-6 sm:px-8 border-t border-overlay-subtle">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden bg-primary/[0.08] border border-primary/20 p-12 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.14] to-transparent pointer-events-none" />
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary/[0.12] blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl tracking-tight mb-4">
                  Start earning more in 2 minutes
                </h2>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-10 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Create free account
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link href="/login" className="text-foreground hover:text-primary transition-colors">
                    Sign in &rarr;
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-overlay-subtle py-10 px-6 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-8">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Credit Card Chris" className="h-7 w-auto" />
              <div>
                <p className="text-sm font-semibold leading-tight">Credit Card Chris</p>
                <p className="text-xs text-muted-foreground leading-tight">Which card should you use right now?</p>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
              <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
            </div>
          </div>

          <div className="border-t border-overlay-subtle pt-6">
            <p className="text-xs text-muted-foreground text-center sm:text-left">&copy; {new Date().getFullYear()} Credit Card Chris. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
