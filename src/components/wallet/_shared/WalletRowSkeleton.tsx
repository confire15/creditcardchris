import { cn } from "@/lib/utils";

export function WalletRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {/* Drag handle placeholder */}
      <div className="mt-4 w-6 flex-shrink-0" />

      {/* Card + chip strip */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Card art — exact 2.4:1 aspect to match CreditCardVisual */}
        <div className="w-full aspect-[2.4/1] rounded-2xl bg-muted animate-pulse" />

        {/* Chip strip placeholder */}
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-24 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
          <div className="ml-auto h-5 w-5 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
