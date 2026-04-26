import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  let substackUsername = "";
  try {
    const body = await req.json() as { substackUsername?: string };
    substackUsername = body.substackUsername ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_PLAN_ID;

  if (!keyId || !keySecret || !planId) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  try {
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const subscription = await client.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      notes: { substackUsername },
    });

    return NextResponse.json({ subscriptionId: subscription.id, keyId });
  } catch (err) {
    console.error("[create-subscription]", err);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
