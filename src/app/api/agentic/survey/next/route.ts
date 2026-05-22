import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { pickNextSurveyQuestion } from "@/lib/agentic/surveys";

export const GET = withAuth(async (_req, { user, supabase }) => {
  try {
    const next = await pickNextSurveyQuestion(supabase, user.id);
    if (!next) return NextResponse.json({ done: true });
    return NextResponse.json({
      done: false,
      promptId: next.prompt.id,
      promptSlug: next.prompt.slug,
      promptVersion: next.prompt.version,
      topic: next.prompt.topic,
      question: next.question,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load next question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
