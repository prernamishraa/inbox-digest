import { NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not set" }, { status: 500 });
  }

  // Verify webhook signature
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      subscription?: { entity?: { id?: string; notes?: { substackUsername?: string } } };
      payment?: { entity?: { notes?: { substackUsername?: string } } };
    };
  } = {};
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const relevantEvents = ["subscription.charged", "subscription.activated", "payment.captured"];
  if (!relevantEvents.includes(event.event ?? "")) {
    return NextResponse.json({ ok: true }); // ignore other events
  }

  const substackUsername =
    event.payload?.subscription?.entity?.notes?.substackUsername ??
    event.payload?.payment?.entity?.notes?.substackUsername;
  const subscriptionId = event.payload?.subscription?.entity?.id ?? "";

  if (substackUsername) {
    try {
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      await convex.mutation(api.users.markUserPaid, {
        substackUsername,
        razorpaySubscriptionId: subscriptionId,
      });
    } catch (err) {
      console.error("[webhook] Convex update failed:", err);
      // Return 200 anyway so Razorpay doesn't keep retrying for a Convex blip
    }
  }

  return NextResponse.json({ ok: true });
}
