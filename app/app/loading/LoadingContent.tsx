"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

const PHASE_DELAY = 2200; // ms between message phases

type Phase =
  | { kind: "fetching" }
  | { kind: "wow"; newsletter: string }
  | { kind: "love" }
  | { kind: "impressive" }
  | { kind: "saving" }
  | { kind: "done" };

function phaseText(phase: Phase): string {
  switch (phase.kind) {
    case "fetching":
      return "Finding your subscriptions…";
    case "wow":
      return `Oh wow — you read ${phase.newsletter}.`;
    case "love":
      return "I love what you are reading.";
    case "impressive":
      return "Most impressive collection.";
    case "saving":
      return "Almost there…";
    case "done":
      return "Your digest is ready.";
  }
}

function phaseSubtext(phase: Phase): string {
  switch (phase.kind) {
    case "wow":
      return "Great taste.";
    default:
      return "";
  }
}

interface Subscription {
  newsletterName: string;
  authorName: string;
  publicationUrl: string;
  subscriberCount?: number;
}

export function LoadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const username = searchParams.get("username") ?? "";
  const categoriesParam = searchParams.get("categories") ?? "";
  const about = searchParams.get("about") ?? "";

  const categories = categoriesParam ? categoriesParam.split(",") : [];

  const upsertUser = useMutation(api.users.upsertUser);
  const saveSubscriptions = useMutation(api.users.saveSubscriptions);

  const [phase, setPhase] = useState<Phase>({ kind: "fetching" });
  const [visible, setVisible] = useState(true);

  const didRun = useRef(false);

  function transition(next: Phase) {
    setVisible(false);
    setTimeout(() => {
      setPhase(next);
      setVisible(true);
    }, 400);
  }

  useEffect(() => {
    if (didRun.current || !username) return;
    didRun.current = true;

    async function run() {
      // 1. Fetch subscriptions — 5 s timeout
      let subs: Subscription[] = [];
      try {
        const ac = new AbortController();
        const tid = setTimeout(() => ac.abort(), 5000);
        const res = await fetch(
          `/api/subscriptions/${encodeURIComponent(username)}`,
          { signal: ac.signal }
        );
        clearTimeout(tid);
        const data = (await res.json()) as { subscriptions?: Subscription[] };
        subs = data.subscriptions ?? [];
      } catch {
        // proceed with empty list
      }

      // 2. Play affirmation messages — wow only when a real newsletter name is available
      await delay(400);
      if (subs.length > 0) {
        transition({ kind: "wow", newsletter: subs[0].newsletterName });
        await delay(PHASE_DELAY);
      }
      transition({ kind: "love" });
      await delay(PHASE_DELAY);
      transition({ kind: "impressive" });
      await delay(PHASE_DELAY);
      transition({ kind: "saving" });

      // 3. Save to Convex — 3 s timeout so offline Convex never stalls the redirect
      await Promise.race([
        (async () => {
          try {
            const userId = await upsertUser({
              substackUsername: username,
              categories,
              about,
            });
            if (subs.length > 0) {
              await saveSubscriptions({ userId, subscriptions: subs });
            }
          } catch {
            // non-fatal
          }
        })(),
        delay(3000),
      ]);

      // 4. Redirect
      await delay(400);
      transition({ kind: "done" });
      await delay(700);
      router.push(`/digest/${username}`);
    }

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const text = phaseText(phase);
  const sub = phaseSubtext(phase);
  const isDone = phase.kind === "done";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0C0C0B",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Noise */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: NOISE_SVG,
          backgroundSize: "180px 180px",
          opacity: 0.03,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Amber glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: -140,
          right: -140,
          width: 680,
          height: 680,
          background:
            "radial-gradient(circle at center, rgba(255,210,80,0.13) 0%, rgba(255,185,60,0.05) 44%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Nav */}
      <nav
        style={{
          position: "relative",
          zIndex: 1,
          padding: "28px 40px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-serif), 'Instrument Serif', serif",
            fontSize: 18,
            color: "#F0EDE6",
            letterSpacing: "-0.01em",
          }}
        >
          Inbox<span style={{ color: "#FFD264" }}>Digest</span>
        </span>
      </nav>

      {/* Main — vertically centred */}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px 80px",
          textAlign: "center",
        }}
      >
        {/* Message block */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
            maxWidth: 600,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif), 'Instrument Serif', serif",
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "#F0EDE6",
              marginBottom: sub ? 12 : 0,
            }}
          >
            {text}
          </p>

          {sub && (
            <p
              style={{
                fontFamily: "var(--font-serif), 'Instrument Serif', serif",
                fontSize: "clamp(28px, 5vw, 48px)",
                fontWeight: 400,
                fontStyle: "italic",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                color: "#FFD264",
              }}
            >
              {sub}
            </p>
          )}
        </div>

        {/* Spinner / done indicator */}
        <div style={{ marginTop: 52 }}>
          {isDone ? (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,210,100,0.15)",
                border: "1.5px solid rgba(255,210,100,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "scaleIn 0.3s ease both",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M3 8L6.5 11.5L13 5"
                  stroke="#FFD264"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "2px solid rgba(255,210,100,0.15)",
                borderTopColor: "rgba(255,210,100,0.65)",
                animation: "spin 0.9s linear infinite",
              }}
            />
          )}
        </div>

        {/* Subscription count hint */}
        {(phase.kind === "love" ||
          phase.kind === "impressive" ||
          phase.kind === "saving") && (
          <p
            style={{
              marginTop: 40,
              fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 400,
              color: "rgba(240,237,230,0.32)",
              letterSpacing: "0.02em",
              animation: "fadeUp 0.5s ease both",
            }}
          >
            Building your personalised digest…
          </p>
        )}
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 560px) {
          nav { padding: 22px 20px !important; }
        }
      `}</style>
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}
