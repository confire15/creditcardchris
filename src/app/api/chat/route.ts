import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withPremium } from "@/lib/api/with-premium";
import { chatSchema } from "@/lib/validations/api";
import { ValidationError, errorResponse, RateLimitError } from "@/lib/api/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/api/rate-limit";
import { serverEnv } from "@/lib/env";

let anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!anthropic) anthropic = new Anthropic({ apiKey: serverEnv().ANTHROPIC_API_KEY });
  return anthropic;
}

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const rl = await checkRateLimit("chat", user.id, RATE_LIMITS.chat);
  if (!rl.allowed) return errorResponse(new RateLimitError());

  const body = await req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return errorResponse(new ValidationError("Invalid request"));
  const { messages } = parsed.data;

  // Fetch user context
  const [cardsRes, txRes, budgetsRes] = await Promise.all([
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(name, issuer, annual_fee)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("transactions")
      .select("amount, merchant_name, category:spending_categories(name), transaction_date")
      .eq("user_id", user.id)
      .gte("transaction_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order("transaction_date", { ascending: false })
      .limit(30),
    supabase
      .from("spending_budgets")
      .select("category:spending_categories(name), monthly_limit")
      .eq("user_id", user.id),
  ]);

  const cards = cardsRes.data ?? [];
  const transactions = txRes.data ?? [];
  const budgets = budgetsRes.data ?? [];

  const cardSummary = cards.map((c: Record<string, unknown>) => {
    const tmpl = c.card_template as Record<string, unknown> | null;
    return `- ${c.nickname || (tmpl?.name ?? "Custom card")} (${tmpl?.issuer ?? "Unknown"}) — $${tmpl?.annual_fee ?? 0}/yr AF`;
  }).join("\n");

  const totalSpent30d = transactions.reduce((s: number, t: Record<string, unknown>) => s + (t.amount as number), 0);

  const categoryBreakdown: Record<string, number> = {};
  for (const t of transactions as Record<string, unknown>[]) {
    const catName = (t.category as Record<string, unknown> | null)?.name as string ?? "other";
    categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + (t.amount as number);
  }
  const categoryList = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
    .join(", ");

  const budgetList = budgets.length
    ? (budgets as Record<string, unknown>[]).map((b) => `${(b.category as Record<string, unknown>)?.name}: $${b.monthly_limit}/mo`).join(", ")
    : "None set";

  const systemPrompt = `You are a helpful credit card rewards assistant for Credit Card Chris app. You help users optimize their credit card rewards, understand their spending, and make smart decisions about their cards.

USER'S CURRENT CARDS:
${cardSummary || "No cards added yet"}

LAST 30 DAYS SPENDING:
Total: $${totalSpent30d.toFixed(2)}
By category: ${categoryList || "No transactions"}

MONTHLY BUDGETS: ${budgetList}

Be concise and practical. When recommending which card to use for a purchase, reference their actual cards. Format currency as $ amounts. If asked about a specific purchase, tell them which of their cards would earn the most rewards for it. Keep responses under 200 words unless a detailed breakdown is needed.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await getAnthropic().messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          stream: true,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error(err);
        controller.enqueue(encoder.encode("Sorry, I encountered an error. Please try again."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
});
