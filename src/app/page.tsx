"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Bell,
  Calculator,
  Check,
  CreditCard,
  Gift,
  Moon,
  Scale,
  Sparkles,
  Sun,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const trustItems = [
  "Manual card setup",
  "No bank login required",
  "Built for 5-10+ card wallets",
];

type FeatureItem = {
  icon: LucideIcon;
  title: string;
  eyebrow: string;
  description: string;
  details: string[];
  tier?: "Free" | "Premium" | "Free + Premium";
};

const coreFeatureItems: FeatureItem[] = [
  {
    icon: Sparkles,
    eyebrow: "Purchase decisions",
    title: "Best Card Finder",
    tier: "Free",
    description:
      "Pick a category or search a purchase, then see which saved card earns the most before you pay.",
    details: [
      "Category ranking for your wallet",
      "Purchase search for common spending",
      "Saved-card recommendations at checkout",
    ],
  },
  {
    icon: Wallet,
    eyebrow: "Wallet source of truth",
    title: "Wallet Management",
    tier: "Free",
    description:
      "Build and maintain the card list that powers every recommendation, fee check, and benefit reminder.",
    details: [
      "Supported templates and custom cards",
      "Reward overrides and card details",
      "Archive, reorder, and review cards",
    ],
  },
  {
    icon: Gift,
    eyebrow: "Benefits you already pay for",
    title: "Benefits / Perks Tracker",
    tier: "Free + Premium",
    description:
      "Track statement credits and card perks so annual-fee benefits do not quietly expire unused.",
    details: [
      "Statement credit and perk tracking",
      "Reset dates and usage progress",
      "Unused value surfaced before it expires",
    ],
  },
  {
    icon: Calculator,
    eyebrow: "Quick fee math",
    title: "Fee Calculator",
    tier: "Free",
    description:
      "Run a guided annual-fee scenario before applying for or renewing a premium card.",
    details: [
      "Step-by-step annual-fee math",
      "Credit assumptions you can adjust",
      "Reward assumptions for your spend",
    ],
  },
  {
    icon: Scale,
    eyebrow: "Keep or cancel",
    title: "Keep or Cancel",
    tier: "Free + Premium",
    description:
      "Get a simple verdict on annual-fee cards, then upgrade for deeper value and downgrade analysis.",
    details: [
      "Basic KEEP / CANCEL verdicts",
      "Premium value breakdowns",
      "Alternatives and downgrade guidance",
    ],
  },
  {
    icon: Bell,
    eyebrow: "Reminder center",
    title: "Alerts Hub",
    tier: "Free + Premium",
    description:
      "Preview upcoming card tasks for free, then unlock delivered reminders across your preferred channels.",
    details: [
      "Free preview alert timeline",
      "Premium push, email, and SMS delivery",
      "Annual fee, perk, credit, and budget alerts",
    ],
  },
];

const premiumFeatureItems: FeatureItem[] = [
  {
    icon: Bell,
    eyebrow: "Delivered reminders",
    title: "Smart Alerts",
    tier: "Premium",
    description:
      "Turn the alert preview into reminders delivered through the channels you choose.",
    details: [
      "Annual fee and benefit reminders",
      "Email and SMS channels where supported",
      "One place to review upcoming card tasks",
    ],
  },
  {
    icon: Scale,
    eyebrow: "Annual fee decisions",
    title: "Full Keep or Cancel",
    tier: "Premium",
    description:
      "Unlock the detailed math and next steps behind each annual-fee card verdict.",
    details: [
      "Full value breakdown",
      "Top no-fee alternatives",
      "Downgrade and product-change guidance",
    ],
  },
];

const freeFeatures = [
  "Best Card Finder with category ranking",
  "Wallet management for saved cards",
  "Benefits / perks tracker",
  "Annual Fee Calculator",
  "Basic Keep or Cancel verdicts",
  "Alerts Hub preview timeline",
  "Dashboard overview",
];

const premiumFeatures = [
  "Everything in Free",
  "Delivered Smart Alerts",
  "Email and SMS alert channels where supported",
  "Full Keep or Cancel value breakdown",
  "Top no-fee alternatives",
  "Downgrade and product-change guidance",
  "$39/yr option available",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        <HeroProductPreview />
        <FeatureHierarchy />
        <PricingComparison />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}

function LandingHeader() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-overlay-subtle bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <img src="/logo.png" alt="Credit Card Chris" className="h-8 w-auto flex-shrink-0" />
          <span className="hidden text-lg font-bold tracking-tight sm:block">
            Credit Card Chris
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="hover:text-foreground">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-overlay-hover hover:text-foreground"
            aria-label="Toggle theme"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            ) : (
              <span className="h-4 w-4" />
            )}
          </button>
          <Link
            href="/login"
            className="hidden rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-overlay-hover hover:text-foreground sm:block"
          >
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroProductPreview() {
  return (
    <section className="border-b border-overlay-subtle px-5 py-12 sm:px-8 sm:py-14 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-2xl border border-overlay-subtle bg-card shadow-sm shadow-black/20">
          <div className="absolute inset-0 bg-background/55 dark:bg-background/35" />
          <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-background via-background/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card to-transparent" />

          <div className="relative z-10 px-5 pb-7 pt-10 text-center sm:px-8 sm:pt-12 lg:px-12">
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Credit Card Chris
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Know which card to use, track statement credits and perks, and decide
              whether each annual fee still earns its place.
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/signup">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <a href="#features">See features</a>
              </Button>
            </div>

            <div className="mx-auto mt-7 flex max-w-2xl flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              {trustItems.map((item) => (
                <div key={item} className="flex items-center justify-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 px-3 pb-3 sm:px-5 sm:pb-5 lg:max-h-[360px] lg:overflow-hidden lg:px-8 lg:pb-8">
            <ProductMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductMockup() {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl shadow-black/20 dark:border-white/[0.08] dark:bg-[#10131a] sm:p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/75" />
        </div>
        <p className="truncate text-xs font-medium text-muted-foreground">Dashboard preview</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          <MockSectionTitle icon={Scale} title="Keep or Cancel" label="Premium detail" />
          <div className="rounded-xl border border-primary/30 bg-primary/[0.08] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Annual fee verdict</p>
                <p className="mt-1 text-3xl font-bold text-primary">KEEP</p>
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary">
                +$214 net value
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <ValueChip label="Credits" value="+$300" />
              <ValueChip label="Rewards" value="+$409" />
              <ValueChip label="Fee" value="-$495" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <MockSectionTitle icon={Gift} title="Benefits" label="$84 left" />
              <div className="mt-3 space-y-3">
                <ProgressPreview title="Dining credit" value="$84 left" width="44%" color="bg-amber-400" />
                <ProgressPreview title="Airline credit" value="$50 left" width="25%" color="bg-blue-500" />
                <ProgressPreview title="Digital credit" value="$32 left" width="68%" color="bg-emerald-500" />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3">
              <MockSectionTitle icon={Sparkles} title="Best Card" label="Next purchase" />
              <div className="mt-3 space-y-3">
                <ProgressPreview title="Dining" value="4x" width="80%" color="bg-primary" />
                <p className="rounded-lg bg-background/70 px-3 py-2 text-[10px] text-muted-foreground">
                  Use Amex Gold for restaurants and groceries.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-border/70 bg-card p-3">
            <MockSectionTitle icon={Scale} title="No-fee alternatives" label="Premium" />
            <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Downgrade path found</p>
                  <p className="text-xs text-muted-foreground">Keep points active with a lower-fee card</p>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-500">
                  SAVE
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <ValueChip label="Option" value="$0 fee" />
                <ValueChip label="Action" value="Call bank" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-3">
            <MockSectionTitle icon={Bell} title="Smart Alerts" label="Premium" />
            <div className="mt-3 space-y-2">
              {[
                "Annual fee due in 30 days",
                "Dining credit resets next week",
                "Perk value still unused",
                "Monthly budget is near its limit",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-background/70 px-3 py-2">
                  <Bell className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <p className="min-w-0 truncate text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockSectionTitle({
  icon: Icon,
  title,
  label,
}: {
  icon: LucideIcon;
  title: string;
  label?: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
        <p className="truncate text-xs font-semibold">{title}</p>
      </div>
      {label && <span className="flex-shrink-0 text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
}

function ProgressPreview({
  title,
  value,
  width,
  color,
}: {
  title: string;
  value: string;
  width: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="truncate text-muted-foreground">{title}</span>
        <span className="flex-shrink-0 font-medium">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

function ValueChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/70 px-2 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function FeatureHierarchy() {
  return (
    <section id="features" className="border-b border-overlay-subtle px-5 py-16 sm:px-8 lg:pb-20 lg:pt-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold text-primary">Features</p>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Useful free tools first. Premium intelligence when your wallet grows.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Credit Card Chris starts with the everyday decisions: which card to use,
            what benefits you have, and whether annual fees make sense.
          </p>
        </div>

        <div>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Core tools</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">Everything you need to start optimizing.</h3>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              These are the daily-use features that stay valuable even before Premium.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coreFeatureItems.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index + 1} />
            ))}
          </div>
        </div>

        <div className="mt-12">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Premium upgrades</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">Delivered alerts and deeper fee decisions.</h3>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Premium keeps the offer simple: reminders that reach you, plus the full annual-fee analysis.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {premiumFeatureItems.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index + 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: FeatureItem;
  index: number;
}) {
  const Icon = feature.icon;

  return (
    <article className="rounded-2xl border border-overlay-subtle bg-card p-5 shadow-sm shadow-black/5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          {feature.tier && (
            <span className="rounded-full border border-border bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              {feature.tier}
            </span>
          )}
          <span className="text-xs font-medium text-muted-foreground">{index}</span>
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{feature.eyebrow}</p>
      <h3 className="mt-1 text-lg font-semibold">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
      <ul className="mt-4 space-y-2">
        {feature.details.map((detail) => (
          <li key={detail} className="flex gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PricingComparison() {
  return (
    <section id="pricing" className="border-b border-overlay-subtle px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Pricing</p>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Start with the core tools. Upgrade when your wallet gets expensive.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Premium is for users who want reminders delivered before card value slips away,
            and a complete answer on whether annual-fee cards are worth keeping.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <PricingCard
            title="Free"
            price="$0"
            description="No credit card required."
            features={freeFeatures}
            cta="Get started free"
            href="/signup"
          />
          <PricingCard
            title="Premium"
            price="$3.99"
            suffix="/mo"
            description="Cancel anytime in Settings."
            features={premiumFeatures}
            cta="Start free, upgrade later"
            href="/signup"
            highlighted
          />
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  title,
  price,
  suffix,
  description,
  features,
  cta,
  href,
  highlighted = false,
}: {
  title: string;
  price: string;
  suffix?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm shadow-black/5 ${
        highlighted
          ? "border-primary/35 bg-primary/[0.06]"
          : "border-overlay-subtle bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${highlighted ? "text-primary" : "text-muted-foreground"}`}>
            {title}
          </p>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-4xl font-bold tracking-tight">{price}</span>
            {suffix && <span className="pb-1 text-sm text-muted-foreground">{suffix}</span>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {highlighted && (
          <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            Premium
          </span>
        )}
      </div>

      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
            <Check
              className={`mt-0.5 h-4 w-4 flex-shrink-0 ${highlighted ? "text-primary" : "text-emerald-500"}`}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button asChild variant={highlighted ? "default" : "outline"} className="mt-7 w-full">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

function FinalCta() {
  return (
    <section className="px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Build your rewards wallet in minutes.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          Add your cards, check which one to use, and get a clearer view of the value
          behind every annual fee.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link href="/signup">
            Create free account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-overlay-subtle px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Credit Card Chris" className="h-7 w-auto" />
          <div>
            <p className="text-sm font-semibold leading-tight">Credit Card Chris</p>
            <p className="text-xs text-muted-foreground leading-tight">
              Know which card to use.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            Sign up
          </Link>
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="hover:text-foreground">
            Pricing
          </a>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-overlay-subtle pt-6 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Credit Card Chris. All rights reserved.
      </p>
    </footer>
  );
}
