import { NextResponse } from "next/server";

interface RawSub {
  publication?: {
    name?: string;
    subdomain?: string;
    custom_domain?: string;
    author_name?: string;
    subscriber_count?: number;
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const res = await fetch(
      `https://substack.com/api/v1/user/${encodeURIComponent(username)}/subscriptions`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; InboxDigest/1.0)",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) throw new Error(`Substack returned ${res.status}`);

    const data = await res.json();

    const raw: RawSub[] = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown>).subscriptions as RawSub[]) ?? [];

    const subscriptions = raw
      .filter((s) => s.publication?.name)
      .map((s) => ({
        newsletterName: s.publication!.name!,
        authorName: s.publication!.author_name ?? "",
        publicationUrl:
          s.publication!.custom_domain ??
          (s.publication!.subdomain
            ? `https://${s.publication!.subdomain}.substack.com`
            : ""),
        subscriberCount: s.publication!.subscriber_count,
      }));

    return NextResponse.json({ subscriptions });
  } catch {
    return NextResponse.json(
      { subscriptions: [], error: "Could not reach Substack" },
      { status: 200 }
    );
  }
}
