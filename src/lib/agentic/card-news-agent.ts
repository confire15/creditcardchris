import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import type { SlackNewsItem } from "@/lib/slack/post-message";

const newsItemSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().min(10).max(280),
  url: z.string().url(),
  category: z.enum(["launch", "sub_change", "devaluation", "perk_change"]),
  card_name: z.string().nullable().optional(),
});

const agentOutputSchema = z.object({
  items: z.array(newsItemSchema).max(20),
});

const SYSTEM_PROMPT = `You are a credit-card news researcher for a US consumer rewards app.

Search the web for credit-card news from the last 24-48 hours covering:
- New US consumer card launches or major refreshes
- Signup bonus (SUB) offer changes — elevated, expired, or new
- Devaluations — earning rate cuts, transfer ratio changes, removed benefits
- Perk/benefit changes — new credits, lounge access, insurance, etc.

Skip: business cards, non-US cards, pure opinion pieces, generic "best cards" listicles, news older than 3 days.

Trusted sources include: Doctor of Credit, The Points Guy, Frequent Miler, View From The Wing, One Mile at a Time, NerdWallet, Bankrate.

For each story, capture:
- title: concise, factual headline
- summary: one sentence, what changed and the key number
- url: the EXACT URL from the search result (never fabricate)
- category: one of launch | sub_change | devaluation | perk_change
- card_name: the specific card affected (e.g. "Chase Sapphire Preferred", "Amex Gold"), or null if multiple/none

Return at most 8 of the most impactful items. Output ONLY valid JSON in this exact shape:
{"items":[{"title":"...","summary":"...","url":"https://...","category":"launch","card_name":"..."}]}`;

export async function fetchCardNews(): Promise<Omit<SlackNewsItem, "matchedCard">[]> {
  const apiKey = serverEnv().ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    temperature: 0,
    system: SYSTEM_PROMPT,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      } as unknown as Anthropic.Tool,
    ],
    messages: [
      {
        role: "user",
        content:
          "Find today's most impactful US consumer credit-card news (launches, SUB changes, devaluations, perk changes). Return up to 8 items as JSON.",
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const json = extractJson(text);
  const parsed = agentOutputSchema.parse(json);

  return parsed.items.map((item) => ({
    title: item.title,
    summary: item.summary,
    url: item.url,
    category: item.category,
    matchedCard: item.card_name ?? null,
  }));
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Agent response did not contain JSON object");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

type NewsItemDraft = Omit<SlackNewsItem, "matchedCard"> & {
  matchedCard?: string | null;
};

export async function fuzzyMatchToTemplates(
  items: NewsItemDraft[],
  templateNames: string[]
): Promise<SlackNewsItem[]> {
  if (items.length === 0 || templateNames.length === 0) {
    return items.map((i) => ({ ...i, matchedCard: i.matchedCard ?? null }));
  }

  const lowered = templateNames.map((n) => ({ name: n, lower: n.toLowerCase() }));

  return items.map((item) => {
    const candidate = (item.matchedCard ?? "").toLowerCase().trim();
    if (!candidate) return { ...item, matchedCard: null };

    const direct = lowered.find((t) => t.lower === candidate);
    if (direct) return { ...item, matchedCard: direct.name };

    const candidateTokens = tokenize(candidate);
    let best: { name: string; score: number } | null = null;
    for (const t of lowered) {
      const score = tokenOverlap(candidateTokens, tokenize(t.lower));
      if (score >= 0.6 && (!best || score > best.score)) {
        best = { name: t.name, score };
      }
    }
    return { ...item, matchedCard: best?.name ?? null };
  });
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .replace(/[^a-z0-9 ]/gi, " ")
      .split(/\s+/)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / Math.min(a.size, b.size);
}

const STOPWORDS = new Set(["the", "and", "card", "credit", "from"]);
