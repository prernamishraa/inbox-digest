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
  | { kind: "done" }
  | { kind: "email" };

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
    case "email":
      return "";
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
  const updateUserEmail = useMutation(api.users.updateUserEmail);

  const [phase, setPhase] = useState<Phase>({ kind: "fetching" });
  const [visible, setVisible] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [deliveryTime, setDeliveryTime] = useState<"7am" | "12pm" | "6pm" | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

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

      // 4. Show done → then prompt for email delivery
      await delay(400);
      transition({ kind: "done" });
      await delay(900);
      transition({ kind: "email" });
    }

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const text = phaseText(phase);
  const sub = phaseSubtext(phase);
  const isDone = phase.kind === "done";
  const isEmail = phase.kind === "email";

  async function handleEmailSubmit() {
    if (!emailInput || !deliveryTime) return;
    setEmailSaving(true);
    try {
      await updateUserEmail({ substackUsername: username, gmailAddress: emailInput, deliveryTime });
    } catch { /* non-fatal */ }
    router.push(`/digest/${username}`);
  }

  function handleSkip() {
    router.push(`/digest/${username}`);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F0E8",
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
          opacity: 0.025,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Amber accent bar */}
      <div style={{ height: 3, background: "#FFD264", position: "relative", zIndex: 2 }} />

      {/* Nav */}
      <nav
        style={{
          position: "relative",
          zIndex: 1,
          borderBottom: "1px solid rgba(26,23,20,0.10)",
          padding: "22px 40px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-serif), 'Instrument Serif', serif",
            fontSize: 17,
            color: "#1A1714",
            letterSpacing: "-0.01em",
          }}
        >
          Inbox<span style={{ color: "#C9981A" }}>Digest</span>
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
        {isEmail ? (
          /* ── Email capture ──────────────────────────────────────────── */
          <div style={{ width: "100%", maxWidth: 440, animation: "fadeUp 0.5s ease both" }}>
            <p style={{ fontFamily: "var(--font-serif), 'Instrument Serif', serif", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", color: "#1A1714", marginBottom: 8, textAlign: "center" }}>
              Get this digest in your inbox.
            </p>
            <p style={{ fontFamily: "var(--font-sans), 'DM Sans', sans-serif", fontSize: 14, color: "rgba(26,23,20,0.48)", marginBottom: 32, textAlign: "center", lineHeight: 1.5 }}>
              We&apos;ll send your personalised digest daily at your chosen time.
            </p>

            {/* Gmail input */}
            <input
              type="email"
              placeholder="you@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box" as const,
                padding: "14px 16px",
                fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                fontSize: 14,
                color: "#1A1714",
                background: "#FFFFFF",
                border: "1.5px solid rgba(26,23,20,0.18)",
                borderRadius: 4,
                outline: "none",
                marginBottom: 16,
              }}
            />

            {/* Time picker */}
            <p style={{ fontFamily: "var(--font-sans), 'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "rgba(26,23,20,0.40)", marginBottom: 10 }}>Delivery time (IST)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
              {([
                { key: "7am" as const, label: "Morning", sub: "7:00 AM" },
                { key: "12pm" as const, label: "Afternoon", sub: "12:00 PM" },
                { key: "6pm" as const, label: "Evening", sub: "6:00 PM" },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setDeliveryTime(opt.key)}
                  style={{
                    padding: "12px 10px",
                    border: deliveryTime === opt.key ? "1.5px solid #2D5016" : "1.5px solid rgba(26,23,20,0.14)",
                    borderRadius: 4,
                    background: deliveryTime === opt.key ? "rgba(45,80,22,0.06)" : "#FFFFFF",
                    cursor: "pointer",
                    textAlign: "center" as const,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-sans), 'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: deliveryTime === opt.key ? "#2D5016" : "#1A1714", marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontFamily: "var(--font-sans), 'DM Sans', sans-serif", fontSize: 11, color: "rgba(26,23,20,0.45)" }}>{opt.sub}</div>
                </button>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleEmailSubmit}
              disabled={!emailInput || !deliveryTime || emailSaving}
              style={{
                width: "100%",
                padding: "15px 20px",
                background: (!emailInput || !deliveryTime) ? "rgba(45,80,22,0.30)" : "#2D5016",
                border: "none",
                borderRadius: 4,
                fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "#FFFFFF",
                cursor: (!emailInput || !deliveryTime || emailSaving) ? "not-allowed" : "pointer",
                marginBottom: 16,
                transition: "background 0.2s ease",
              }}
            >
              {emailSaving ? "Saving…" : "Send my daily digest"}
            </button>

            {/* Skip */}
            <div style={{ textAlign: "center" as const }}>
              <button
                onClick={handleSkip}
                style={{ background: "none", border: "none", fontFamily: "var(--font-sans), 'DM Sans', sans-serif", fontSize: 13, color: "rgba(26,23,20,0.42)", cursor: "pointer", textDecoration: "underline" }}
              >
                Skip for now — just show me the digest
              </button>
            </div>
          </div>
        ) : (
          <>
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
                  color: "#1A1714",
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
                    color: "#2D5016",
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
                    background: "rgba(45,80,22,0.08)",
                    border: "1.5px solid rgba(45,80,22,0.32)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "scaleIn 0.3s ease both",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3 8L6.5 11.5L13 5"
                      stroke="#2D5016"
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
                    border: "2px solid rgba(45,80,22,0.12)",
                    borderTopColor: "rgba(45,80,22,0.60)",
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
                  color: "rgba(26,23,20,0.42)",
                  letterSpacing: "0.02em",
                  animation: "fadeUp 0.5s ease both",
                }}
              >
                Building your personalised digest…
              </p>
            )}
          </>
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
