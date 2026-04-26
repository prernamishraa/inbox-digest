import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

interface SubDoc {
  newsletterName: string;
  authorName: string;
  publicationUrl: string;
  subscriberCount?: number;
}

interface DigestPost {
  id: number;
  title: string;
  subtitle: string;
  post_date: string;
  canonical_url: string;
  newsletterName: string;
  authorName: string;
  subdomain: string;
}

interface PostSummary {
  id: number;
  summary: string;
  reason: string;
  insight: string;
}

// ─── Send digest to one user ─────────────────────────────────────────────────

export const sendDigestToUser = internalAction({
  args: {
    userId: v.id("users"),
    substackUsername: v.string(),
    gmailAddress: v.string(),
    categories: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, substackUsername, gmailAddress, categories } = args;
    console.log("[sendDigestToUser] start", { userId, substackUsername, gmailAddress });

    // 1. Get subscriptions from Convex
    const subsFromConvex = (await ctx.runQuery(
      api.users.getSubscriptions,
      { userId }
    )) as SubDoc[];
    const subs: SubDoc[] = [...subsFromConvex];
    console.log("[sendDigestToUser] subs from Convex:", subs.length, subs.map(s => s.publicationUrl));

    // Fallback: fetch directly from Substack if Convex has nothing saved
    if (!subs.length) {
      console.log("[sendDigestToUser] Convex has 0 subs — falling back to Substack API");
      try {
        const profileRes = await fetch(
          `https://substack.com/api/v1/user/${encodeURIComponent(substackUsername)}/public_profile`,
          { headers: { "User-Agent": "Mozilla/5.0 (compatible; InboxDigest/1.0)", Accept: "application/json" } }
        );
        if (profileRes.ok) {
          const profile = await profileRes.json() as {
            subscriptions?: Array<{
              publication?: {
                name?: string; subdomain?: string; custom_domain?: string;
                author_name?: string; author?: { name?: string }; subscriber_count?: number;
              };
            }>;
          };
          (profile.subscriptions ?? [])
            .filter((s) => s.publication?.name)
            .forEach((s) => {
              const pub = s.publication!;
              const url = pub.custom_domain
                ? `https://${pub.custom_domain}`
                : pub.subdomain
                ? `https://${pub.subdomain}.substack.com`
                : "";
              if (url) subs.push({
                newsletterName: pub.name!,
                authorName: pub.author?.name ?? pub.author_name ?? "",
                publicationUrl: url,
                subscriberCount: pub.subscriber_count,
              });
            });
          console.log("[sendDigestToUser] Substack fallback subs:", subs.length);
        } else {
          console.log("[sendDigestToUser] Substack profile fetch non-ok:", profileRes.status);
        }
      } catch (err) {
        console.log("[sendDigestToUser] Substack fallback threw:", String(err));
      }
    }

    if (!subs.length) {
      console.log("[sendDigestToUser] ABORT: 0 subs after both Convex and Substack fallback");
      return;
    }

    // 2. Fetch posts from Substack
    const eligible = subs
      .filter((s) => {
        try {
          return new URL(s.publicationUrl).hostname.endsWith(".substack.com");
        } catch { return false; }
      })
      .sort((a, b) => (b.subscriberCount ?? 0) - (a.subscriberCount ?? 0))
      .slice(0, 8);
    console.log("[sendDigestToUser] eligible (substack-only):", eligible.length, "of", subs.length, "total");

    if (!eligible.length) {
      console.log("[sendDigestToUser] ABORT: no .substack.com URLs — all subs are on custom domains");
      return;
    }

    const allPosts: DigestPost[] = [];
    await Promise.all(
      eligible.map(async (sub) => {
        try {
          const subdomain = new URL(sub.publicationUrl).hostname.replace(".substack.com", "");
          const ac = new AbortController();
          const tid = setTimeout(() => ac.abort(), 5000);
          const res = await fetch(
            `https://${subdomain}.substack.com/api/v1/posts?limit=3`,
            {
              headers: { "User-Agent": "Mozilla/5.0 (compatible; InboxDigest/1.0)", Accept: "application/json" },
              signal: ac.signal,
            }
          );
          clearTimeout(tid);
          if (!res.ok) {
            console.log("[sendDigestToUser] posts fetch non-ok for", subdomain, res.status);
            return;
          }
          const raw = (await res.json()) as Array<{
            id: number; title?: string; subtitle?: string;
            post_date?: string; canonical_url?: string; type?: string;
          }>;
          const filtered = raw.filter((p) => p.title && (p.type === "newsletter" || p.type === "thread" || !p.type));
          console.log("[sendDigestToUser]", subdomain, "→", filtered.length, "posts");
          filtered.forEach((p) => allPosts.push({
            id: p.id,
            title: p.title!,
            subtitle: p.subtitle ?? "",
            post_date: p.post_date ?? new Date().toISOString(),
            canonical_url: p.canonical_url ?? sub.publicationUrl,
            newsletterName: sub.newsletterName,
            authorName: sub.authorName,
            subdomain,
          }));
        } catch (err) {
          console.log("[sendDigestToUser] posts fetch threw for", sub.publicationUrl, String(err));
        }
      })
    );
    console.log("[sendDigestToUser] total posts fetched:", allPosts.length);

    if (!allPosts.length) {
      console.log("[sendDigestToUser] ABORT: all post fetches failed or returned 0 results");
      return;
    }

    const posts = allPosts
      .sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime())
      .slice(0, 8);

    // 3. Generate summaries via OpenAI
    let summaries: PostSummary[] = [];
    const openaiKey = process.env.OPENAI_API_KEY;
    console.log("[sendDigestToUser] OPENAI_API_KEY present:", !!openaiKey);
    if (openaiKey) {
      try {
        const OpenAI = (await import("openai")).default;
        const client = new OpenAI({ apiKey: openaiKey });
        const postList = posts
          .map((p) =>
            `ID:${p.id} | "${p.title}" by ${p.authorName} (${p.newsletterName})` +
            (p.subtitle ? `\nSubtitle: ${p.subtitle}` : "")
          )
          .join("\n\n---\n\n");
        const catLine = categories.length ? `Reader interests: ${categories.join(", ")}.` : "";
        const res = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 2048,
          messages: [{
            role: "user",
            content: `${catLine}\n\nFor each post return a JSON array: [{id, summary (2 sentences), reason (1 sentence why this reader cares), insight (1 key takeaway)}].\n\nPosts:\n${postList}\n\nReturn only the JSON array, no extra text.`,
          }],
        });
        const text = (res.choices[0]?.message?.content ?? "[]").trim();
        const json = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
        summaries = JSON.parse(json) as PostSummary[];
        console.log("[sendDigestToUser] summaries generated:", summaries.length);
      } catch (err) {
        console.log("[sendDigestToUser] OpenAI threw:", String(err));
      }
    }

    // 4. Build + send email
    const resendKey = process.env.RESEND_API_KEY;
    console.log("[sendDigestToUser] RESEND_API_KEY present:", !!resendKey);
    if (!resendKey) {
      console.log("[sendDigestToUser] ABORT: RESEND_API_KEY not set");
      return;
    }
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const result = await resend.emails.send({
        from: "InboxDigest <onboarding@resend.dev>",
        to: gmailAddress,
        subject: `Your digest — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
        html: buildEmailHtml(substackUsername, posts, summaries),
      });
      console.log("[sendDigestToUser] Resend result:", JSON.stringify(result));
    } catch (err) {
      console.log("[sendDigestToUser] Resend threw:", String(err));
    }
  },
});

// ─── Hourly dispatcher ───────────────────────────────────────────────────────

export const sendScheduledDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    // Convert current UTC time to IST (UTC+5:30)
    const nowMs = Date.now();
    const istMs = nowMs + (5 * 60 + 30) * 60 * 1000;
    const istHour = Math.floor(istMs / (3600 * 1000)) % 24;

    let deliveryTime: string | null = null;
    if (istHour === 7)  deliveryTime = "7am";
    if (istHour === 12) deliveryTime = "12pm";
    if (istHour === 18) deliveryTime = "6pm";

    if (!deliveryTime) return;

    const users = await ctx.runQuery(internal.users.getUsersForDelivery, { deliveryTime });

    await Promise.all(
      users
        .filter((u) => u.gmailAddress)
        .map((u) => ctx.runAction(internal.email.sendDigestToUser, {
          userId: u._id,
          substackUsername: u.substackUsername,
          gmailAddress: u.gmailAddress!,
          categories: u.categories,
        }))
    );
  },
});

// ─── HTML email builder ───────────────────────────────────────────────────────

function buildEmailHtml(username: string, posts: DigestPost[], summaries: PostSummary[]): string {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const sumMap = new Map(summaries.map((s) => [s.id, s]));

  const cards = posts.slice(0, 6).map((p) => {
    const s = sumMap.get(p.id);
    const bodyHtml = s
      ? `<p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;line-height:1.65;color:#3D3830;margin:0 0 10px 0;">${esc(s.summary)}</p>
         <p style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;line-height:1.55;color:rgba(26,23,20,0.60);border-left:2px solid #2D5016;padding-left:10px;margin:0 0 14px 0;font-style:italic;">${esc(s.insight)}</p>`
      : (p.subtitle
        ? `<p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;line-height:1.65;color:#3D3830;margin:0 0 14px 0;">${esc(p.subtitle)}</p>`
        : "");

    return `
      <tr><td style="padding:0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#ffffff;border:1px solid rgba(26,23,20,0.10);border-radius:4px;">
          <tr><td style="padding:20px 24px 22px;">
            <p style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#2D5016;margin:0 0 6px 0;">${esc(p.newsletterName)}</p>
            <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:400;line-height:1.25;letter-spacing:-0.015em;color:#1A1714;margin:0 0 4px 0;">${esc(p.title)}</h2>
            <p style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:rgba(26,23,20,0.45);margin:0 0 12px 0;">${esc(p.authorName)}</p>
            ${bodyHtml}
            <a href="${p.canonical_url}" style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;font-weight:500;color:#2D5016;text-decoration:none;">Read on Substack →</a>
          </td></tr>
        </table>
      </td></tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your InboxDigest</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F0E8;">
  <tr><td style="height:3px;background:#FFD264;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:32px 16px;">
    <table width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
      <tr><td style="border-bottom:1.5px solid #1A1714;padding-bottom:20px;">
        <p style="font-family:Georgia,serif;font-size:17px;color:#1A1714;margin:0;">
          Inbox<span style="color:#C9981A;">Digest</span>
        </p>
      </td></tr>
      <tr><td style="height:28px;">&nbsp;</td></tr>
      <tr><td style="padding-bottom:6px;">
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;line-height:1.12;letter-spacing:-0.02em;color:#1A1714;margin:0;">
          The best of your inbox,<br><em style="color:#2D5016;">curated</em> for you.
        </h1>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <p style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:rgba(26,23,20,0.50);margin:0;">
          ${esc(date)} · @${esc(username)}
        </p>
      </td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">${cards}</table>
      </td></tr>
      <tr><td style="border-top:1px solid rgba(26,23,20,0.12);padding-top:20px;">
        <p style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:rgba(26,23,20,0.38);margin:0;">
          Generated by InboxDigest for @${esc(username)}.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
