import Link from "next/link";
import { CreditCard, Sparkles, Bell, Calendar } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            ← Back to home
          </Link>
          {children}
        </div>
      </div>

      {/* Right: Decorative panel — hidden on mobile */}
      <div className="hidden lg:flex w-[480px] xl:w-[540px] flex-col justify-between bg-card border-l border-overlay-subtle p-12 relative overflow-hidden">
        {/* Background orb */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-primary/6 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-12">
            <img src="/logo.png" alt="Credit Card Chris" className="h-10 w-auto" />
            <span className="font-heading text-xl font-bold tracking-tight">Credit Card Chris</span>
          </div>

          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl mb-3">
            Which card should<br />you use right now?
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-10">
            Tap a category. See your best card in 2 seconds. Stop leaving hundreds of dollars in rewards on the table.
          </p>

          <div className="space-y-5">
            {[
              {
                icon: Bell,
                title: "Smart Alerts",
                desc: "Never miss an annual fee, expiring credit, or over-budget month. Premium feature.",
              },
              {
                icon: Sparkles,
                title: "Best Card Finder",
                desc: "Tap any category — dining, gas, travel — and instantly see which card earns the most.",
              },
              {
                icon: CreditCard,
                title: "Card Wallet",
                desc: "Add from 104+ supported cards with reward rates and annual fees pre-loaded.",
              },
              {
                icon: Calendar,
                title: "Statement Credit Tracker",
                desc: "Track credits per card with progress bars. Never let a $10 dining credit go unused.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-10 border-t border-overlay-subtle">
          <p className="text-sm text-muted-foreground">
            Start free · 2 min setup
          </p>
        </div>
      </div>
    </div>
  );
}
