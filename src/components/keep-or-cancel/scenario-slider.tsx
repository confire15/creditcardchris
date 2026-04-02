"use client";

import { Slider } from "@/components/ui/slider";
import { getDefaultCpp } from "@/lib/constants/default-spend";
import { SlidersHorizontal } from "lucide-react";

export function ScenarioSlider({
  cppOverride,
  rewardUnit,
  onCppChange,
}: {
  cppOverride: number | null;
  rewardUnit: string;
  onCppChange: (value: number | null) => void;
}) {
  const defaultCpp = getDefaultCpp(rewardUnit);
  const currentCpp = cppOverride ?? defaultCpp;

  return (
    <div className="border-t border-border/60 px-4 sm:px-5 py-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
        <SlidersHorizontal className="w-3 h-3" />
        What-If: Point Valuation
      </h4>
      <div className="flex items-center gap-4">
        <Slider
          value={[currentCpp]}
          min={0.5}
          max={2.5}
          step={0.1}
          onValueChange={([v]) => onCppChange(v === defaultCpp ? null : v)}
          className="flex-1"
        />
        <div className="flex-shrink-0 text-sm font-bold w-16 text-right">
          {currentCpp.toFixed(1)} cpp
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        Default: {defaultCpp.toFixed(1)} cpp for {rewardUnit}.
        {currentCpp > defaultCpp && " Higher valuation if you transfer to airlines/hotels."}
        {currentCpp < defaultCpp && " Lower valuation for basic redemptions."}
      </p>
    </div>
  );
}
