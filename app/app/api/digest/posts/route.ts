import { NextResponse } from "next/server";

interface SubInput {
  newsletterName: string;
  authorName: string;
  publicationUrl: string;
  subscriberCount?: number;
}

interface RawPost {
  id: number;
  title?: string;
  subtitle?: string;
  post_date?: string;
  canonical_url?: string;
  type?: string;
}

export interface DigestPost {
  id: number;
  title: string;
  subtitle: string;
  post_date: string;
  canonical_url: string;
  type: string;
  newsletterName: string;
  authorName: string;
  publicationUrl: string;
  subscriberCount: number;
  subdomain: string;
}

function extractSubdomain(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".substack.com")) {
      return u.hostname.replace(".substack.com", "");
    }
  } catch {
    // invalid URL
  }
  return null;
}

export async function POST(req: Request) {
  let subscriptions: SubInput[] = [];
  try {
    const body = await req.json() as { subscriptions?: SubInput[] };
    subscriptions = body.subscriptions ?? [];
  } catch {
    return NextResponse.json({ posts: [] });
  }

  const eligible = subscriptions
    .filter((s) => extractSubdomain(s.publicationUrl) !== null)
    .sort((a, b) => (b.subscriberCount ?? 0) - (a.subscriberCount ?? 0))
    .slice(0, 12);

  const results = await Promise.allSettled(
    eligible.map(async (sub) => {
      const subdomain = extractSubdomain(sub.publicationUrl)!;
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 5000);
      try {
        const res = await fetch(
          `https://${subdomain}.substack.com/api/v1/posts?limit=5`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; InboxDigest/1.0)",
              Accept: "application/json",
            },
            signal: ac.signal,
          }
        );
        clearTimeout(tid);
        if (!res.ok) return [] as DigestPost[];
        const raw = (await res.json()) as RawPost[];
        return raw
          .filter((p) => p.title && (p.type === "newsletter" || p.type === "thread" || !p.type))
          .map((p): DigestPost => ({
            id: p.id,
            title: p.title!,
            subtitle: p.subtitle ?? "",
            post_date: p.post_date ?? new Date().toISOString(),
            canonical_url: p.canonical_url ?? sub.publicationUrl,
            type: p.type ?? "newsletter",
            newsletterName: sub.newsletterName,
            authorName: sub.authorName,
            publicationUrl: sub.publicationUrl,
            subscriberCount: sub.subscriberCount ?? 0,
            subdomain,
          }));
      } catch {
        clearTimeout(tid);
        return [] as DigestPost[];
      }
    })
  );

  const allPosts: DigestPost[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") allPosts.push(...r.value);
  }

  return NextResponse.json({ posts: allPosts });
}
