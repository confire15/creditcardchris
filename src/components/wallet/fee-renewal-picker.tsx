"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard } from "@/lib/types/database";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { SaveConfirm } from "./_shared/SaveConfirm";
import { logAudit } from "@/lib/utils/audit";

export function FeeRenewalPicker({
  card,
  onUpdated,
  className,
}: {
  card: UserCard;
  onUpdated: () => void;
  className?: string;
}) {
  const supabase = createClient();
  const [saveCount, setSaveCount] = useState(0);

  const annualFee = card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0;
  if (annualFee <= 0) return null;

  const currentDate = card.annual_fee_date;
  let daysLabel: string | null = null;
  if (currentDate) {
    const days = differenceInDays(parseISO(currentDate), new Date());
    if (days < 0) daysLabel = "overdue";
    else if (days === 0) daysLabel = "due today";
    else if (days <= 30) daysLabel = `${days}d away`;
    else daysLabel = format(parseISO(currentDate), "MMM d, yyyy");
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value || null;
    const { error } = await supabase
      .from("user_cards")
      .update({ annual_fee_date: val })
      .eq("id", card.id);
    if (error) toast.error("Failed to save date");
    else {
      setSaveCount((c) => c + 1);
      void logAudit(supabase, card.user_id, "fee.renewed", {
        user_card_id: card.id,
        annual_fee_date: val,
      }).catch(() => {});
    }
    onUpdated();
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarClock className="w-3.5 h-3.5" />
          Annual Fee Renewal
          {!currentDate && (
            <span className="text-amber-500 font-semibold">· set for alerts</span>
          )}
          <SaveConfirm trigger={saveCount} />
        </label>
        {daysLabel && (
          <span className={cn(
            "text-xs font-medium",
            daysLabel === "overdue" || daysLabel === "due today"
              ? "text-destructive"
              : daysLabel.includes("d away")
              ? "text-amber-500"
              : "text-muted-foreground"
          )}>
            {daysLabel}
          </span>
        )}
      </div>
      <input
        key={card.id + "-renewal"}
        type="date"
        defaultValue={currentDate ?? ""}
        onChange={handleChange}
        className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
