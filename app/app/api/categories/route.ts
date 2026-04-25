import { NextResponse } from "next/server";

const FALLBACK: string[] = [
  "Technology", "Startups", "Business", "Finance", "Crypto",
  "Culture", "Politics", "International", "Media", "Science",
  "Health & Wellness", "Literature", "Philosophy", "History",
  "Education", "Food", "Sports", "Music", "Arts", "Climate",
];

export async function GET() {
  try {
    const res = await fetch("https://substack.com/api/v1/category/public/all", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InboxDigest/1.0)",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`Substack returned ${res.status}`);

    const data = await res.json();

    // Substack may return an array or { categories: [] }
    const raw: unknown[] = Array.isArray(data)
      ? data
      : (data as Record<string, unknown[]>).categories ?? [];

    const names = raw
      .map((c) => {
        const cat = c as Record<string, unknown>;
        return (cat.name ?? cat.title ?? "") as string;
      })
      .filter(Boolean);

    if (!names.length) throw new Error("Empty response");

    return NextResponse.json({ categories: names });
  } catch {
    return NextResponse.json({ categories: FALLBACK });
  }
}
