"use client";

import type { ComponentType, SVGProps } from "react";
import {
  ChefHat,
  Pizza,
  Wine,
  Car,
  Plane,
  Globe,
  Salad,
  ShoppingBag,
  Users,
} from "lucide-react";
import { ScenarioCard } from "./scenario-card";

export type SpendQuestionKey = "dining" | "travel" | "groceries";

type Option = {
  label: string;
  monthly: number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type QuestionDef = {
  stepNumber: number;
  eyebrow: string;
  title: string;
  prompt: string;
  options: Option[];
};

export const SPEND_QUESTIONS: Record<SpendQuestionKey, QuestionDef> = {
  dining: {
    stepNumber: 3,
    eyebrow: "Step 3 · Dining",
    title: "Thursday night food situation?",
    prompt: "Pick what matches a typical month.",
    options: [
      { label: "Cooking at home", monthly: 150, icon: ChefHat },
      { label: "Takeout most nights", monthly: 400, icon: Pizza },
      { label: "Drinks out with friends", monthly: 800, icon: Wine },
    ],
  },
  travel: {
    stepNumber: 4,
    eyebrow: "Step 4 · Travel",
    title: "Travel plans for the next 12 months?",
    prompt: "Rough estimate is fine.",
    options: [
      { label: "Road trips only", monthly: 50, icon: Car },
      { label: "2–3 flights a year", monthly: 200, icon: Plane },
      { label: "International getaways", monthly: 500, icon: Globe },
    ],
  },
  groceries: {
    stepNumber: 5,
    eyebrow: "Step 5 · Groceries",
    title: "Grocery runs?",
    prompt: "How much lands on groceries each month?",
    options: [
      { label: "Cooking for one", monthly: 200, icon: Salad },
      { label: "Weekly shop", monthly: 500, icon: ShoppingBag },
      { label: "Family-of-4 Costco", monthly: 1000, icon: Users },
    ],
  },
};

type StepSpendQuestionProps = {
  questionKey: SpendQuestionKey;
  monthly: number;
  picked: boolean;
  onPick: (monthly: number) => void;
};

export function StepSpendQuestion({
  questionKey,
  monthly,
  picked,
  onPick,
}: StepSpendQuestionProps) {
  const q = SPEND_QUESTIONS[questionKey];
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
          {q.eyebrow}
        </p>
        <h2 className="text-2xl sm:text-3xl font-heading leading-tight">
          {q.title}
        </h2>
        <p className="text-sm text-muted-foreground">{q.prompt}</p>
      </header>

      <div className="space-y-2.5">
        {q.options.map((opt) => (
          <ScenarioCard
            key={opt.monthly}
            label={opt.label}
            monthlyDelta={opt.monthly}
            icon={opt.icon}
            selected={picked && monthly === opt.monthly}
            onSelect={() => onPick(opt.monthly)}
          />
        ))}
      </div>
    </div>
  );
}
