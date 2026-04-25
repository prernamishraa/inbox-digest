"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

const SKELETON_WIDTHS = [76, 92, 64, 84, 68, 100, 72, 58, 90, 70, 82, 60, 78, 88, 66, 96];

function parseSubstackUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  if (/^@[\w-]+$/.test(s)) return s.slice(1);

  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);

    if (url.hostname === "substack.com" || url.hostname === "www.substack.com") {
      const m = url.pathname.match(/^\/@([\w-]+)/);
      return m ? m[1] : null;
    }

    if (url.hostname.endsWith(".substack.com")) {
      const sub = url.hostname.replace(/\.substack\.com$/, "");
      return sub && sub !== "www" ? sub : null;
    }
  } catch {
    const m = s.match(/@([\w-]+)/);
    return m ? m[1] : null;
  }

  return null;
}

type CatState = "loading" | "done" | "error";

export default function Home() {
  const router = useRouter();

  const [profileUrl, setProfileUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [catState, setCatState] = useState<CatState>("loading");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [about, setAbout] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: { categories?: string[] }) => {
        setCategories(d.categories ?? []);
        setCatState("done");
      })
      .catch(() => setCatState("error"));
  }, []);

  const toggleCat = useCallback((cat: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
      return next;
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const username = parseSubstackUrl(profileUrl);
    if (!username) {
      setUrlError("Enter a valid Substack URL — e.g. substack.com/@yourname");
      return;
    }
    setUrlError("");
    setSubmitting(true);
    const p = new URLSearchParams({ username });
    if (selected.size) p.set("categories", [...selected].join(","));
    if (about.trim()) p.set("about", about.trim());
    router.push(`/loading?${p.toString()}`);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F0E8",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Noise overlay */}
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

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "calc(100vh - 3px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Nav */}
        <nav
          style={{
            borderBottom: "1px solid rgba(26,23,20,0.10)",
            padding: "22px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
          <span
            style={{
              fontSize: 12,
              fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
              fontWeight: 400,
              letterSpacing: "0.02em",
              color: "rgba(26,23,20,0.45)",
            }}
          >
            7-day free trial · ₹299/mo after
          </span>
        </nav>

        {/* Main */}
        <main
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            padding: "48px 24px 80px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 660 }}>

            {/* Eyebrow */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 26,
                animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s both",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 22,
                  height: 1,
                  background: "#2D5016",
                  opacity: 0.55,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.11em",
                  textTransform: "uppercase" as const,
                  color: "#2D5016",
                }}
              >
                For Substack readers
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontFamily: "var(--font-serif), 'Instrument Serif', serif",
                fontSize: "clamp(50px, 8vw, 80px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "#1A1714",
                marginBottom: 18,
                animation: "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.14s both",
              }}
            >
              Stop missing<br />
              the{" "}
              <em style={{ fontStyle: "italic", color: "#2D5016" }}>best</em>
              {" "}of<br />
              Substack
            </h1>

            {/* Subline */}
            <p
              style={{
                fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                fontSize: "clamp(15px, 2vw, 17px)",
                fontWeight: 400,
                lineHeight: 1.72,
                color: "rgba(26,23,20,0.50)",
                maxWidth: 480,
                marginBottom: 40,
                animation: "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s both",
              }}
            >
              You follow great writers. We surface what&apos;s worth your time,
              one curated digest, every morning, in your inbox.
            </p>

            {/* Form card */}
            <form
              onSubmit={handleSubmit}
              style={{
                width: "100%",
                background: "#FFFFFF",
                border: "1px solid rgba(26,23,20,0.10)",
                borderRadius: 16,
                padding: "32px 32px 28px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
                animation: "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.36s both",
              }}
            >
              {/* URL input */}
              <label
                htmlFor="profile-url"
                style={{
                  display: "block",
                  fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  color: "rgba(26,23,20,0.45)",
                  marginBottom: 9,
                }}
              >
                Your Substack profile URL
              </label>
              <input
                id="profile-url"
                type="text"
                value={profileUrl}
                onChange={(e) => {
                  setProfileUrl(e.target.value);
                  if (urlError) setUrlError("");
                }}
                placeholder="substack.com/@yourname"
                className="text-field"
                style={{
                  width: "100%",
                  background: "#F5F0E8",
                  border: `1px solid ${urlError ? "rgba(200,60,40,0.45)" : "rgba(26,23,20,0.13)"}`,
                  borderRadius: 8,
                  padding: "12px 15px",
                  fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                  fontSize: 14,
                  color: "#1A1714",
                  outline: "none",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              />
              {urlError && (
                <p
                  style={{
                    marginTop: 8,
                    fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "rgba(200,60,40,0.85)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {urlError}
                </p>
              )}

              {/* Categories label */}
              <div
                style={{
                  fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  color: "rgba(26,23,20,0.45)",
                  margin: "26px 0 11px",
                }}
              >
                What do you read? Pick a few
              </div>

              {/* Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {catState === "loading"
                  ? SKELETON_WIDTHS.map((w, i) => (
                      <div
                        key={i}
                        style={{
                          width: w,
                          height: 32,
                          borderRadius: 100,
                          background:
                            "linear-gradient(90deg, rgba(26,23,20,0.05) 0%, rgba(26,23,20,0.09) 50%, rgba(26,23,20,0.05) 100%)",
                          backgroundSize: "400px 100%",
                          animation: `shimmer 1.5s ease-in-out infinite`,
                          animationDelay: `${i * 0.05}s`,
                        }}
                      />
                    ))
                  : categories.map((cat) => {
                      const on = selected.has(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCat(cat)}
                          className={`pill${on ? " pill-on" : ""}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "6px 13px",
                            borderRadius: 100,
                            border: `1px solid ${on ? "#2D5016" : "rgba(26,23,20,0.12)"}`,
                            background: on
                              ? "rgba(45,80,22,0.08)"
                              : "transparent",
                            color: on ? "#2D5016" : "rgba(26,23,20,0.52)",
                            fontSize: 12.5,
                            fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                            fontWeight: on ? 500 : 400,
                            lineHeight: 1,
                            cursor: "pointer",
                            transition:
                              "border-color 0.15s, background 0.15s, color 0.15s",
                            animation: "fadeIn 0.25s ease both",
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
              </div>

              {/* Optional about */}
              <div style={{ marginTop: 26 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 9,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      color: "rgba(26,23,20,0.45)",
                    }}
                  >
                    Anything specific you love?
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                      fontWeight: 400,
                      letterSpacing: "0.04em",
                      color: "rgba(26,23,20,0.40)",
                      background: "#F5F0E8",
                      border: "1px solid rgba(26,23,20,0.10)",
                      borderRadius: 3,
                      padding: "2px 7px",
                    }}
                  >
                    optional
                  </span>
                </div>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="e.g. long-form essays, contrarian takes, founder stories…"
                  rows={2}
                  className="text-field"
                  style={{
                    width: "100%",
                    resize: "none",
                    background: "#F5F0E8",
                    border: "1px solid rgba(26,23,20,0.13)",
                    borderRadius: 8,
                    padding: "12px 15px",
                    fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                    fontSize: 13.5,
                    color: "#1A1714",
                    outline: "none",
                    lineHeight: 1.6,
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                />
              </div>

              {/* CTA */}
              <div style={{ marginTop: 24 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cta-btn"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: "#2D5016",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 9,
                    padding: "15px 24px",
                    fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    cursor: submitting ? "default" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    transition:
                      "opacity 0.15s, transform 0.12s, box-shadow 0.15s",
                  }}
                >
                  {submitting ? "Setting up your digest…" : "Build my digest"}
                  {!submitting && (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M2.5 7.5H12.5M8.5 3.5L12.5 7.5L8.5 11.5"
                        stroke="#FFFFFF"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <p
                  style={{
                    marginTop: 11,
                    textAlign: "center",
                    fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "rgba(26,23,20,0.40)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Free for 7 days · ₹299/month after · No card needed to start
                </p>
              </div>
            </form>

            {/* Social proof */}
            <div
              style={{
                marginTop: 32,
                display: "flex",
                alignItems: "center",
                gap: 13,
                animation: "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.52s both",
              }}
            >
              <div style={{ display: "flex" }}>
                {(
                  [
                    { bg: "#7C6EAF", l: "A" },
                    { bg: "#3A8C6E", l: "R" },
                    { bg: "#4A82B8", l: "K" },
                    { bg: "#C2703A", l: "S" },
                  ] as const
                ).map((av, i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: av.bg,
                      border: "2px solid #F5F0E8",
                      marginLeft: i === 0 ? 0 : -8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#fff",
                      fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {av.l}
                  </div>
                ))}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-sans), 'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 400,
                  color: "rgba(26,23,20,0.45)",
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: "rgba(26,23,20,0.70)", fontWeight: 500 }}>
                  240+ readers
                </span>{" "}
                getting their daily digest
              </span>
            </div>

          </div>
        </main>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }

        .text-field::placeholder { color: rgba(26,23,20,0.35); }
        .text-field:focus {
          border-color: rgba(45,80,22,0.30) !important;
          background: #FAFAF7 !important;
        }

        .pill:hover:not(.pill-on) {
          border-color: rgba(45,80,22,0.28) !important;
          background:   rgba(45,80,22,0.06) !important;
          color:        #2D5016 !important;
        }

        .cta-btn:hover:not(:disabled) {
          opacity: 0.88 !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(45,80,22,0.22);
        }
        .cta-btn:active:not(:disabled) {
          transform: translateY(0);
          opacity: 1 !important;
          box-shadow: none;
        }

        @media (max-width: 560px) {
          nav  { padding: 18px 20px !important; }
          main { padding: 32px 16px 64px !important; }
          form { padding: 24px 20px 22px !important; border-radius: 12px !important; }
          nav span:last-child { display: none; }
          h1 { font-size: 46px !important; }
        }
      `}</style>
    </div>
  );
}
