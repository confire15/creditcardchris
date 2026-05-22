export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { subDays } from "date-fns";
import { withCron } from "@/lib/api/with-cron";
import { createServiceClient } from "@/lib/supabase/service";
import { agentRecommendationInputSchema } from "@/lib/agentic/schemas";

const DIGEST_FLOW = "feedback_digest";
const DIGEST_PROMPT_VERSION = "feedback-digest-v1";
const ADMIN_USER_ID = process.env.FEEDBACK_DIGEST_ADMIN_USER_ID;

const handler = withCron(async () => {
  if (!ADMIN_USER_ID) {
    return NextResponse.json({ skipped: "FEEDBACK_DIGEST_ADMIN_USER_ID not configured" }, { status: 200 });
  }

  const supabase = createServiceClient();
  const since = subDays(new Date(), 7).toISOString();

  const { data: responses, error } = await supabase
    .from("survey_responses")
    .select("id, prompt_slug, theme, sentiment, severity, ai_summary, raw_answer, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Cluster = {
    theme: string;
    count: number;
    severitySum: number;
    negativeCount: number;
    sampleIds: string[];
    sampleSummaries: string[];
  };
  const clusters = new Map<string, Cluster>();
  for (const row of responses ?? []) {
    const theme = row.theme ?? "other";
    const existing: Cluster = clusters.get(theme) ?? {
      theme,
      count: 0,
      severitySum: 0,
      negativeCount: 0,
      sampleIds: [],
      sampleSummaries: [],
    };
    existing.count += 1;
    existing.severitySum += Number(row.severity ?? 0);
    if (row.sentiment === "negative") existing.negativeCount += 1;
    if (existing.sampleIds.length < 3) {
      existing.sampleIds.push(row.id);
      const summary = (row.ai_summary as { summary?: string } | null)?.summary ?? row.raw_answer.slice(0, 120);
      existing.sampleSummaries.push(summary);
    }
    clusters.set(theme, existing);
  }

  if (clusters.size === 0) {
    return NextResponse.json({ created: 0, reason: "no responses in window" });
  }

  const { data: run, error: runErr } = await supabase
    .from("agent_runs")
    .insert({
      user_id: ADMIN_USER_ID,
      flow_type: DIGEST_FLOW,
      prompt_version: DIGEST_PROMPT_VERSION,
      model_provider: "deterministic-v1",
      status: "running",
      compact_input_summary: {
        windowDays: 7,
        responseCount: responses?.length ?? 0,
        clusterCount: clusters.size,
      },
    })
    .select("id")
    .single();

  if (runErr || !run?.id) {
    return NextResponse.json({ error: runErr?.message ?? "Failed to create digest run" }, { status: 500 });
  }

  const { data: priorDigestRunIds } = await supabase
    .from("agent_runs")
    .select("id")
    .eq("user_id", ADMIN_USER_ID)
    .eq("flow_type", DIGEST_FLOW);
  const priorIds = (priorDigestRunIds ?? []).map((r) => r.id as string);
  if (priorIds.length > 0) {
    await supabase
      .from("agent_recommendations")
      .update({ status: "stale", updated_at: new Date().toISOString() })
      .eq("user_id", ADMIN_USER_ID)
      .eq("status", "active")
      .in("run_id", priorIds);
  }

  const top = [...clusters.values()]
    .sort((a, b) => b.severitySum - a.severitySum || b.count - a.count)
    .slice(0, 5);

  const rows = top.map((cluster) => {
    const avgSeverity = cluster.count > 0 ? cluster.severitySum / cluster.count : 0;
    const priority = Math.min(95, Math.round(40 + cluster.count * 4 + avgSeverity * 6));
    const input = {
      type: "data_cleanup" as const,
      priority,
      confidence: 0.7,
      title: `Feedback cluster: ${cluster.theme.replace(/_/g, " ")} (${cluster.count})`,
      rationale: `${cluster.count} responses this week (${cluster.negativeCount} negative, avg severity ${avgSeverity.toFixed(1)}). Samples: ${cluster.sampleSummaries.join(" | ")}`.slice(0, 480),
      sourceRefs: cluster.sampleIds.slice(0, 3).map((id) => ({
        type: "survey_response",
        id,
        label: cluster.theme,
      })),
      proposedAction: {
        type: "review" as const,
        href: `/admin/feedback?theme=${encodeURIComponent(cluster.theme)}`,
        label: "Review samples",
      },
    };
    const parsed = agentRecommendationInputSchema.parse(input);
    return {
      run_id: run.id,
      user_id: ADMIN_USER_ID,
      type: parsed.type,
      priority: parsed.priority,
      confidence: parsed.confidence,
      title: parsed.title,
      rationale: parsed.rationale,
      source_refs: parsed.sourceRefs,
      proposed_action: parsed.proposedAction,
      status: "active",
    };
  });

  if (rows.length) {
    const { error: insertErr } = await supabase.from("agent_recommendations").insert(rows);
    if (insertErr) {
      await supabase
        .from("agent_runs")
        .update({ status: "failed", error: insertErr.message, completed_at: new Date().toISOString() })
        .eq("id", run.id);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  await supabase
    .from("agent_runs")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", run.id);

  return NextResponse.json({ created: rows.length, runId: run.id });
});

export const GET = handler;
export const POST = handler;
