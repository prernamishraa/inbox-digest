"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { DigestPost } from "@/app/api/digest/posts/route";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

interface Subscription {
  newsletterName: string;
  authorName: string;
  publicationUrl: string;
  subscriberCount?: number;
}

const CATEGORY_MAP: [RegExp, string][] = [
  [/tech|ai|software|crypto|web|data|code|dev|startup|product/i, "Technology"],
  [/finance|money|invest|market|economic|bank|stock|fund|wealth/i, "Finance"],
  [/health|medical|wellness|mental|diet|fitness|biohack/i, "Health"],
  [/culture|society|art|music|film|book|lit|essay|creative/i, "Culture"],
  [/business|entrepreneur|manage|strategy|leader|founder/i, "Business"],
  [/science|research|biology|physics|climate|nature|space/i, "Science"],
  [/politic|law|government|democrat|republic|policy/i, "Politics"],
  [/media|journal|news|report|press|newsletter/i, "Media"],
  [/food|cook|recipe|restaurant|eat|drink|wine/i, "Food"],
  [/travel|wander|explore|adventure|place|city/i, "Travel"],
];

function guessCategory(name: string, author: string): string {
  const text = (name + " " + author).toLowerCase();
  for (const [pattern, cat] of CATEGORY_MAP) {
    if (pattern.test(text)) return cat;
  }
  return "Newsletter";
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function today(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Sections {
  missed: DigestPost[];
  topCreator: DigestPost | null;
  topCreatorPub: Subscription | null;
  category: string;
  categoryPosts: DigestPost[];
  trending: DigestPost[];
  discovery: Subscription[];
}

function organizeSections(
  posts: DigestPost[],
  subscriptions: Subscription[],
  userCategories: string[]
): Sections {
  const sorted = [...posts].sort(
    (a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime()
  );

  const topPub = [...subscriptions].sort(
    (a, b) => (b.subscriberCount ?? 0) - (a.subscriberCount ?? 0)
  )[0];

  const used = new Set<number>();

  const topCreatorPost = topPub
    ? sorted.find((p) => p.newsletterName === topPub.newsletterName) ?? null
    : null;
  if (topCreatorPost) used.add(topCreatorPost.id);

  const missed = sorted.filter((p) => !used.has(p.id)).slice(0, 2);
  missed.forEach((p) => used.add(p.id));

  let trending = sorted
    .filter((p) => !used.has(p.id) && (p.subscriberCount ?? 0) > 50000)
    .slice(0, 2);
  if (trending.length < 2) {
    const extra = sorted.filter((p) => !used.has(p.id)).slice(0, 2 - trending.length);
    trending = [...trending, ...extra];
  }
  trending.forEach((p) => used.add(p.id));

  const category = userCategories[0] ?? "Great writing";
  const categoryPosts = sorted.filter((p) => !used.has(p.id)).slice(0, 2);
  categoryPosts.forEach((p) => used.add(p.id));

  const featuredNames = new Set<string>(
    [
      topCreatorPost?.newsletterName,
      ...missed.map((p) => p.newsletterName),
      ...trending.map((p) => p.newsletterName),
      ...categoryPosts.map((p) => p.newsletterName),
    ].filter(Boolean) as string[]
  );

  const discovery = subscriptions
    .filter((s) => !featuredNames.has(s.newsletterName))
    .slice(0, 3);

  return { missed, topCreator: topCreatorPost, topCreatorPub: topPub ?? null, category, categoryPosts, trending, discovery };
}

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

function PostCard({ post, index = 0 }: { post: DigestPost; index?: number }) {
  const tag = guessCategory(post.newsletterName, post.authorName);
  return (
    <div className="post-card" style={{ background: "#FFFFFF", padding: "26px 28px 28px", animationDelay: `${0.05 + index * 0.06}s` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <span style={{ display: "inline-block", background: "#2D5016", color: "#fff", fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, padding: "3px 9px", borderRadius: 2, flexShrink: 0 }}>{tag}</span>
        <span style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 11, color: "rgba(26,23,20,0.42)", whiteSpace: "nowrap" as const, flexShrink: 0 }}>{relativeDate(post.post_date)}</span>
      </div>
      <h3 style={{ fontFamily: "var(--font-serif),'Instrument Serif',serif", fontSize: 20, fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.016em", color: "#1A1714", marginBottom: 5 }}>{post.title}</h3>
      <p style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 12, fontWeight: 500, color: "rgba(26,23,20,0.45)", letterSpacing: "0.02em", marginBottom: post.subtitle ? 13 : 16 }}>{post.authorName} · {post.newsletterName}</p>
      {post.subtitle && (
        <p style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 13.5, fontWeight: 400, lineHeight: 1.65, color: "#3D3830", marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{post.subtitle}</p>
      )}
      <a href={post.canonical_url} target="_blank" rel="noopener noreferrer" className="read-link" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 12, fontWeight: 500, color: "#2D5016", textDecoration: "none", letterSpacing: "0.01em" }}>
        Read on Substack
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden><path d="M2 9L9 2M9 2H4M9 2V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </a>
    </div>
  );
}

function FeaturedCard({ post }: { post: DigestPost }) {
  const tag = guessCategory(post.newsletterName, post.authorName);
  return (
    <div className="post-card" style={{ background: "#FFFFFF", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, animationDelay: "0.08s" }}>
      <div style={{ padding: "30px 32px", borderRight: "1px solid rgba(26,23,20,0.08)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <span style={{ display: "inline-block", background: "#2D5016", color: "#fff", fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, padding: "3px 9px", borderRadius: 2 }}>{tag}</span>
          <span style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 11, color: "rgba(26,23,20,0.42)", whiteSpace: "nowrap" as const }}>{relativeDate(post.post_date)}</span>
        </div>
        <h3 style={{ fontFamily: "var(--font-serif),'Instrument Serif',serif", fontSize: 24, fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.018em", color: "#1A1714", marginBottom: 8 }}>{post.title}</h3>
        <p style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 12, fontWeight: 500, color: "rgba(26,23,20,0.45)", letterSpacing: "0.02em" }}>{post.authorName} · {post.newsletterName}</p>
      </div>
      <div style={{ padding: "30px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {post.subtitle && (
          <p style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 13.5, fontWeight: 400, lineHeight: 1.65, color: "#3D3830", marginBottom: 20, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{post.subtitle}</p>
        )}
        <a href={post.canonical_url} target="_blank" rel="noopener noreferrer" className="read-link" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 12, fontWeight: 500, color: "#2D5016", textDecoration: "none", letterSpacing: "0.01em", alignSelf: "flex-start" }}>
          Read on Substack
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden><path d="M2 9L9 2M9 2H4M9 2V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </a>
      </div>
    </div>
  );
}

function DiscoveryCard({ sub, index = 0 }: { sub: Subscription; index?: number }) {
  const tag = guessCategory(sub.newsletterName, sub.authorName);
  const count = sub.subscriberCount
    ? sub.subscriberCount >= 1000000
      ? `${(sub.subscriberCount / 1000000).toFixed(1)}M subscribers`
      : sub.subscriberCount >= 1000
      ? `${Math.round(sub.subscriberCount / 1000)}K subscribers`
      : `${sub.subscriberCount} subscribers`
    : null;
  return (
    <div className="post-card" style={{ background: "#EDE7D8", padding: "26px 28px 28px", animationDelay: `${0.05 + index * 0.06}s` }}>
      <span style={{ display: "inline-block", background: "#2D5016", color: "#fff", fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, padding: "3px 9px", borderRadius: 2, marginBottom: 12 }}>{tag}</span>
      <h3 style={{ fontFamily: "var(--font-serif),'Instrument Serif',serif", fontSize: 19, fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.015em", color: "#1A1714", marginBottom: 5 }}>{sub.newsletterName}</h3>
      <p style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 12, fontWeight: 400, color: "rgba(26,23,20,0.50)", marginBottom: 16 }}>{sub.authorName}{count ? ` · ${count}` : ""}</p>
      <a href={sub.publicationUrl} target="_blank" rel="noopener noreferrer" className="follow-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1.5px solid #2D5016", borderRadius: 3, fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "0.03em", color: "#2D5016", textDecoration: "none", transition: "all 0.18s ease" }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        Visit on Substack
      </a>
    </div>
  );
}

function SectionHeader({ num, title, count }: { num: string; title: React.ReactNode; count?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 18, borderBottom: "1.5px solid #1A1714", marginBottom: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(26,23,20,0.40)" }}>{num}</span>
        <h2 style={{ fontFamily: "var(--font-serif),'Instrument Serif',serif", fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#1A1714" }}>{title}</h2>
      </div>
      {count && <span style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 12, color: "rgba(26,23,20,0.40)", marginBottom: 4 }}>{count}</span>}
    </div>
  );
}

function LoadingState({ message = "Building your digest…" }: { message?: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(45,80,22,0.12)", borderTopColor: "rgba(45,80,22,0.60)", animation: "spin 0.9s linear infinite" }} />
      <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 18, color: "rgba(26,23,20,0.50)", letterSpacing: "-0.01em" }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function DigestContent({ username }: { username: string }) {
  // Try Convex for user preferences — with graceful degradation if unavailable
  const userData = useQuery(api.users.getUserByUsername, { substackUsername: username });

  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [posts, setPosts] = useState<DigestPost[] | null>(null);
  const [convexTimedOut, setConvexTimedOut] = useState(false);
  const postsFetchedRef = useRef(false);

  // Always fetch subscriptions directly from Substack — don't wait for Convex
  useEffect(() => {
    fetch(`/api/subscriptions/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d: { subscriptions?: Subscription[] }) => setSubs(d.subscriptions ?? []))
      .catch(() => setSubs([]));
  }, [username]);

  // 4-second timeout: if Convex hasn't resolved, proceed anyway
  useEffect(() => {
    const tid = setTimeout(() => setConvexTimedOut(true), 4000);
    return () => clearTimeout(tid);
  }, []);

  // Fetch posts once subs are loaded AND Convex has resolved (or timed out)
  const convexReady = userData !== undefined || convexTimedOut;

  useEffect(() => {
    if (postsFetchedRef.current) return;
    if (!subs) return; // still loading subs

    // If no subscriptions, exit loading state immediately
    if (subs.length === 0) {
      setPosts([]);
      return;
    }

    if (!convexReady) return; // wait up to 4s for Convex categories

    postsFetchedRef.current = true;
    fetch("/api/digest/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptions: subs }),
    })
      .then((r) => r.json())
      .then((d: { posts?: DigestPost[] }) => setPosts(d.posts ?? []))
      .catch(() => setPosts([]));
  }, [subs, convexReady]);

  if (!subs || posts === null) return <LoadingState />;

  const userCategories = userData?.categories ?? [];
  const sections = organizeSections(posts, subs, userCategories);

  const savedMinutes = Math.round(posts.length * 7);
  const savedLabel = savedMinutes >= 60
    ? `${Math.floor(savedMinutes / 60)}h ${savedMinutes % 60}m`
    : `${savedMinutes} min`;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", position: "relative" }}>
      <div aria-hidden style={{ position: "fixed", inset: 0, backgroundImage: NOISE_SVG, backgroundSize: "200px 200px", opacity: 0.025, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Amber accent bar */}
        <div style={{ height: 3, background: "#FFD264" }} />

        {/* Masthead */}
        <header style={{ borderBottom: "1.5px solid #1A1714", padding: "20px 40px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const }}>
          <div style={{ fontFamily: "var(--font-serif),'Instrument Serif',serif", fontSize: 17, color: "#1A1714", letterSpacing: "-0.01em" }}>
            Inbox<span style={{ color: "#C9981A" }}>Digest</span>
          </div>
          <div style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.07em", color: "rgba(26,23,20,0.42)", textTransform: "uppercase" as const }}>
            {today()} · @{username}
          </div>
        </header>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>

          {/* Digest header */}
          <div style={{ padding: "48px 0 40px", borderBottom: "1px solid rgba(26,23,20,0.10)", animation: "fadeUp 0.6s ease 0.02s both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.11em", textTransform: "uppercase" as const, color: "#2D5016" }}>Your personal digest</span>
              <span style={{ display: "block", width: 28, height: 1, background: "#2D5016", opacity: 0.45 }} />
            </div>

            <h1 style={{ fontFamily: "var(--font-serif),'Instrument Serif',serif", fontSize: "clamp(38px, 5.5vw, 64px)", fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.025em", color: "#1A1714", marginBottom: 16 }}>
              The best of your inbox,<br />
              <em style={{ fontStyle: "italic", color: "#2D5016" }}>curated</em> for you.
            </h1>

            <p style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: "rgba(26,23,20,0.50)", marginBottom: 36 }}>
              Pulled from {subs.length} newsletter{subs.length !== 1 ? "s" : ""} you follow — we found the pieces worth your time.
            </p>

            {/* Stats row */}
            <div style={{ display: "flex", border: "1px solid rgba(26,23,20,0.10)", borderRadius: 4, overflow: "hidden", background: "#EDE7D8", animation: "fadeUp 0.5s ease 0.12s both" }}>
              {[
                { value: subs.length.toString(), label: "Newsletters tracked" },
                { value: posts.length.toString(), label: "Posts fetched" },
                { value: savedLabel, label: "Reading time saved" },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ flex: 1, padding: "16px 22px", borderRight: i < arr.length - 1 ? "1px solid rgba(26,23,20,0.10)" : "none" }}>
                  <div style={{ fontFamily: "var(--font-serif),'Instrument Serif',serif", fontSize: 34, lineHeight: 1, letterSpacing: "-0.03em", color: "#1A1714", marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(26,23,20,0.42)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 1: Missed this week */}
          {sections.missed.length > 0 && (
            <section style={{ paddingTop: 52, animation: "fadeUp 0.5s ease 0.05s both" }}>
              <SectionHeader num="01 / 05" title={<>Missed <em style={{ fontStyle: "italic" }}>this week</em></>} count={`${sections.missed.length} post${sections.missed.length !== 1 ? "s" : ""}`} />
              <div className="card-grid" style={{ marginBottom: 52 }}>
                {sections.missed.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
              </div>
            </section>
          )}

          {/* Section 2: Top creator */}
          {sections.topCreator && (
            <section style={{ paddingTop: sections.missed.length > 0 ? 0 : 52, animation: "fadeUp 0.5s ease 0.15s both" }}>
              <SectionHeader
                num="02 / 05"
                title={<>Your <em style={{ fontStyle: "italic" }}>top creator</em> posted</>}
                count={sections.topCreatorPub
                  ? `${sections.topCreatorPub.newsletterName}${sections.topCreatorPub.subscriberCount ? ` · ${(sections.topCreatorPub.subscriberCount / 1000).toFixed(0)}K subscribers` : ""}`
                  : undefined}
              />
              <div className="card-grid-single" style={{ marginBottom: 52 }}>
                <FeaturedCard post={sections.topCreator} />
              </div>
            </section>
          )}

          {/* Section 3: Because you like */}
          {sections.categoryPosts.length > 0 && (
            <section style={{ animation: "fadeUp 0.5s ease 0.25s both" }}>
              <SectionHeader
                num="03 / 05"
                title={<>Because you like <em style={{ fontStyle: "italic", color: "#2D5016" }}>{sections.category}</em></>}
                count={`${sections.categoryPosts.length} post${sections.categoryPosts.length !== 1 ? "s" : ""}`}
              />
              <div className="card-grid" style={{ marginBottom: 52 }}>
                {sections.categoryPosts.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
              </div>
            </section>
          )}

          {/* Section 4: Trending */}
          {sections.trending.length > 0 && (
            <section style={{ animation: "fadeUp 0.5s ease 0.35s both" }}>
              <SectionHeader num="04 / 05" title={<>Trending <em style={{ fontStyle: "italic" }}>this week</em></>} count={`${sections.trending.length} post${sections.trending.length !== 1 ? "s" : ""}`} />
              <div className="card-grid" style={{ marginBottom: 52 }}>
                {sections.trending.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
              </div>
            </section>
          )}

          {/* Section 5: Discovery */}
          {sections.discovery.length > 0 && (
            <section style={{ animation: "fadeUp 0.5s ease 0.45s both" }}>
              <SectionHeader num="05 / 05" title={<>You might <em style={{ fontStyle: "italic" }}>also like</em></>} count="Discovery" />
              <div className="card-grid card-grid-three" style={{ marginBottom: 64 }}>
                {sections.discovery.map((s, i) => <DiscoveryCard key={s.publicationUrl} sub={s} index={i} />)}
              </div>
            </section>
          )}

          {/* Empty state */}
          {posts.length === 0 && (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: "rgba(26,23,20,0.45)", letterSpacing: "-0.01em" }}>No posts found yet.</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(26,23,20,0.38)", marginTop: 10 }}>
                We couldn&apos;t reach your subscriptions right now. Check back later.
              </p>
            </div>
          )}

          {/* Footer */}
          <footer style={{ borderTop: "1.5px solid #1A1714", padding: "28px 0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" as const }}>
            <div style={{ fontFamily: "var(--font-serif),'Instrument Serif',serif", fontSize: 15, color: "#1A1714" }}>
              Inbox<span style={{ color: "#C9981A" }}>Digest</span>
            </div>
            <div style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 12, color: "rgba(26,23,20,0.40)" }}>
              Generated for @{username} · {today()}
            </div>
            <a href="/" style={{ fontFamily: "var(--font-sans),'DM Sans',sans-serif", fontSize: 12, fontWeight: 400, color: "rgba(26,23,20,0.42)", textDecoration: "none" }}>
              Adjust preferences
            </a>
          </footer>

        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: rgba(26,23,20,0.08);
          border: 1px solid rgba(26,23,20,0.08);
          border-radius: 4px;
          overflow: hidden;
        }
        .card-grid-single {
          border: 1px solid rgba(26,23,20,0.08);
          border-radius: 4px;
          overflow: hidden;
        }
        .card-grid-three {
          grid-template-columns: repeat(3, 1fr);
        }
        .post-card { animation: fadeUp 0.5s ease both; }
        .read-link:hover { text-decoration: underline; }
        .follow-btn:hover { background: #2D5016 !important; color: #fff !important; }
        @media (max-width: 740px) {
          .card-grid { grid-template-columns: 1fr !important; }
          .card-grid-three { grid-template-columns: 1fr !important; }
          header { flex-direction: column !important; gap: 4px !important; padding: 16px 20px !important; }
        }
        @media (max-width: 560px) {
          div[style*="maxWidth: 1100"] { padding: 0 16px !important; }
        }
      `}</style>
    </div>
  );
}
