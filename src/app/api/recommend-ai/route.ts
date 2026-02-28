import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORY_NAMES = [
  "dining", "travel", "groceries", "gas", "entertainment",
  "streaming", "online_shopping", "drugstore", "home_improvement",
  "transit", "hotels", "flights", "car_rental", "other",
];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "No query" }, { status: 400 });

  try {
    // Step 1: Use Claude to classify the purchase into a spending category
    const classifyResponse = await anthropic.messages.create({
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
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI classification failed" }, { status: 500 });
  }
}
