import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { amountCents?: number; receipt?: string };
  if (!body.amountCents || body.amountCents <= 0 || !body.receipt) {
    return NextResponse.json({ error: "A valid INR amount and receipt are required." }, { status: 400 });
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(body.amountCents),
      currency: "INR",
      receipt: body.receipt,
      payment_capture: 1,
    }),
  });

  if (!response.ok) {
    console.error("Razorpay order creation failed:", await response.text());
    return NextResponse.json({ error: "Razorpay could not create the payment order." }, { status: 502 });
  }

  const order = (await response.json()) as { id: string; amount: number; currency: string };
  return NextResponse.json({ keyId, orderId: order.id, amount: order.amount, currency: order.currency });
}
