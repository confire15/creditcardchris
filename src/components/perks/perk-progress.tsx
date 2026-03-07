"use client";

import type { CardPerk } from "@/lib/types/database";

export function PerkProgress({
  perk,
  onUpdate,
}: {
  perk: CardPerk;
  onUpdate?: (updates: Partial<CardPerk>) => void;
}) {
  if (perk.value_type === "dollar" && perk.annual_value) {
    const used = perk.used_value ?? 0;
    const total = perk.annual_value;
    const remaining = total - used;
    const pct = Math.min((used / total) * 100, 100);
    const isFullyUsed = remaining <= 0;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            ${used.toFixed(0)} / ${total.toFixed(0)} used
          </span>
          <span className={`font-medium ${isFullyUsed ? "text-muted-foreground line-through" : "text-primary"}`}>
            {isFullyUsed ? "Fully used" : `$${remaining.toFixed(0)} left`}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isFullyUsed ? "bg-muted-foreground/40" : "bg-primary/70"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {onUpdate && !isFullyUsed && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {remaining >= 25 && (
              <QuickBtn label="+$25" onClick={() => onUpdate({ used_value: Math.min(used + 25, total) })} />
            )}
            {remaining >= 50 && (
              <QuickBtn label="+$50" onClick={() => onUpdate({ used_value: Math.min(used + 50, total) })} />
            )}
            {remaining >= 100 && (
              <QuickBtn label="+$100" onClick={() => onUpdate({ used_value: Math.min(used + 100, total) })} />
            )}
            <QuickBtn
              label="Full"
              primary
              onClick={() => onUpdate({ used_value: total })}
            />
          </div>
        )}
      </div>
    );
  }

  if (perk.value_type === "count" && perk.annual_count) {
    const used = perk.used_count ?? 0;
    const total = perk.annual_count;
    const remaining = total - used;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{used} / {total} used</span>
          <span className={`font-medium ${remaining <= 0 ? "text-muted-foreground" : "text-primary"}`}>
            {remaining <= 0 ? "All used" : `${remaining} remaining`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i < used ? "bg-primary/70" : "bg-muted"
              }`}
            />
          ))}
        </div>
        {onUpdate && remaining > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <QuickBtn
              label="Mark 1 used"
              onClick={() => onUpdate({ used_count: Math.min(used + 1, total) })}
            />
            {remaining > 1 && (
              <QuickBtn
                label="Mark all used"
                primary
                onClick={() => onUpdate({ used_count: total })}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // boolean
  const redeemed = perk.is_redeemed;
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${redeemed ? "text-muted-foreground" : "text-primary font-medium"}`}>
        {redeemed ? "Redeemed" : "Available"}
      </span>
      {onUpdate && (
        <button
          onClick={() => onUpdate({ is_redeemed: !redeemed })}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
            redeemed
              ? "border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
              : "border-primary/30 text-primary bg-primary/[0.08] hover:bg-primary/15"
          }`}
        >
          {redeemed ? "Mark unused" : "Mark used"}
        </button>
      )}
    </div>
  );
}

function QuickBtn({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-md border transition-all ${
        primary
          ? "border-primary/30 text-primary hover:bg-primary/10"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
      }`}
    >
      {label}
    </button>
  );
}
