"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-overlay-subtle bg-card px-6 py-10">
        <div className="relative mx-auto mb-5 h-14 w-24" aria-hidden>
          <span
            className="absolute left-0 top-2 block h-11 w-[4.25rem] -rotate-6 rounded-lg opacity-30"
            style={{ background: "linear-gradient(135deg, #3b5998, color-mix(in oklch, #3b5998 60%, black))" }}
          />
          <span
            className="absolute right-0 top-2 block h-11 w-[4.25rem] rotate-6 rounded-lg opacity-30"
            style={{ background: "linear-gradient(135deg, #b0413e, color-mix(in oklch, #b0413e 60%, black))" }}
          />
          <span className="absolute left-1/2 top-0 flex h-12 w-[4.5rem] -translate-x-1/2 items-center justify-center rounded-lg bg-destructive/15 shadow-lg shadow-black/20">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </span>
        </div>
        <h2 className="mb-1 font-heading text-base font-bold">Something went wrong</h2>
        <p className="mx-auto mb-6 max-w-xs text-sm text-muted-foreground">
          An unexpected error occurred. Your data is safe — try again or head back to Today.
        </p>
        <Button onClick={reset} className="min-h-[44px] w-full">
          Try again
        </Button>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="mt-3 block w-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Go to Today
        </button>
        {error.digest && (
          <p className="text-caption mt-5">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
