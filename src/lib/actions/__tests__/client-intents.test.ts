import { describe, expect, it, vi } from "vitest";
import { executeActionIntent } from "@/lib/actions/client-intents";
import type { ProposedAction } from "@/lib/actions/schemas";

function deps() {
  return {
    navigate: vi.fn(),
    openExternal: vi.fn(),
    assignLocation: vi.fn(),
    copyText: vi.fn(() => Promise.resolve()),
    start: vi.fn(() => Promise.resolve()),
    complete: vi.fn(() => Promise.resolve()),
    onStartError: vi.fn(),
    onCopied: vi.fn(),
  };
}

describe("executeActionIntent", () => {
  it("navigates internally without waiting for start tracking", async () => {
    const pendingStart = new Promise<void>(() => {});
    const subject = deps();
    subject.start.mockReturnValue(pendingStart);

    const action: ProposedAction = { type: "navigate", href: "/benefits", label: "Review" };
    const result = executeActionIntent(action, subject);

    expect(subject.start).toHaveBeenCalledTimes(1);
    expect(subject.navigate).toHaveBeenCalledWith("/benefits");
    await result;
  });

  it("opens external actions synchronously and falls back when blocked", async () => {
    const subject = deps();
    subject.openExternal.mockReturnValue(null);

    const action: ProposedAction = { type: "deep_link", href: "https://example.com", label: "Open" };
    await executeActionIntent(action, subject);

    expect(subject.openExternal).toHaveBeenCalledWith("https://example.com");
    expect(subject.assignLocation).toHaveBeenCalledWith("https://example.com");
    expect(subject.start).toHaveBeenCalledTimes(1);
  });

  it("copies text before recording start", async () => {
    const calls: string[] = [];
    const subject = deps();
    subject.copyText.mockImplementation(async () => {
      calls.push("copy");
    });
    subject.start.mockImplementation(async () => {
      calls.push("start");
    });

    const action: ProposedAction = {
      type: "copy_text",
      href: "/keep-or-cancel",
      label: "Copy",
      payload: { text: "Retention script" },
    };
    await executeActionIntent(action, subject);

    expect(subject.copyText).toHaveBeenCalledWith("Retention script");
    expect(subject.onCopied).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["copy", "start"]);
  });

  it("uses complete for mark_complete actions", async () => {
    const subject = deps();
    const action: ProposedAction = { type: "mark_complete", href: "/dashboard", label: "Done" };

    await executeActionIntent(action, subject);

    expect(subject.complete).toHaveBeenCalledTimes(1);
    expect(subject.start).not.toHaveBeenCalled();
    expect(subject.navigate).not.toHaveBeenCalled();
  });
});
