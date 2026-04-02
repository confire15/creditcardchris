"use client";

import { useState } from "react";
import { SpendingCategory } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export function SpendingInput({
  categories,
  categorySpend,
  onSpendChange,
}: {
  categories: SpendingCategory[];
  categorySpend: Record<string, number>;
  onSpendChange: (categoryId: string, amount: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const totalMonthly = Object.values(categorySpend).reduce((s, v) => s + v, 0);

  return (
    <div className="border-t border-border/60">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Edit Monthly Spending
          </span>
          <span className="text-xs text-muted-foreground">
            ({formatCurrency(totalMonthly)}/mo)
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 sm:px-5 pb-4 grid grid-cols-2 gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground truncate w-24 flex-shrink-0">
                {cat.display_name}
              </label>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                <Input
                  type="number"
                  min={0}
                  value={categorySpend[cat.id] ?? 0}
                  onChange={(e) => onSpendChange(cat.id, parseFloat(e.target.value) || 0)}
                  className="pl-6 h-7 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
