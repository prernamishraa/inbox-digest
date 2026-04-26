"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

interface Props {
  username: string;
}

export function TrialGate({ username }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scriptLoaded = useRef(false);

  // Load Razorpay checkout.js once
  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  async function handleSubscribe() {
    setLoading(true);
    setError("");
    try {
      // 1. Create subscription server-side
      const res = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ substackUsername: username }),
      });
      const data = await res.json() as { subscriptionId?: string; keyId?: string; error?: string };

      if (!res.ok || !data.subscriptionId) {
        setError(data.error ?? "Could not start checkout. Try again.");
        setLoading(false);
        return;
      }

      // 2. Open Razorpay modal
      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "InboxDigest",
        description: "Monthly digest — ₹299/mo",
        theme: { color: "#2D5016" },
        modal: { ondismiss: () => setLoading(false) },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          // 3. Verify payment + mark paid in Convex
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, substackUsername: username }),
          });
          if (verifyRes.ok) {
            // Convex subscription will reactively update — gate disappears automatically
            // Hard reload as fallback in case subscription update is delayed
            setTimeout(() => window.location.reload(), 1200);
          } else {
            setError("Payment received but activation failed. Please contact support.");
            setLoading(false);
          }
        },
      });
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(245,240,232,0.80)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      {/* Card */}
      <div style={{
        background: "#FFFFFF",
        border: "1px solid rgba(26,23,20,0.10)",
        borderRadius: 6,
        width: "100%", maxWidth: 460,
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(26,23,20,0.04), 0 16px 48px rgba(26,23,20,0.12)",
        animation: "gateRise 0.5s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        {/* Amber top bar */}
        <div style={{ height: 3, background: "#FFD264" }} />

        <div style={{ padding: "38px 40px 34px" }}>
          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: "var(--font-sans),'DM Sans',sans-serif",
            fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
            textTransform: "uppercase" as const, color: "#2D5016", marginBottom: 16,
          }}>
            <span style={{ display: "block", width: 20, height: 1.5, background: "#2D5016", opacity: 0.5 }} />
            Free trial ended
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "var(--font-serif),'Instrument Serif',serif",
            fontSize: 34, fontWeight: 400, lineHeight: 1.1,
            letterSpacing: "-0.02em", color: "#1A1714", marginBottom: 12,
          }}>
            Your free trial<br />has ended.
          </h1>

          {/* Subtext */}
          <p style={{
            fontFamily: "var(--font-sans),'DM Sans',sans-serif",
            fontSize: 14, lineHeight: 1.65, color: "rgba(26,23,20,0.55)", marginBottom: 30,
          }}>
            You&apos;ve had 7 days of your personal Substack digest.
            Subscribe to keep it coming — daily, curated, in your inbox.
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(26,23,20,0.08)", marginBottom: 26 }} />

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{
              fontFamily: "var(--font-sans),'DM Sans',sans-serif",
              fontSize: 22, fontWeight: 400, color: "#1A1714", marginTop: 4,
            }}>₹</span>
            <span style={{
              fontFamily: "var(--font-serif),'Instrument Serif',serif",
              fontSize: 56, lineHeight: 1, letterSpacing: "-0.03em", color: "#1A1714",
            }}>299</span>
            <span style={{
              fontFamily: "var(--font-sans),'DM Sans',sans-serif",
              fontSize: 14, color: "rgba(26,23,20,0.45)", marginBottom: 2,
            }}>/ month</span>
          </div>
          <p style={{
            fontFamily: "var(--font-sans),'DM Sans',sans-serif",
            fontSize: 12, color: "rgba(26,23,20,0.40)", marginBottom: 26,
          }}>
            Billed monthly · cancel anytime
          </p>

          {/* Includes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 30 }}>
            {[
              "Daily digest from all your Substack subscriptions",
              "AI summaries, insights and reasons to read each post",
              "Delivered to your inbox at your chosen time",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2D5016", flexShrink: 0 }} />
                <span style={{
                  fontFamily: "var(--font-sans),'DM Sans',sans-serif",
                  fontSize: 13, color: "rgba(26,23,20,0.68)",
                }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontFamily: "var(--font-sans),'DM Sans',sans-serif",
              fontSize: 12, color: "#c0392b", marginBottom: 14,
            }}>{error}</p>
          )}

          {/* CTA */}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="gate-btn"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "16px 20px",
              background: loading ? "rgba(45,80,22,0.50)" : "#2D5016",
              border: "none", borderRadius: 4,
              fontFamily: "var(--font-sans),'DM Sans',sans-serif",
              fontSize: 15, fontWeight: 600, letterSpacing: "0.03em", color: "#FFFFFF",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: 14,
              transition: "background 0.18s ease, transform 0.12s ease",
            }}
          >
            {loading ? "Opening checkout…" : <>Subscribe now <span style={{ fontSize: 16 }}>→</span></>}
          </button>

          <p style={{
            textAlign: "center" as const,
            fontFamily: "var(--font-sans),'DM Sans',sans-serif",
            fontSize: 12, color: "rgba(26,23,20,0.38)",
          }}>
            No questions asked · Cancel anytime
          </p>
        </div>
      </div>

      <style>{`
        @keyframes gateRise {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .gate-btn:hover:not(:disabled) {
          background: #3a6620 !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
