"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bot, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AgentRunSummary } from "@/lib/agentic/schemas";

function formatRunTime(run: AgentRunSummary) {
  const stamp = run.completed_at ?? run.started_at ?? run.created_at;
  const diff = Date.now() - new Date(stamp).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `${days}d ago`;
  if (hrs >= 1) return `${hrs}h ago`;
  if (mins >= 1) return `${mins}m ago`;
  return "just now";
}

export function CopilotStatusBar({
  onActionsRefreshed,
}: {
  onActionsRefreshed: () => Promise<void>;
}) {
  const [lastRun, setLastRun] = useState<AgentRunSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);

  const fetchLastRun = useCallback(async () => {
    try {
      const res = await fetch("/api/agentic/recommendations?limit=0", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setLastRun(data.lastRun ?? null);
    } catch {
      // non-fatal
    } finally {
      setLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    void fetchLastRun();
  }, [fetchLastRun]);

  const runCopilot = useCallback(async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/agentic/wallet-copilot/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) setCoolingDown(true);
        throw new Error(data.error ?? "Could not run AI analysis");
      }
      setLastRun(data.lastRun ?? null);
      await onActionsRefreshed();
      toast.success("AI analysis complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI analysis failed");
    } finally {
      setRunning(false);
    }
  }, [onActionsRefreshed]);

  if (!loadedOnce) return null;

  const failed = lastRun?.status === "failed";

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-overlay-subtle bg-card px-3 py-2">
      <span className={failed ? "text-destructive" : "text-muted-foreground"}>
        {failed ? (
          <AlertCircle className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {running
          ? "Running AI analysis…"
          : lastRun
          ? `AI: ${formatRunTime(lastRun)}`
          : "AI: not run yet"}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={runCopilot}
        disabled={running || coolingDown}
      >
        {running ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        {running ? "Running" : "Re-run AI"}
      </Button>
    </div>
  );
}
