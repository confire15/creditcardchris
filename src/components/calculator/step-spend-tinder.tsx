"use client";

import { ScenarioCard } from "./scenario-card";
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

type StepSpendTinderProps = {
  monthlySpend: { dining: number; travel: number; groceries: number };
  diningPicked: boolean;
  travelPicked: boolean;
  groceriesPicked: boolean;
  onPickDining: (monthly: number) => void;
  onPickTravel: (monthly: number) => void;
  onPickGroceries: (monthly: number) => void;
};

const DINING_OPTIONS = [
  { label: "Cooking at home", monthly: 150, icon: ChefHat },
  { label: "Takeout most nights", monthly: 400, icon: Pizza },
  { label: "Drinks out with friends", monthly: 800, icon: Wine },
];

const TRAVEL_OPTIONS = [
  { label: "Road trips only", monthly: 50, icon: Car },
  { label: "2–3 flights a year", monthly: 200, icon: Plane },
  { label: "International getaways", monthly: 500, icon: Globe },
];

const GROCERIES_OPTIONS = [
  { label: "Cooking for one", monthly: 200, icon: Salad },
  { label: "Weekly shop", monthly: 500, icon: ShoppingBag },
  { label: "Family-of-4 Costco", monthly: 1000, icon: Users },
];

export function StepSpendTinder({
  monthlySpend,
  diningPicked,
  travelPicked,
  groceriesPicked,
  onPickDining,
  onPickTravel,
  onPickGroceries,
}: StepSpendTinderProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
          Step 3 · Tinder for spend
        </p>
        <h2 className="text-2xl sm:text-3xl font-heading leading-tight">
          Swipe through a typical month.
        </h2>
      </header>

      <section className="space-y-3">
        <h3 className="text-base font-medium">Thursday night food situation?</h3>
        <div className="space-y-2.5">
          {DINING_OPTIONS.map((opt) => (
            <ScenarioCard
              key={opt.monthly}
              label={opt.label}
              monthlyDelta={opt.monthly}
              icon={opt.icon}
              selected={diningPicked && monthlySpend.dining === opt.monthly}
              onSelect={() => onPickDining(opt.monthly)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-medium">Travel plans for the next 12 months?</h3>
        <div className="space-y-2.5">
          {TRAVEL_OPTIONS.map((opt) => (
            <ScenarioCard
              key={opt.monthly}
              label={opt.label}
              monthlyDelta={opt.monthly}
              icon={opt.icon}
              selected={travelPicked && monthlySpend.travel === opt.monthly}
              onSelect={() => onPickTravel(opt.monthly)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-medium">Grocery runs?</h3>
        <div className="space-y-2.5">
          {GROCERIES_OPTIONS.map((opt) => (
            <ScenarioCard
              key={opt.monthly}
              label={opt.label}
              monthlyDelta={opt.monthly}
              icon={opt.icon}
              selected={groceriesPicked && monthlySpend.groceries === opt.monthly}
              onSelect={() => onPickGroceries(opt.monthly)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
