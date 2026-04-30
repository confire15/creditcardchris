import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, AppError } from "@/lib/api/errors";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { SpendingCategory } from "@/lib/types/database";
import { classifyByKeyword, parseAmountFromQuery } from "@/lib/utils/merchant-keywords";
import { isPremiumPlan } from "@/lib/utils/subscription";

const askSchema = z.object({
  query: z.string().trim().min(1).max(500),
});

type AskResponse = {
  categoryId: string | null;
  categoryName: string | null;
  amount: number | null;
  merchant: string | null;
  reasoning: string;
  source: "ai" | "keyword";
};

type AiClassification = {
  categoryName: string | null;
  amount: number | null;
  merchant: string | null;
  reasoning: string;
};

const aiClassificationSchema = z.object({
  categoryName: z.string().nullable(),
  amount: z.number().nonnegative().nullable(),
  merchant: z.string().nullable(),
  reasoning: z.string().min(1),
});

function keywordClassification(query: string, categories: SpendingCategory[]): AskResponse {
  const { categoryId, matchedKeyword } = classifyByKeyword(query, categories);
  const category = categoryId ? categories.find((c) => c.id === categoryId) : null;

  return {
    categoryId,
    categoryName: category?.name ?? null,
    amount: parseAmountFromQuery(query),
    merchant: null,
    reasoning: matchedKeyword
      ? `Matched keyword: ${matchedKeyword}`
      : "No keyword match found. Try naming the merchant or purchase category.",
    source: "keyword",
  };
}

function unclassifiedResponse(query: string, reasoning: string): AskResponse {
  return {
    categoryId: null,
    categoryName: null,
    amount: parseAmountFromQuery(query),
    merchant: null,
    reasoning,
    source: "keyword",
  };
}

function extractJson(text: string): unknown {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object returned");
  }
  return JSON.parse(text.slice(firstBrace, lastBrace + 1));
}

function normalizeAiCategory(name: string | null, categories: SpendingCategory[]) {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return (
    categories.find((c) => c.name.toLowerCase() === normalized) ??
    categories.find((c) => c.display_name.toLowerCase() === normalized) ??
    null
  );
}

async function classifyWithAnthropic(
  query: string,
  categories: SpendingCategory[],
  apiKey: string
): Promise<AiClassification> {
  const anthropic = new Anthropic({ apiKey });
  const categoryLines = categories
    .map((category) => `${category.name}: ${category.display_name}`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    temperature: 0,
    system:
      "You classify credit-card purchases. Given a free-text purchase description, choose the best matching spending category from the provided list, extract the dollar amount mentioned (or null), and the merchant name (or null). Respond ONLY with JSON: {categoryName, amount, merchant, reasoning}. reasoning is one short sentence.",
    messages: [
      {
        role: "user",
        content: `Purchase: ${query}\n\nAvailable categories:\n${categoryLines}\n\nReturn only valid JSON.`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed = z
    .object({
      categoryName: z.string().nullable(),
      amount: z.union([z.number(), z.string()]).nullable(),
      merchant: z.string().nullable(),
      reasoning: z.string().min(1),
    })
    .parse(extractJson(text));

  const amount =
    typeof parsed.amount === "string"
      ? parseAmountFromQuery(parsed.amount) ?? Number.parseFloat(parsed.amount.replace(/[^0-9.]/g, ""))
      : parsed.amount;

  return aiClassificationSchema.parse({
    ...parsed,
    amount: Number.isFinite(amount) ? amount : null,
  });
}

function getAnthropicApiKey(): string | null {
  try {
    return serverEnv().ANTHROPIC_API_KEY ?? null;
  } catch (err) {
    console.error("[ask-chris] server env validation failed; falling back to keyword classification:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse(new AppError(401, "Unauthorized", "AUTH_ERROR"));

    const body = await req.json().catch(() => null);
    const parsed = askSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(new AppError(400, "Enter a purchase up to 500 characters.", "VALIDATION_ERROR"));
    }

    const [subRes, categoriesRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("spending_categories")
        .select("*")
        .order("display_name"),
    ]);

    if (subRes.error) {
      console.error("[ask-chris] subscription lookup failed; using free keyword path:", subRes.error);
    }

    const categories = (categoriesRes.data ?? []) as SpendingCategory[];
    if (categoriesRes.error) {
      console.error("[ask-chris] category lookup failed:", categoriesRes.error);
      return NextResponse.json(
        unclassifiedResponse(parsed.data.query, "Could not load spending categories. Try again.")
      );
    }

    const isPremium = isPremiumPlan(subRes.data);
    const fallback = () => keywordClassification(parsed.data.query, categories);

    if (!isPremium) return NextResponse.json(fallback());

    const apiKey = getAnthropicApiKey();
    if (!apiKey) return NextResponse.json(fallback());

    try {
      const ai = await classifyWithAnthropic(parsed.data.query, categories, apiKey);
      const category = normalizeAiCategory(ai.categoryName, categories);

      return NextResponse.json({
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        amount: ai.amount,
        merchant: ai.merchant,
        reasoning: ai.reasoning,
        source: "ai",
      } satisfies AskResponse);
    } catch (err) {
      console.error("[ask-chris] Anthropic classification failed:", err);
      return NextResponse.json(fallback());
    }
  } catch (err) {
    return errorResponse(err);
  }
}
