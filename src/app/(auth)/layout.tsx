import Link from "next/link";
import { CreditCard, TrendingUp, Bell, Zap } from "lucide-react";

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
            <span className="text-xl font-bold tracking-tight">Credit Card Chris</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Maximize every<br />swipe.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-10">
            The smarter way to track rewards, optimize spending, and always know which card to reach for.
          </p>

          <div className="space-y-5">
            {[
              {
                icon: CreditCard,
                title: "All your cards in one place",
                desc: "Track 84+ cards or add your own.",
              },
              {
                icon: TrendingUp,
                title: "See your rewards grow",
                desc: "Charts, insights, and year-over-year comparisons.",
              },
              {
                icon: Zap,
                title: "Smart card recommendations",
                desc: "Always know which card earns the most for each purchase.",
              },
              {
                icon: Bell,
                title: "Never miss a deadline",
                desc: "Annual fee alerts, expiring points, and statement credit reminders.",
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
            Start free · Connect your bank when you're ready
          </p>
        </div>
      </div>
    </div>
  );
}
