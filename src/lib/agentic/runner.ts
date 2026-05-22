import type { SupabaseClient } from "@supabase/supabase-js";
import { buildWalletContext } from "@/lib/agentic/wallet-context";
import { generateWalletRecommendations } from "@/lib/agentic/wallet-copilot";
import {
  WALLET_COPILOT_PROMPT_VERSION,
  agentRunSummarySchema,
  agentRecommendationRowSchema,
  type AgentRunSummary,
  type AgentRecommendationRow,
} from "@/lib/agentic/schemas";
import { enhanceRecommendationExplanations, hasAiGatewayCredentials } from "@/lib/agentic/ai-explanations";
import { judgeRecommendations, VALIDATOR_PROMPT_VERSION, PASSING_THRESHOLDS } from "@/lib/agentic/validator";
import { logAudit } from "@/lib/utils/audit";
import { logSecurityEvent } from "@/lib/api/logging";
import { refreshUserActions } from "@/lib/actions/runner";

const PROD_EVAL_SAMPLE_RATE = Number(process.env.AGENT_EVAL_SAMPLE_RATE ?? "0.01");

async function sampleEvalFindings({
  supabase,
  userId,
  runId,
  context,
  inserted,
}: {
  supabase: SupabaseClient;
  userId: string;
  runId: string;
  context: Awaited<ReturnType<typeof buildWalletContext>>;
  inserted: AgentRecommendationRow[];
}) {
  if (inserted.length === 0) return;
  if (Math.random() > PROD_EVAL_SAMPLE_RATE) return;
  try {
    const judged = await judgeRecommendations({
      context,
      recommendations: inserted.map((row) => ({
        type: row.type,
        priority: row.priority,
        confidence: row.confidence,
        title: row.title,
        rationale: row.rationale,
        sourceRefs: row.source_refs,
        proposedAction: row.proposed_action,
      })),
    });
    const rows = judged.map((item) => {
      const flagged =
        item.score.grounded < PASSING_THRESHOLDS.minGrounded ||
        item.score.hallucination > PASSING_THRESHOLDS.maxHallucination ||
        item.score.safe < PASSING_THRESHOLDS.minSafe;
      return {
        run_id: runId,
        recommendation_id: inserted[item.index].id,
        user_id: userId,
        judge_version: VALIDATOR_PROMPT_VERSION,
        model: hasAiGatewayCredentials() ? "openai/gpt-5.4-mini" : "deterministic-v1",
        scores: {
          grounded: item.score.grounded,
          useful: item.score.useful,
          safe: item.score.safe,
          hallucination: item.score.hallucination,
        },
        reasoning: item.score.reasoning,
        flagged,
      };
    });
    await supabase.from("agent_eval_findings").insert(rows);
  } catch (err) {
    logSecurityEvent("[wallet-copilot] eval sampling failed", err);
  }
}

export async function runWalletCopilot(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ runId: string; recommendations: AgentRecommendationRow[] }> {
  const now = new Date();
  const context = await buildWalletContext(supabase, userId, now);

  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      user_id: userId,
      flow_type: "wallet_copilot",
      prompt_version: WALLET_COPILOT_PROMPT_VERSION,
      model_provider: hasAiGatewayCredentials() ? "deterministic-v1+ai-sdk" : "deterministic-v1",
      status: "running",
      compact_input_summary: context.summary,
      started_at: now.toISOString(),
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    throw new Error(runError?.message ?? "Failed to create agent run");
  }

  void logAudit(supabase, userId, "agent.run.created", {
    resource_type: "agent_run",
    resource_id: run.id,
    flow_type: "wallet_copilot",
  }).catch(() => {});

  try {
    const recommendations = await enhanceRecommendationExplanations({
      context,
      recommendations: generateWalletRecommendations(context, now),
    });

    await supabase
      .from("agent_recommendations")
      .update({ status: "stale", updated_at: now.toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");

    const rows = recommendations.map((recommendation) => ({
      run_id: run.id,
      user_id: userId,
      type: recommendation.type,
      priority: recommendation.priority,
      confidence: recommendation.confidence,
      title: recommendation.title,
      rationale: recommendation.rationale,
      source_refs: recommendation.sourceRefs,
      proposed_action: recommendation.proposedAction,
      status: "active",
    }));

    const { data, error } = rows.length
      ? await supabase
          .from("agent_recommendations")
          .insert(rows)
          .select("*")
      : { data: [], error: null };

    if (error) throw new Error(error.message);

    await supabase
      .from("agent_runs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", run.id)
      .eq("user_id", userId);

    const parsed = (data ?? []).map((row) => agentRecommendationRowSchema.parse(row));

    void sampleEvalFindings({
      supabase,
      userId,
      runId: run.id,
      context,
      inserted: parsed,
    }).catch(() => {});

    void refreshUserActions(supabase, userId).catch((err) => {
      logSecurityEvent("[wallet-copilot] action bridge refresh failed", err);
    });

    return {
      runId: run.id,
      recommendations: parsed,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wallet Copilot failed";
    await supabase
      .from("agent_runs")
      .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
      .eq("id", run.id)
      .eq("user_id", userId);

    void logAudit(supabase, userId, "agent.run.failed", {
      resource_type: "agent_run",
      resource_id: run.id,
      error: message,
    }).catch(() => {});
    throw err;
  }
}

export async function listActiveRecommendations(
  supabase: SupabaseClient,
  userId: string,
  limit = 12,
): Promise<AgentRecommendationRow[]> {
  const { data, error } = await supabase
    .from("agent_recommendations")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => agentRecommendationRowSchema.parse(row));
}

export async function getLastWalletCopilotRun(
  supabase: SupabaseClient,
  userId: string,
): Promise<AgentRunSummary | null> {
  const { data, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("flow_type", "wallet_copilot")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { count } = await supabase
    .from("agent_recommendations")
    .select("*", { count: "exact", head: true })
    .eq("run_id", data.id)
    .eq("user_id", userId);

  return agentRunSummarySchema.parse({
    ...data,
    recommendation_count: count ?? 0,
  });
}

export async function getActiveRecommendationCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("agent_recommendations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function acceptRecommendation(
  supabase: SupabaseClient,
  userId: string,
  recommendationId: string,
) {
  const { data: recommendation, error } = await supabase
    .from("agent_recommendations")
    .select("*")
    .eq("id", recommendationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !recommendation) {
    throw new Error("Recommendation not found");
  }

  const parsed = agentRecommendationRowSchema.parse(recommendation);
  const now = new Date().toISOString();

  await supabase
    .from("agent_recommendations")
    .update({ status: "accepted", updated_at: now })
    .eq("id", recommendationId)
    .eq("user_id", userId);

  await supabase.from("agent_feedback").insert({
    recommendation_id: recommendationId,
    user_id: userId,
    feedback_type: "accepted",
  });

  void logAudit(supabase, userId, "agent.recommendation.accepted", {
    resource_type: "agent_recommendation",
    resource_id: recommendationId,
    recommendation_type: parsed.type,
  }).catch(() => {});

  return parsed.proposed_action;
}

export async function dismissRecommendation(
  supabase: SupabaseClient,
  userId: string,
  recommendationId: string,
  notes?: string | null,
) {
  const now = new Date().toISOString();
  const { data: recommendation, error } = await supabase
    .from("agent_recommendations")
    .update({ status: "dismissed", updated_at: now })
    .eq("id", recommendationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("id, type")
    .single();

  if (error || !recommendation) {
    throw new Error("Recommendation not found");
  }

  await supabase.from("agent_feedback").insert({
    recommendation_id: recommendationId,
    user_id: userId,
    feedback_type: "dismissed",
    notes: notes ?? null,
  });

  void logAudit(supabase, userId, "agent.recommendation.dismissed", {
    resource_type: "agent_recommendation",
    resource_id: recommendationId,
    recommendation_type: recommendation.type,
  }).catch(() => {});
}
