"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type FeedbackQuestion = {
  promptId: string;
  promptSlug: string;
  promptVersion: number;
  topic: string;
  question: string;
};

export function FeedbackCard({ initial }: { initial: FeedbackQuestion | null }) {
  const router = useRouter();
  const [question, setQuestion] = useState<FeedbackQuestion | null>(initial);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!question) {
    return (
      <div className="rounded-2xl border border-overlay-subtle bg-card p-6">
        <p className="text-sm text-muted-foreground">You&apos;re caught up. Thanks for the feedback!</p>
      </div>
    );
  }

  async function submit() {
    if (!question || answer.trim().length < 2) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/agentic/survey/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: question.promptId,
          promptSlug: question.promptSlug,
          promptVersion: question.promptVersion,
          topic: question.topic,
          answer,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed");
      }
      setStatus("done");
      setAnswer("");
      const next = await fetch("/api/agentic/survey/next").then((r) => r.json());
      if (next?.done) {
        setQuestion(null);
      } else {
        setQuestion({
          promptId: next.promptId,
          promptSlug: next.promptSlug,
          promptVersion: next.promptVersion,
          topic: next.topic,
          question: next.question,
        });
        setStatus("idle");
      }
      router.refresh();
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Submission failed");
    }
  }

  async function skip() {
    if (!question) return;
    setStatus("submitting");
    try {
      const next = await fetch("/api/agentic/survey/next?skip=" + encodeURIComponent(question.promptSlug)).then((r) =>
        r.json(),
      );
      if (next?.done) {
        setQuestion(null);
      } else {
        setQuestion({
          promptId: next.promptId,
          promptSlug: next.promptSlug,
          promptVersion: next.promptVersion,
          topic: next.topic,
          question: next.question,
        });
      }
      setAnswer("");
      setStatus("idle");
    } catch {
      setStatus("idle");
    }
  }

  return (
    <div className="rounded-2xl border border-overlay-subtle bg-card p-6 space-y-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{question.topic.replace(/_/g, " ")}</p>
        <h2 className="text-lg font-semibold">{question.question}</h2>
      </div>
      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="A sentence or two is plenty."
        rows={4}
        className="w-full rounded-2xl border border-overlay-subtle bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4621a]"
        disabled={status === "submitting"}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={status === "submitting" || answer.trim().length < 2}
          className="rounded-2xl bg-[#d4621a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "submitting" ? "Saving..." : "Submit"}
        </button>
        <button
          type="button"
          onClick={skip}
          disabled={status === "submitting"}
          className="rounded-2xl border border-overlay-subtle px-4 py-2 text-sm font-medium"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
