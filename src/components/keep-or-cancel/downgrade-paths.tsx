"use client";

import { CardDowngradePath } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, Phone } from "lucide-react";
import { PremiumGate } from "@/components/premium/premium-gate";

export function DowngradePaths({
  paths,
  isPremium,
}: {
  paths: CardDowngradePath[];
  isPremium: boolean;
}) {
  if (paths.length === 0) return null;

  return (
    <div className="border-t border-border/60 px-4 sm:px-5 py-4 space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <ArrowDown className="w-3 h-3" />
        Downgrade Options
      </h4>

      <PremiumGate
        isPremium={isPremium}
        label={`${paths.length} downgrade option${paths.length > 1 ? "s" : ""} with Premium`}
      >
        <div className="space-y-2">
          {paths.map((path) => {
            const toTemplate = path.to_template;
            if (!toTemplate) return null;
            const fee = toTemplate.annual_fee;

            return (
              <div
                key={path.id}
                className="rounded-xl bg-muted/20 px-3 py-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-5 rounded flex-shrink-0"
                      style={{ backgroundColor: toTemplate.color ?? "#6b7280" }}
                    />
                    <p className="text-sm font-medium">{toTemplate.name}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {path.relationship === "product_change" ? "Product Change" : "Downgrade"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{fee > 0 ? `${formatCurrency(fee)}/yr` : "No annual fee"}</span>
                  <span>&middot;</span>
                  <span>{toTemplate.base_reward_rate}x base rate</span>
                </div>
                {path.notes && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-2 mt-1">
                    <Phone className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{path.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PremiumGate>
    </div>
  );
}
