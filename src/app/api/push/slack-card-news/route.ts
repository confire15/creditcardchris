export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withCron } from "@/lib/api/with-cron";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCardNews, fuzzyMatchToTemplates } from "@/lib/agentic/card-news-agent";
import { postCardNewsToSlack } from "@/lib/slack/post-message";

const MAX_ITEMS_PER_RUN = 5;

const handler = withCron(async () => {
  const supabase = createServiceClient();

  const draftItems = await fetchCardNews();
  if (draftItems.length === 0) {
    return NextResponse.json({ posted: 0, reason: "no_items" });
  }

  const urls = draftItems.map((i) => i.url);
  const { data: alreadySent } = await supabase
    .from("slack_news_sent")
    .select("url")
    .in("url", urls);

  const sentSet = new Set((alreadySent ?? []).map((r) => r.url));
  const fresh = draftItems.filter((i) => !sentSet.has(i.url));

  if (fresh.length === 0) {
    return NextResponse.json({ posted: 0, reason: "all_duplicates" });
  }

  const { data: templates } = await supabase
    .from("card_templates")
    .select("name");
  const templateNames = (templates ?? []).map((t) => t.name).filter(Boolean);

  const matched = await fuzzyMatchToTemplates(fresh, templateNames);
  const toPost = matched.slice(0, MAX_ITEMS_PER_RUN);

  const ok = await postCardNewsToSlack(toPost);
  if (!ok) {
    return NextResponse.json({ posted: 0, error: "slack_post_failed" }, { status: 502 });
  }

  await supabase.from("slack_news_sent").insert(
    toPost.map((i) => ({
      url: i.url,
      title: i.title,
      category: i.category,
    }))
  );

  return NextResponse.json({ posted: toPost.length, matched: toPost.filter((i) => i.matchedCard).length });
});

export const GET = handler;
export const POST = handler;
