import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withPremium } from "@/lib/api/with-premium";
import { recommendAiSchema } from "@/lib/validations/api";
import { ValidationError, errorResponse, RateLimitError } from "@/lib/api/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/api/rate-limit";
import { serverEnv } from "@/lib/env";

let anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!anthropic) anthropic = new Anthropic({ apiKey: serverEnv().ANTHROPIC_API_KEY });
  return anthropic;
}

const CATEGORY_NAMES = [
  "dining", "travel", "groceries", "gas", "entertainment",
  "streaming", "online_shopping", "drugstore", "home_improvement",
  "transit", "hotels", "flights", "car_rental", "other",
];

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const rl = await checkRateLimit("recommendAi", user.id, RATE_LIMITS.recommendAi);
  if (!rl.allowed) return errorResponse(new RateLimitError());

  const body = await req.json();
  const parsed = recommendAiSchema.safeParse(body);
  if (!parsed.success) return errorResponse(new ValidationError("Invalid request"));
  const { query } = parsed.data;

  // Step 1: Use Claude to classify the purchase into a spending category
  const classifyResponse = await getAnthropic().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: `Classify this purchase into exactly ONE of these spending categories: ${CATEGORY_NAMES.join(", ")}.

Purchase: "${query}"

Respond with only the category name, nothing else.`,
      },
    ],
  });

  const categoryName = (classifyResponse.content[0] as { text: string }).text
    .trim()
    .toLowerCase()
    .replace(/[^a-z_]/g, "");

  // Step 2: Look up the category in the DB
  const { data: category } = await supabase
    .from("spending_categories")
    .select("id, display_name, name")
    .eq("name", CATEGORY_NAMES.includes(categoryName) ? categoryName : "other")
    .single();

  if (!category) {
    return NextResponse.json({ categoryName, categoryId: null, displayName: "Other" });
  }

  return NextResponse.json({
    categoryName: category.name,
    categoryId: category.id,
    displayName: category.display_name,
  });
});
