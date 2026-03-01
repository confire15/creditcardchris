"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "ccc_getting_started_dismissed";

type Step = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export function GettingStarted({
  hasCards,
  hasTransactions,
  hasBudget,
  hasGoal,
}: {
  hasCards: boolean;
  hasTransactions: boolean;
  hasBudget: boolean;
  hasGoal: boolean;
}) {
  const [dismissed, setDismissed] = useState(true); // start hidden, check localStorage

  useEffect(() => {
    const saved = localStorage.getItem(DISMISSED_KEY);
    setDismissed(saved === "true");
  }, []);

  const steps: Step[] = [
    {
      id: "cards",
      label: "Add your first card",
      description: "Choose from 59+ card templates",
      href: "/wallet",
      done: hasCards,
    },
    {
      id: "transactions",
      label: "Log a transaction",
      description: "Track your first purchase",
      href: "/transactions",
      done: hasTransactions,
    },
    {
      id: "recommend",
      label: "Try the card recommender",
      description: "Find your best card for any purchase",
      href: "/recommend",
      done: false, // always show as a nudge
    },
    {
      id: "budget",
      label: "Set a spending budget",
      description: "Get alerts when you overspend",
      href: "/budgets",
      done: hasBudget,
    },
    {
      id: "goal",
      label: "Set a rewards goal",
      description: "Track progress toward a trip or reward",
      href: "/goals",
      done: hasGoal,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  // Auto-dismiss when all done
  useEffect(() => {
    if (allDone) {
      localStorage.setItem(DISMISSED_KEY, "true");
      setDismissed(true);
    }
  }, [allDone]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }

  if (dismissed) return null;

  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="bg-card border border-overlay-subtle rounded-2xl p-6 mb-8 relative">
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-overlay-hover transition-all"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold">Get started</h2>
        <span className="ml-auto text-xs text-muted-foreground mr-8">{completedCount}/{steps.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mb-5 mt-2">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all",
              step.done
                ? "opacity-50"
                : "hover:bg-overlay-hover"
            )}
          >
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", step.done && "line-through")}>{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
