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
  BedDouble,
  Hotel,
  MapPin,
  Fuel,
  Bus,
  Train,
} from "lucide-react";
import { ScenarioCard } from "./scenario-card";

export type SpendQuestionKey =
  | "dining"
  | "travel"
  | "groceries"
  | "hotels"
  | "gas"
  | "transit";

type Option = {
  label: string;
  monthly: number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type QuestionDef = {
  category: string;
  title: string;
  prompt: string;
  options: Option[];
};

export const SPEND_QUESTIONS: Record<SpendQuestionKey, QuestionDef> = {
  dining: {
    category: "Dining",
    title: "Thursday night food situation?",
    prompt: "Pick what matches a typical month.",
    options: [
      { label: "Cooking at home", monthly: 150, icon: ChefHat },
      { label: "Takeout most nights", monthly: 400, icon: Pizza },
      { label: "Drinks out with friends", monthly: 800, icon: Wine },
    ],
  },
  travel: {
    category: "Travel",
    title: "Travel plans for the next 12 months?",
    prompt: "Rough estimate is fine.",
    options: [
      { label: "Road trips only", monthly: 50, icon: Car },
      { label: "2–3 flights a year", monthly: 200, icon: Plane },
      { label: "International getaways", monthly: 500, icon: Globe },
    ],
  },
  groceries: {
    category: "Groceries",
    title: "Grocery runs?",
    prompt: "How much lands on groceries each month?",
    options: [
      { label: "Cooking for one", monthly: 200, icon: Salad },
      { label: "Weekly shop", monthly: 500, icon: ShoppingBag },
      { label: "Family-of-4 Costco", monthly: 1000, icon: Users },
    ],
  },
  hotels: {
    category: "Hotels",
    title: "Hotel nights in a year?",
    prompt: "Booked-direct or through a portal — same idea.",
    options: [
      { label: "Rare hotel stays", monthly: 50, icon: BedDouble },
      { label: "Quarterly weekend trips", monthly: 200, icon: Hotel },
      { label: "Frequent traveler", monthly: 600, icon: MapPin },
    ],
  },
  gas: {
    category: "Gas",
    title: "Tank fills per month?",
    prompt: "Commuter or weekend driver?",
    options: [
      { label: "Barely drive", monthly: 50, icon: Fuel },
      { label: "Daily commute", monthly: 200, icon: Car },
      { label: "Road warrior", monthly: 400, icon: Fuel },
    ],
  },
  transit: {
    category: "Transit",
    title: "Subway, bus, rideshare?",
    prompt: "Public transit and rideshare combined.",
    options: [
      { label: "Mostly drive", monthly: 30, icon: Car },
      { label: "Daily commuter", monthly: 150, icon: Train },
      { label: "City rideshare regular", monthly: 350, icon: Bus },
    ],
  },
};

type StepSpendQuestionProps = {
  questionKey: SpendQuestionKey;
  monthly: number;
  picked: boolean;
  stepNumber: number;
  onPick: (monthly: number) => void;
};

export function StepSpendQuestion({
  questionKey,
  monthly,
  picked,
  stepNumber,
  onPick,
}: StepSpendQuestionProps) {
  const q = SPEND_QUESTIONS[questionKey];
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
          Step {stepNumber} · {q.category}
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
