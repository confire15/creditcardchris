"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  CreditCard,
  Gift,
  Lock,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const trustItems = [
  "Manual card setup",
  "No bank login required",
  "Built for 5-10+ card wallets",
];

const featureItems: {
  icon: LucideIcon;
  title: string;
  eyebrow: string;
  description: string;
  details: string[];
  tier?: "Free" | "Premium" | "Free + Premium";
}[] = [
  {
    icon: TrendingUp,
    eyebrow: "Premium command center",
    title: "Wallet ROI Autopilot",
    tier: "Premium",
    description:
      "Turn card fees, credits, perks, rewards, SUBs, and retention value into one annual ROI view.",
    details: [
      "Net value across every card",
      "Top money leaks and unused value",
      "Simplification nudges for overlapping cards",
    ],
  },
  {
    icon: CalendarClock,
    eyebrow: "Annual fee decisions",
    title: "Renewal Rescue Center",
    tier: "Premium",
    description:
      "See upcoming annual fees, refund windows, retention notes, downgrade paths, and a recommended action.",
    details: [
      "Annual fee timeline",
      "Refund-window reminders",
      "Retention and downgrade planning",
    ],
  },
  {
    icon: Gift,
    eyebrow: "Statement credit recovery",
    title: "Coupon Book Copilot",
    tier: "Free + Premium",
    description:
      "Track statement credits by cadence, usage, organic value, activation hints, and what is still at risk.",
    details: [
      "Monthly, quarterly, and annual cadence",
      "Unused high-value credit alerts",
      "Merchant and activation guidance",
    ],
  },
  {
    icon: Sparkles,
    eyebrow: "New card bonuses",
    title: "SUB/MSR Command Center",
    tier: "Premium",
    description:
      "Track sign-up bonus spend, deadline pace, value earned, and whether you need to adjust spending.",
    details: [
      "Minimum spend progress",
      "Behind-pace warnings",
      "Deadline reminders",
    ],
  },
  {
    icon: Wallet,
    eyebrow: "Manual points tracking",
    title: "No-Password Points Wallet",
    tier: "Premium",
    description:
      "Track program balances, point valuations, owners, notes, and expiration dates without sharing logins.",
    details: [
      "Manual loyalty balances",
      "Expiration sorting",
      "Point valuation rollups",
    ],
  },
  {
    icon: CreditCard,
    eyebrow: "Quarterly cards",
    title: "Rotating Category Tracker",
    tier: "Premium",
    description:
      "Activate quarterly categories, watch caps, and remember which 5x card belongs at checkout.",
    details: [
      "Curated quarterly categories",
      "Activation status",
      "Cap progress tracking",
    ],
  },
  {
    icon: Tags,
    eyebrow: "Merchant offers",
    title: "Offer Matcher Lite",
    tier: "Premium",
    description:
      "Keep card-linked offers in one place so expiring credits and minimum-spend deals do not disappear unused.",
    details: ["Merchant and card matching", "Offer value and minimum spend", "Expiration and used status"],
  },
  {
    icon: Users,
    eyebrow: "Household clarity",
    title: "Household Card Instructions",
    tier: "Premium",
    description:
      "Give a partner simple card-use notes for groceries, dining, gas, travel, and everyday edge cases.",
    details: ["Partner-facing instructions", "Household card context", "Plain-language purchase notes"],
  },
  {
    icon: ShieldCheck,
    eyebrow: "Coverage lookup",
    title: "Benefits & Protections Finder",
    tier: "Premium",
    description:
      "Find which cards carry trip delay, purchase protection, rental coverage, extended warranty, and more.",
    details: ["Curated protection reference", "Card-level coverage lookup", "Benefit search by use case"],
  },
  {
    icon: Bell,
    eyebrow: "Change monitoring",
    title: "Card Change Watchlist",
    tier: "Premium",
    description:
      "See fee, credit, and benefit changes with personalized impact based on the cards in your wallet.",
    details: ["Curated change events", "Personalized impact notes", "Dismissible watchlist alerts"],
  },
];

const coreFeatures = [
  "Best Card Finder",
  "Wallet management",
  "Benefits/perks tracker",
  "Fee Calculator",
  "Keep or Cancel",
  "Alerts Hub",
];

const freeFeatures = [
  "Wallet and card tracking",
  "Best Card Finder category ranking",
  "Non-AI purchase search",
  "Dashboard overview",
  "Benefits / statement credit tracking",
  "Basic Keep or Cancel verdicts",
  "Annual Fee Calculator",
];

const premiumFeatures = [
  "Wallet ROI Autopilot",
  "Renewal Rescue Center",
  "Coupon Book Copilot alerts",
  "SUB/MSR Command Center",
  "Points Wallet and expiring point reminders",
  "Rotating categories and offer expirations",
  "Household card instructions",
  "Benefits protections and card-change impact alerts",
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
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-overlay-subtle bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Manual setup. No bank login required.
            </div>
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Credit Card Chris
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Optimize which card to use, capture statement credits and offers, watch SUBs
              and points, and know whether each annual fee still earns its place.
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
          <MockSectionTitle icon={TrendingUp} title="Wallet ROI Autopilot" label="Premium" />
          <div className="rounded-xl border border-primary/30 bg-primary/[0.08] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Projected net value</p>
                <p className="mt-1 text-3xl font-bold text-primary">+$1,284</p>
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary">
                82% credit capture
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <ValueChip label="Credits" value="+$840" />
              <ValueChip label="Rewards" value="+$514" />
              <ValueChip label="Fees" value="-$670" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <MockSectionTitle icon={Gift} title="Credit leaks" label="$166 at risk" />
              <div className="mt-3 space-y-3">
                <ProgressPreview title="Dining credit" value="$84 left" width="44%" color="bg-amber-400" />
                <ProgressPreview title="Airline credit" value="$50 left" width="25%" color="bg-blue-500" />
                <ProgressPreview title="Digital credit" value="$32 left" width="68%" color="bg-emerald-500" />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3">
              <MockSectionTitle icon={Sparkles} title="SUB pace" label="22 days" />
              <div className="mt-3 space-y-3">
                <ProgressPreview title="Venture X bonus" value="$1,850 left" width="54%" color="bg-primary" />
                <p className="rounded-lg bg-background/70 px-3 py-2 text-[10px] text-muted-foreground">
                  Need $84/day to finish on time.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-border/70 bg-card p-3">
            <MockSectionTitle icon={CalendarClock} title="Renewal Rescue" label="Action needed" />
            <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Amex Platinum</p>
                  <p className="text-xs text-muted-foreground">Refund window closes May 28</p>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-500">
                  CALL
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <ValueChip label="Net" value="+$94" />
                <ValueChip label="Retention" value="$200 target" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-3">
            <MockSectionTitle icon={Bell} title="Smart Alerts" label="Premium" />
            <div className="mt-3 space-y-2">
              {[
                "Chase Freedom: activate Amazon 5x",
                "Hilton points expire in 34 days",
                "Uber offer expires Friday",
                "Annual fee refund window closes soon",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-background/70 px-3 py-2">
                  <Bell className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <p className="min-w-0 truncate text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-3 sm:col-span-2 lg:col-span-1">
            <MockSectionTitle icon={Users} title="Household instructions" label="Partner view" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <p className="rounded-lg bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                Groceries: use Gold.
              </p>
              <p className="rounded-lg bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                Travel: use Sapphire.
              </p>
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
            A premium command center for serious rewards wallets.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Start with the core tools, then let Premium watch the renewal dates,
            credits, offers, SUBs, points, and card changes that decide real value.
          </p>
        </div>

        <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {coreFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-2 rounded-xl border border-overlay-subtle bg-card px-4 py-3 text-sm font-medium">
              <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureItems.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof featureItems)[number];
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
            Premium is for users managing annual fees, credits, SUBs, offers, points,
            household card choices, and card-change decisions across a larger wallet.
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
            {highlighted ? (
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            ) : feature.startsWith("Smart Alerts") ? (
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
            ) : (
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            )}
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
