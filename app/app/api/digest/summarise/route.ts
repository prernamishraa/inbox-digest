import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { DigestPost } from "@/app/api/digest/posts/route";

export interface PostSummary {
  id: number;
  summary: string;
  reason: string;
  insight: string;
}

export async function POST(req: Request) {
  let posts: DigestPost[] = [];
  let categories: string[] = [];
  try {
    const body = await req.json() as { posts?: DigestPost[]; categories?: string[] };
    posts = (body.posts ?? []).slice(0, 8);
    categories = body.categories ?? [];
  } catch {
    return NextResponse.json({ summaries: [] });
  }

  if (!posts.length) return NextResponse.json({ summaries: [] });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ summaries: [] });

  const client = new Anthropic({ apiKey });

  const postList = posts
    .map((p) =>
      `ID:${p.id} | "${p.title}" by ${p.authorName} (${p.newsletterName})` +
      (p.subtitle ? `\nSubtitle: ${p.subtitle}` : "")
    )
    .join("\n\n---\n\n");

  const catLine = categories.length
    ? `The reader is interested in: ${categories.join(", ")}.`
    : "";

  const prompt = `You are helping a reader quickly scan their Substack digest. ${catLine}

For each post below, write:
- "summary": 2 plain-English sentences on what the post covers
- "reason": 1 sentence on why this specific reader would care (tie to their interests or the newsletter's topic)
- "insight": 1 sharp, memorable takeaway

Posts:
${postList}

Return a JSON array only — no markdown fences, no extra text:
[{"id": <number>, "summary": "...", "reason": "...", "insight": "..."}]`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
    // Strip accidental markdown fences
    const json = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
    const summaries = JSON.parse(json) as PostSummary[];
    return NextResponse.json({ summaries });
  } catch {
    return NextResponse.json({ summaries: [] });
  }
}
