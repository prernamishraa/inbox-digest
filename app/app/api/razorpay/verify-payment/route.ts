import { NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(req: Request) {
  let body: {
    razorpay_payment_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature?: string;
    substackUsername?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, substackUsername } = body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !substackUsername) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify signature: HMAC_SHA256(payment_id + "|" + subscription_id, key_secret)
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Mark user as paid in Convex
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.mutation(api.users.markUserPaid, {
      substackUsername,
      razorpaySubscriptionId: razorpay_subscription_id,
    });
  } catch (err) {
    console.error("[verify-payment] Convex update failed:", err);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
