import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ verified: false, error: "Razorpay is not configured." }, { status: 503 });
  }

  const body = (await request.json()) as {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    expectedAmountCents?: number;
  };
  if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
    return NextResponse.json({ verified: false, error: "Incomplete Razorpay payment response." }, { status: 400 });
  }

  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
    .digest("hex");
  if (expectedSignature !== body.razorpaySignature) {
    return NextResponse.json({ verified: false, error: "Razorpay signature verification failed." }, { status: 400 });
  }

  const paymentResponse = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(body.razorpayPaymentId)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
    },
  );
  if (!paymentResponse.ok) {
    return NextResponse.json({ verified: false, error: "Razorpay payment could not be confirmed." }, { status: 502 });
  }

  const payment = (await paymentResponse.json()) as {
    order_id: string;
    amount: number;
    currency: string;
    status: string;
  };
  if (
    payment.order_id !== body.razorpayOrderId ||
    payment.currency !== "INR" ||
    (body.expectedAmountCents && payment.amount !== Math.round(body.expectedAmountCents)) ||
    !["captured", "authorized"].includes(payment.status)
  ) {
    return NextResponse.json({ verified: false, error: "Razorpay payment details did not match the order." }, { status: 400 });
  }

  return NextResponse.json({ verified: true });
}
