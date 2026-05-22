import type { ProposedAction } from "@/lib/actions/schemas";

type ActionIntentDeps = {
  navigate: (href: string) => void;
  openExternal: (href: string) => Window | null | undefined;
  assignLocation: (href: string) => void;
  copyText: (text: string) => Promise<void>;
  start: () => Promise<unknown>;
  complete: () => Promise<unknown>;
  onStartError?: (error: unknown) => void;
  onCopied?: () => void;
};

function trackStart({ start, onStartError }: Pick<ActionIntentDeps, "start" | "onStartError">) {
  void start().catch((error) => {
    onStartError?.(error);
  });
}

export async function executeActionIntent(action: ProposedAction, deps: ActionIntentDeps) {
  if (action.type === "mark_complete") {
    await deps.complete();
    return;
  }

  if (action.type === "copy_text") {
    const text = action.payload?.text;
    if (typeof text !== "string" || text.length === 0) {
      throw new Error("Nothing to copy");
    }

    await deps.copyText(text);
    deps.onCopied?.();
    trackStart(deps);
    return;
  }

  if (action.type === "deep_link" || action.type === "open_url") {
    const opened = deps.openExternal(action.href);
    if (!opened) {
      deps.assignLocation(action.href);
    }
    trackStart(deps);
    return;
  }

  trackStart(deps);
  deps.navigate(action.href);
}
