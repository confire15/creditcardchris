import { serverEnv } from "@/lib/env";

export type SlackNewsItem = {
  title: string;
  summary: string;
  url: string;
  category: "launch" | "sub_change" | "devaluation" | "perk_change";
  matchedCard?: string | null;
};

const CATEGORY_META: Record<SlackNewsItem["category"], { emoji: string; label: string }> = {
  launch: { emoji: ":sparkles:", label: "New card" },
  sub_change: { emoji: ":moneybag:", label: "SUB change" },
  devaluation: { emoji: ":chart_with_downwards_trend:", label: "Devaluation" },
  perk_change: { emoji: ":gift:", label: "Perk change" },
};

export async function postCardNewsToSlack(items: SlackNewsItem[]): Promise<boolean> {
  if (items.length === 0) return true;

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL is not set");
  }
  void serverEnv();

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "Credit card news" },
    },
    { type: "divider" },
  ];

  for (const item of items) {
    const meta = CATEGORY_META[item.category];
    const matchTag = item.matchedCard ? ` :dart: _${item.matchedCard}_` : "";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${meta.emoji} *${meta.label}* — <${item.url}|${escapeMrkdwn(item.title)}>${matchTag}\n${escapeMrkdwn(item.summary)}`,
      },
    });
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks, text: `Credit card news (${items.length} items)` }),
  });

  return res.ok;
}

function escapeMrkdwn(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
