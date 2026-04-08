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
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        An unexpected error occurred. Your data is safe — try refreshing the page.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <Button onClick={() => (window.location.href = "/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground/50 mt-6">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
