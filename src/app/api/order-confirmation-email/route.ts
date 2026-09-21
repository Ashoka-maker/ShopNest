import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmailRequest = {
  orderId: string;
  customerEmail: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; size?: string; priceCents: number }>;
  totalCents: number;
  shippingAddress: {
    fullName: string;
    mobileNumber: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: "upi" | "cod";
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  } as Record<string, string>)[character] ?? character);

const maskSender = (sender: string) => {
  const match = sender.match(/^(.*<)?([^@<> ]+)@([^<> ]+)(>.*)?$/);
  if (!match) return "[invalid sender format]";
  const localPart = match[2];
  return `${match[1] ?? ""}${localPart.slice(0, 1)}***@${match[3]}${match[4] ?? ""}`;
};

export async function POST(request: Request) {
  const apiKey = process.env["RESEND_API_KEY"]?.trim();
  const fromEmail = process.env["RESEND_FROM_EMAIL"]?.trim();
  const developmentRecipient =
    process.env.NODE_ENV !== "production" ? process.env.RESEND_TEST_RECIPIENT : undefined;

  console.info(
    `[email] Resend configuration apiKeyAvailable=${Boolean(apiKey?.trim())} fromEmail=${fromEmail ? maskSender(fromEmail) : "[missing]"}`,
  );

  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { sent: false, error: "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as EmailRequest;
  if (!body.customerEmail || !body.orderId || !body.items?.length) {
    return NextResponse.json({ sent: false, error: "Invalid order email data." }, { status: 400 });
  }

  const itemRows = body.items
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)}${item.size ? ` (Size: ${escapeHtml(item.size)})` : ""} × ${item.quantity} — ₹${(item.priceCents / 100).toLocaleString("en-IN")}</li>`,
    )
    .join("");
  const address = body.shippingAddress;
  const addressText = `${address.fullName}, ${address.address}, ${address.city}, ${address.state} - ${address.pincode}. Mobile: ${address.mobileNumber}`;
  const paymentText = body.paymentMethod === "cod" ? "Cash on Delivery" : "UPI Payment (pending verification)";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [developmentRecipient || body.customerEmail],
      subject: `ShopNest order confirmation — ${body.orderId}`,
      html: `<h1>Thank you for your ShopNest order</h1><p>Order number: <strong>${escapeHtml(body.orderId)}</strong></p><h2>Products</h2><ul>${itemRows}</ul><p><strong>Total: ₹${(body.totalCents / 100).toLocaleString("en-IN")}</strong></p><p>Payment: ${paymentText}</p><p>Delivery address: ${escapeHtml(addressText)}</p>`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    let providerError = "The email provider rejected the message.";
    let providerName: string | undefined;
    let providerCode: string | number | undefined;
    try {
      const parsed = JSON.parse(details) as { name?: string; message?: string; statusCode?: number };
      if (parsed.message) providerError = parsed.message;
      providerName = parsed.name;
      providerCode = parsed.statusCode;
    } catch {
      providerError = details || providerError;
    }
    console.error(
      `[email] Resend response httpStatus=${response.status} errorCode=${providerCode ?? response.status} errorName=${providerName ?? "[none]"} errorMessage=${providerError}`,
    );
    return NextResponse.json(
      {
        sent: false,
        error: providerError,
      },
      { status: response.status === 403 ? 502 : response.status },
    );
  }

  return NextResponse.json({ sent: true });
}
