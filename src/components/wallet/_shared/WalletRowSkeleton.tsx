import { cn } from "@/lib/utils";

export function WalletRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Card art — exact 1.586:1 aspect to match CreditCardVisual */}
      <div className="w-full aspect-[1.586/1] rounded-2xl bg-muted animate-pulse" />

      {/* Chip strip placeholder */}
      <div className="flex items-center gap-1.5">
        <div className="h-5 w-24 rounded-full bg-muted animate-pulse" />
        <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
        <div className="ml-auto h-5 w-5 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}
