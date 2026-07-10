"use client";

import Image from "next/image";
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

const trustItems = ["Manual card setup", "No bank login required"];

type FeatureItem = {
  icon: LucideIcon;
  title: string;
  eyebrow: string;
  description: string;
  details?: string[];
  tier: "Free" | "Premium" | "Free + Premium";
  layout: "wide" | "compact" | "strip";
};

const featureItems: FeatureItem[] = [
  {
    icon: Sparkles,
    eyebrow: "Purchase decisions",
    title: "Best Card Finder",
    tier: "Free",
    layout: "wide",
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
    layout: "wide",
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
    title: "Benefits Tracker",
    tier: "Free + Premium",
    layout: "compact",
    description:
      "Track statement credits and card perks so annual-fee benefits do not quietly expire unused.",
  },
  {
    icon: Calculator,
    eyebrow: "Quick fee math",
    title: "Fee Calculator",
    tier: "Free",
    layout: "compact",
    description:
      "Run a guided annual-fee scenario before applying for or renewing a premium card.",
  },
  {
    icon: Scale,
    eyebrow: "Keep or cancel",
    title: "Keep or Cancel",
    tier: "Free + Premium",
    layout: "compact",
    description:
      "Get a simple verdict on annual-fee cards, then upgrade for deeper value and downgrade analysis.",
  },
  {
    icon: Bell,
    eyebrow: "Reminder center",
    title: "Alerts Hub",
    tier: "Free + Premium",
    layout: "strip",
    description:
      "Preview upcoming card tasks for free, then unlock delivered reminders across your preferred channels.",
    details: [
      "Free preview alert timeline",
      "Premium push, email, and SMS delivery",
      "Annual fee, perk, and credit alerts",
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

function useScrollReveal() {
  useEffect(() => {
    const sections = document.querySelectorAll(".reveal-section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function Home() {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesBento />
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
          <Image src="/logo.png" alt="Credit Card Chris" width={131} height={32} className="h-8 w-auto flex-shrink-0" style={{ width: "auto" }} />
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

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-overlay-subtle px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] top-[-20%] h-[70%] bg-[radial-gradient(42rem_22rem_at_30%_0%,oklch(0.64_0.17_42_/_0.14),transparent_65%),radial-gradient(40rem_20rem_at_75%_10%,oklch(0.58_0.19_250_/_0.10),transparent_65%)]"
      />

      <div className="relative mx-auto max-w-6xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3 w-3" />
          Built for 5&ndash;10+ card wallets
        </span>

        <h1 className="mx-auto mt-4 max-w-[18ch] font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Always know <span className="text-primary">which card</span> to use.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Track statement credits and perks, and decide whether each annual fee
          still earns its place.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="glow-primary w-full sm:w-auto">
            <Link href="/signup">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <a href="#features">See features</a>
          </Button>
        </div>

        <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          {trustItems.map((item) => (
            <div key={item} className="flex items-center justify-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-5xl text-left">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}

function ProductMockup() {
  return (
    <div className="rounded-2xl border border-overlay-subtle bg-card p-3 shadow-xl shadow-black/20 sm:p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-overlay-subtle pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/75" />
        </div>
        <p className="truncate text-xs font-medium text-muted-foreground">Dashboard preview</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/30 bg-primary/[0.08] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Annual fee verdict</p>
                <p className="mt-1 font-heading text-3xl font-bold text-primary">KEEP</p>
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-1 text-2xs font-semibold text-primary">
                +$214 net value
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <ValueChip label="Credits" value="+$300" />
              <ValueChip label="Rewards" value="+$409" />
              <ValueChip label="Fee" value="-$495" />
            </div>
          </div>

          <div className="rounded-xl border border-overlay-subtle bg-background p-3">
            <MockSectionTitle icon={Gift} title="Benefits" label="$166 left this quarter" />
            <div className="mt-3 space-y-3">
              <ProgressPreview title="Dining credit" value="$84 left" width="44%" color="bg-warning" />
              <ProgressPreview title="Airline credit" value="$50 left" width="25%" color="bg-blue-500" />
              <ProgressPreview title="Digital credit" value="$32 left" width="68%" color="bg-success" />
            </div>
          </div>
        </div>

        <div className="grid content-start gap-3">
          <div className="rounded-xl border border-overlay-subtle bg-background p-3">
            <MockSectionTitle icon={Sparkles} title="Best Card" label="Next purchase" />
            <div className="mt-3 space-y-3">
              <ProgressPreview title="Dining" value="4x" width="80%" color="bg-primary" />
              <p className="rounded-lg bg-overlay-hover px-3 py-2 text-xs text-muted-foreground">
                Use Amex Gold for restaurants and groceries.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/25 bg-background p-3">
            <MockSectionTitle icon={Bell} title="Smart Alerts" label="Premium" />
            <div className="mt-3 space-y-2">
              {[
                "Annual fee due in 30 days",
                "Dining credit resets next week",
                "Perk value still unused",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-overlay-hover px-3 py-2">
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
      {label && <span className="flex-shrink-0 text-2xs text-muted-foreground">{label}</span>}
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
      <div className="mb-1 flex items-center justify-between gap-2 text-2xs">
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
    <div className="rounded-lg bg-overlay-hover px-2 py-2">
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function FeaturesBento() {
  return (
    <section id="features" className="border-b border-overlay-subtle px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="reveal-section mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Features</p>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Useful free tools first. Premium intelligence when your wallet grows.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Credit Card Chris starts with the everyday decisions: which card to use,
            what benefits you have, and whether annual fees make sense.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {featureItems.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: FeatureItem }) {
  const Icon = feature.icon;
  const span =
    feature.layout === "wide"
      ? "lg:col-span-3"
      : feature.layout === "strip"
        ? "md:col-span-2 lg:col-span-6"
        : "lg:col-span-2";

  return (
    <article
      className={`reveal-section rounded-2xl border border-overlay-subtle bg-card p-5 shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/35 sm:p-6 ${span}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <span className="rounded-full border border-overlay-subtle bg-overlay-hover px-2.5 py-1 text-2xs font-semibold text-muted-foreground">
          {feature.tier}
        </span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{feature.eyebrow}</p>
      <h3 className="mt-1 text-lg font-semibold">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
      {feature.details && (
        <ul
          className={`mt-4 gap-2 ${
            feature.layout === "strip" ? "grid sm:grid-cols-3" : "grid"
          }`}
        >
          {feature.details.map((detail) => (
            <li key={detail} className="flex gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function PricingComparison() {
  return (
    <section id="pricing" className="border-b border-overlay-subtle px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="reveal-section mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Pricing</p>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Start with the core tools. Upgrade when your wallet gets expensive.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Premium is for users who want reminders delivered before card value slips away,
            and a complete answer on whether annual-fee cards are worth keeping.
          </p>
        </div>

        <div className="grid items-start gap-5 md:grid-cols-2">
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
      className={`reveal-section rounded-2xl border p-6 shadow-sm shadow-black/5 sm:p-8 ${
        highlighted
          ? "glow-primary border-primary/40 bg-card bg-gradient-to-b from-primary/[0.09] via-primary/[0.03] to-transparent"
          : "border-overlay-subtle bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${highlighted ? "text-primary" : "text-muted-foreground"}`}>
            {title}
          </p>
          <div className="mt-3 flex items-end gap-1">
            <span className="font-heading text-4xl font-bold tracking-tight">{price}</span>
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
              className={`mt-0.5 h-4 w-4 flex-shrink-0 ${highlighted ? "text-primary" : "text-success"}`}
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
      <div className="reveal-section mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Build your rewards wallet in minutes.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          Add your cards, check which one to use, and get a clearer view of the value
          behind every annual fee.
        </p>
        <Button asChild size="lg" className="glow-primary mt-7">
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
          <Image src="/logo.png" alt="Credit Card Chris" width={115} height={28} className="h-7 w-auto" style={{ width: "auto" }} />
          <p className="text-xs text-muted-foreground leading-tight">
            Know which card to use.
          </p>
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
