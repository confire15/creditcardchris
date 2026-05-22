import type { SupabaseClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/utils/audit";

export type AgentRunRecord = {
  id: string;
  flow_type: string;
};

export type RunAgentOptions<Ctx, Out> = {
  supabase: SupabaseClient;
  userId: string;
  flowType: string;
  promptVersion: string;
  modelProvider: string;
  buildContext: () => Promise<Ctx>;
  contextSummary: (ctx: Ctx) => Record<string, unknown>;
  generate: (ctx: Ctx, run: AgentRunRecord) => Promise<Out>;
};

export async function runAgent<Ctx, Out>(opts: RunAgentOptions<Ctx, Out>): Promise<{ runId: string; output: Out }> {
  const { supabase, userId, flowType, promptVersion, modelProvider } = opts;
  const startedAt = new Date().toISOString();

  const context = await opts.buildContext();

  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      user_id: userId,
      flow_type: flowType,
      prompt_version: promptVersion,
      model_provider: modelProvider,
      status: "running",
      compact_input_summary: opts.contextSummary(context),
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    throw new Error(runError?.message ?? `Failed to create ${flowType} run`);
  }

  void logAudit(supabase, userId, "agent.run.created", {
    resource_type: "agent_run",
    resource_id: run.id,
    flow_type: flowType,
  }).catch(() => {});

  try {
    const output = await opts.generate(context, { id: run.id, flow_type: flowType });

    await supabase
      .from("agent_runs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", run.id)
      .eq("user_id", userId);

    return { runId: run.id, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : `${flowType} failed`;
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
