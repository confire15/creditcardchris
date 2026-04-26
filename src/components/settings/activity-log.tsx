"use client";

import { format, isAfter, subDays } from "date-fns";
import { CheckCircle2, CircleDot, CreditCard, Sparkles, Wallet } from "lucide-react";
import { PremiumGate } from "@/components/premium/premium-gate";

type AuditRow = {
  id: string;
  action: string;
  created_at: string;
  meta?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

function getIcon(action: string) {
  if (action.startsWith("card.")) return <CreditCard className="w-4 h-4" />;
  if (action.startsWith("perk.") || action.startsWith("sub.") || action.startsWith("challenge.")) {
    return <Sparkles className="w-4 h-4" />;
  }
  if (action.startsWith("subscription.")) return <CheckCircle2 className="w-4 h-4" />;
  if (action.startsWith("credit.") || action.startsWith("fee.")) return <Wallet className="w-4 h-4" />;
  return <CircleDot className="w-4 h-4" />;
}

function prettifyAction(action: string) {
  return action.replaceAll(".", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderMeta(meta?: Record<string, unknown> | null) {
  if (!meta || Object.keys(meta).length === 0) return null;
  const entries = Object.entries(meta).slice(0, 3);
  return (
    <p className="text-xs text-muted-foreground mt-1">
      {entries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
    </p>
  );
}

function Timeline({ logs }: { logs: AuditRow[] }) {
  const grouped = logs.reduce<Record<string, AuditRow[]>>((acc, row) => {
    const key = format(new Date(row.created_at), "MMM d, yyyy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([day, rows]) => (
        <section key={day}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{day}</h3>
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-overlay-subtle bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{getIcon(row.action)}</span>
                  <p className="text-sm font-medium">{prettifyAction(row.action)}</p>
                  <span className="text-xs text-muted-foreground ml-auto">{format(new Date(row.created_at), "h:mm a")}</span>
                </div>
                {renderMeta((row.meta ?? row.metadata) as Record<string, unknown> | null)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ActivityLog({
  logs,
  isPremium,
}: {
  logs: AuditRow[];
  isPremium: boolean;
}) {
  const sevenDaysAgo = subDays(new Date(), 7);
  const recent = logs.filter((row) => isAfter(new Date(row.created_at), sevenDaysAgo));
  const older = logs.filter((row) => !isAfter(new Date(row.created_at), sevenDaysAgo));

  return (
    <div className="space-y-5">
      <Timeline logs={recent} />
      {!isPremium && older.length > 0 && (
        <PremiumGate isPremium={false} label="Upgrade to see full history">
          <Timeline logs={older} />
        </PremiumGate>
      )}
      {isPremium && older.length > 0 && <Timeline logs={older} />}
    </div>
  );
}
