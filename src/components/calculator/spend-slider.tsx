"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

type SpendSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export function SpendSlider({ value, onChange }: SpendSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="spend-multiplier" className="text-sm text-muted-foreground">
          What if you spent...
        </Label>
        <span className="text-sm font-mono tabular-nums font-semibold text-primary">
          {value.toFixed(2)}× your pace
        </span>
      </div>
      <Slider
        id="spend-multiplier"
        min={0.25}
        max={3}
        step={0.05}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? 1)}
        aria-label="Spend multiplier"
      />
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Quarter</span>
        <span>Baseline</span>
        <span>3×</span>
      </div>
    </div>
  );
}
