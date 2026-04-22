"use client";

import { useEffect, useMemo, useState } from "react";
import { StatementCredit, UserCard } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type QuickAmount = { label: string; value: number };

type LogUsageDialogProps = {
  open: boolean;
  credit: StatementCredit | null;
  card: UserCard | null;
  onOpenChange: (open: boolean) => void;
  onSave: (newUsedAmount: number) => Promise<void> | void;
};

function inferCadence(name: string): "Monthly" | "Quarterly" | "Semi-Annual" | "Annual" {
  const n = name.toLowerCase();
  if (n.includes("/mo") || n.includes("monthly") || n.includes("per month") || n.includes("each month")) return "Monthly";
  if (n.includes("quarterly")) return "Quarterly";
  if (n.includes("semi-annual") || n.includes("semi annual") || n.includes("biannual") || n.includes("twice a year")) return "Semi-Annual";
  return "Annual";
}

function buildQuickAmounts(credit: StatementCredit): QuickAmount[] {
  const total = credit.annual_amount;
  const cadence = inferCadence(credit.name);
  let suggestions: QuickAmount[] = [];

  if (cadence === "Monthly") {
    const monthlyMatch = credit.name.match(/\$(\d+)\/mo/i);
    const monthly = monthlyMatch ? parseInt(monthlyMatch[1], 10) : Math.max(1, Math.round(total / 12));
    suggestions = [
      { label: `$${Math.round(monthly * 0.5)}`, value: Math.round(monthly * 0.5) },
      { label: `$${monthly} Full`, value: monthly },
    ];
  } else if (cadence === "Semi-Annual") {
    const half = Math.max(1, Math.round(total / 2));
    suggestions = [
      { label: `$${half} Half`, value: half },
      { label: `$${total} Full`, value: total },
    ];
  } else if (cadence === "Quarterly") {
    const quarter = Math.max(1, Math.round(total / 4));
    suggestions = [
      { label: `$${Math.round(quarter * 0.5)}`, value: Math.round(quarter * 0.5) },
      { label: `$${quarter} Full`, value: quarter },
    ];
  } else {
    suggestions = [
      { label: `$${Math.round(total * 0.25)}`, value: Math.round(total * 0.25) },
      { label: `$${Math.round(total * 0.5)}`, value: Math.round(total * 0.5) },
      { label: `$${Math.round(total * 0.75)}`, value: Math.round(total * 0.75) },
      { label: `$${total} Full`, value: total },
    ];
  }

  return suggestions
    .filter((s) => s.value > 0 && s.value <= total)
    .filter((s, index, arr) => arr.findIndex((other) => other.value === s.value) === index);
}

export function LogUsageDialog({
  open,
  credit,
  card,
  onOpenChange,
  onSave,
}: LogUsageDialogProps) {
  const [value, setValue] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!credit) {
      setValue("0");
      return;
    }
    setValue(Math.round(credit.used_amount).toString());
  }, [credit?.id, credit?.used_amount, credit]);

  const quickAmounts = useMemo(() => (credit ? buildQuickAmounts(credit) : []), [credit]);
  const parsed = Number.parseFloat(value) || 0;
  const clamped = credit ? Math.min(Math.max(parsed, 0), credit.annual_amount) : 0;

  async function handleSave() {
    if (!credit) return;
    setSaving(true);
    try {
      await onSave(clamped);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Credit Usage</DialogTitle>
          <DialogDescription>
            {credit ? (
              <>
                {credit.name}
                {card ? ` · ${getCardName(card)}` : ""}
              </>
            ) : (
              "Update this credit's used amount."
            )}
          </DialogDescription>
        </DialogHeader>

        {credit && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount.value}
                  type="button"
                  onClick={() => setValue(amount.value.toFixed(0))}
                  className="min-h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {amount.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  value={value === "0" ? "" : value}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                    setValue(cleaned || "0");
                  }}
                  placeholder="Enter amount"
                  className="border-0 bg-transparent pl-6 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Max ${credit.annual_amount.toLocaleString("en-US")} · currently used ${credit.used_amount.toLocaleString("en-US")}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!credit || saving}>
            {saving ? "Saving..." : `Save $${clamped.toLocaleString("en-US")}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
