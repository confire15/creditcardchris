import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { classifyResponse, RESPONSE_CLASSIFIER_VERSION } from "@/lib/agentic/surveys";

const bodySchema = z.object({
  promptId: z.string().uuid(),
  promptSlug: z.string().min(1).max(80),
  promptVersion: z.number().int().min(1),
  topic: z.string().min(1).max(80),
  answer: z.string().trim().min(2).max(2000),
});

export const POST = withAuth(async (req, { user, supabase }) => {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  const { promptId, promptSlug, promptVersion, topic, answer } = parsed.data;

  try {
    const classification = await classifyResponse(supabase, user.id, {
      promptSlug,
      topic,
      rawAnswer: answer,
    });

    const { error } = await supabase.from("survey_responses").insert({
      user_id: user.id,
      prompt_id: promptId,
      prompt_slug: promptSlug,
      prompt_version: promptVersion,
      raw_answer: answer,
      ai_summary: classification,
      sentiment: classification.sentiment,
      theme: classification.theme,
      severity: classification.severity,
      classifier_version: RESPONSE_CLASSIFIER_VERSION,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, classification });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
