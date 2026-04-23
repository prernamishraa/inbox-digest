"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CountingNumber } from "@/components/CountingNumber";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

type SubmitState = "idle" | "loading" | "success" | "duplicate" | "error";

export default function Home() {
  const stats = useQuery(api.waitlist.getStats);
  const joinWaitlist = useMutation(api.waitlist.join);

  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  // Tick the displayed stats slightly every few seconds for a live feel
  const [tickedStats, setTickedStats] = useState({
    waitlistCount: 0,
    minSavedPerDay: 180,
    newslettersHandled: 1240,
  });

  // Sync real Convex data into tickedStats
  useEffect(() => {
    if (!stats) return;
    setTickedStats({
      waitlistCount: stats.waitlistCount,
      minSavedPerDay: stats.minSavedPerDay,
      newslettersHandled: stats.newslettersHandled,
    });
  }, [stats]);

  // Gentle ticker: nudge min/newsletters by small random amounts every 4-7s
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const schedule = () => {
      const delay = 4000 + Math.random() * 3000;
      tickTimer.current = setTimeout(() => {
        setTickedStats((prev) => ({
          ...prev,
          minSavedPerDay: prev.minSavedPerDay + Math.floor(Math.random() * 3 + 1),
          newslettersHandled: prev.newslettersHandled + Math.floor(Math.random() * 2 + 1),
        }));
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (tickTimer.current) clearTimeout(tickTimer.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitState === "loading" || submitState === "success") return;
    setSubmitState("loading");
    try {
      const result = await joinWaitlist({ email: email.trim().toLowerCase() });
      setSubmitState(result.alreadyJoined ? "duplicate" : "success");
    } catch {
      setSubmitState("error");
    }
  };

  const buttonLabel =
    submitState === "loading"
      ? "Joining..."
      : submitState === "success"
      ? "You are in"
      : submitState === "duplicate"
      ? "Already joined"
      : "Join the waitlist";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0C0C0B",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Noise layer */}
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

      {/* Amber glow top-right */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: -160,
          right: -160,
          width: 720,
          height: 720,
          background:
            "radial-gradient(circle at center, rgba(255,210,80,0.14) 0%, rgba(255,185,60,0.06) 42%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Faint amber glow bottom-left for depth */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: -200,
          left: -100,
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle at center, rgba(255,210,80,0.04) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Page wrapper */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Nav */}
        <nav
          style={{
            padding: "28px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
            Inbox<span style={{ color: "#FFD264" }}>.</span>
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#FFD264",
              opacity: 0.8,
            }}
          >
            Early Access
          </span>
        </nav>

        {/* Hero */}
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "60px 40px 40px",
            maxWidth: 780,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <div style={{ width: "100%" }}>
            {/* Eyebrow */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 36,
                animation: "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.05s both",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 22,
                  height: 1,
                  background: "#FFD264",
                  opacity: 0.6,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#FFD264",
                }}
              >
                For curious readers
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontFamily: "var(--font-serif), 'Instrument Serif', serif",
                fontSize: "clamp(52px, 7.5vw, 88px)",
                fontWeight: 400,
                lineHeight: 1.03,
                letterSpacing: "-0.02em",
                color: "#F0EDE6",
                marginBottom: 32,
                animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.18s both",
              }}
            >
              Stop reading.<br />
              <em style={{ color: "#FFD264", fontStyle: "italic" }}>
                Start knowing.
              </em>
            </h1>

            {/* Subheading */}
            <p
              style={{
                fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                fontSize: "clamp(16px, 2vw, 19px)",
                fontWeight: 300,
                lineHeight: 1.68,
                color: "rgba(240,237,230,0.55)",
                maxWidth: 580,
                marginBottom: 52,
                animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s both",
              }}
            >
              Inbox Digest sits in your Gmail, reads every newsletter you are
              subscribed to, and sends you one clean digest every morning. You
              get the signal. The AI takes the noise.
            </p>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                gap: 10,
                maxWidth: 520,
                flexWrap: "wrap",
                animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.44s both",
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (submitState !== "idle" && submitState !== "loading") {
                    setSubmitState("idle");
                  }
                }}
                placeholder="your@email.com"
                disabled={submitState === "success"}
                style={{
                  flex: "1 1 220px",
                  minWidth: 0,
                  background: "rgba(240,237,230,0.04)",
                  border: "1px solid rgba(240,237,230,0.12)",
                  borderRadius: 6,
                  padding: "14px 18px",
                  fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                  fontSize: 15,
                  fontWeight: 400,
                  color: "#F0EDE6",
                  outline: "none",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(255,210,100,0.4)";
                  e.target.style.background = "rgba(240,237,230,0.06)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(240,237,230,0.12)";
                  e.target.style.background = "rgba(240,237,230,0.04)";
                }}
              />
              <button
                type="submit"
                disabled={submitState === "loading" || submitState === "success" || submitState === "duplicate"}
                style={{
                  flexShrink: 0,
                  background:
                    submitState === "success"
                      ? "rgba(255,210,100,0.15)"
                      : "#FFD264",
                  color:
                    submitState === "success"
                      ? "#FFD264"
                      : "#0C0C0B",
                  border:
                    submitState === "success"
                      ? "1px solid rgba(255,210,100,0.3)"
                      : "none",
                  borderRadius: 6,
                  padding: "14px 26px",
                  fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  cursor:
                    submitState === "loading" || submitState === "success" || submitState === "duplicate"
                      ? "default"
                      : "pointer",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s, transform 0.15s",
                  opacity: submitState === "loading" ? 0.7 : 1,
                }}
              >
                {buttonLabel}
              </button>
            </form>

            {/* Status messages */}
            <div
              style={{
                marginTop: 14,
                fontSize: 12,
                fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                color:
                  submitState === "error"
                    ? "rgba(255,120,100,0.7)"
                    : submitState === "success"
                    ? "rgba(255,210,100,0.6)"
                    : "rgba(240,237,230,0.28)",
                letterSpacing: "0.02em",
                minHeight: 18,
                animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.56s both",
              }}
            >
              {submitState === "success" && "You are on the list. We will be in touch."}
              {submitState === "duplicate" && "You are already on the list. We will be in touch."}
              {submitState === "error" && "Something went wrong. Please try again."}
              {(submitState === "idle" || submitState === "loading") &&
                "No spam. Unsubscribe any time."}
            </div>
          </div>
        </main>

        {/* Stats bar */}
        <footer
          style={{
            borderTop: "1px solid rgba(240,237,230,0.07)",
            padding: "36px 40px",
            animation: "fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.65s both",
          }}
        >
          <div
            style={{
              maxWidth: 780,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "24px 16px",
            }}
          >
            <StatItem
              value={tickedStats.waitlistCount}
              label="on the waitlist"
              loading={stats === undefined}
            />
            <StatItem
              value={tickedStats.minSavedPerDay}
              suffix="+"
              label="minutes saved daily"
              loading={stats === undefined}
            />
            <StatItem
              value={tickedStats.newslettersHandled}
              suffix="+"
              label="newsletters handled"
              loading={stats === undefined}
            />
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        input::placeholder {
          color: rgba(240,237,230,0.28);
        }

        @media (max-width: 540px) {
          form { flex-direction: column; }
          button[type="submit"] { width: 100%; text-align: center; }
        }

        @media (max-width: 480px) {
          footer > div { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

function StatItem({
  value,
  suffix = "",
  label,
  loading,
}: {
  value: number;
  suffix?: string;
  label: string;
  loading: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-serif), 'Instrument Serif', serif",
          fontSize: "clamp(30px, 4vw, 42px)",
          fontWeight: 400,
          color: "#F0EDE6",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {loading ? (
          <span style={{ opacity: 0.2 }}>...</span>
        ) : (
          <CountingNumber value={value} suffix={suffix} />
        )}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 400,
          color: "rgba(240,237,230,0.38)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}
