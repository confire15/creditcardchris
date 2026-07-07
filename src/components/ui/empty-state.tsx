import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Fanned card-art motif used by empty states across Wallet tabs and Alerts. */
function CardFan() {
  return (
    <div className="relative mx-auto mb-4 h-14 w-24" aria-hidden="true">
      <span
        className="absolute left-0 top-2 block h-11 w-[4.25rem] -rotate-6 rounded-lg opacity-40 shadow-md shadow-black/20"
        style={{ background: "linear-gradient(135deg, #3b5998, color-mix(in oklch, #3b5998 60%, black))" }}
      />
      <span
        className="absolute right-0 top-2 block h-11 w-[4.25rem] rotate-6 rounded-lg opacity-40 shadow-md shadow-black/20"
        style={{ background: "linear-gradient(135deg, #b0413e, color-mix(in oklch, #b0413e 60%, black))" }}
      />
      <span
        className="absolute left-1/2 top-0 block h-12 w-[4.5rem] -translate-x-1/2 rounded-lg shadow-lg shadow-black/25"
        style={{ background: "linear-gradient(135deg, #d4621a, color-mix(in oklch, #d4621a 55%, black))" }}
      >
        <span className="absolute bottom-1.5 left-1.5 h-2.5 w-3.5 rounded-[3px] bg-white/35" />
      </span>
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  /** Single CTA — a Button or Link. One per empty state, per the accent rule. */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-border px-6 py-10 text-center", className)}>
      <CardFan />
      <p className="mb-1 font-heading text-base font-bold">{title}</p>
      <p className="mx-auto mb-0 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
