import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lets the admin page warn when payments are switched on but the M-Pesa keys are missing. Returns a yes/no only.
export async function GET() {
  const sandbox = process.env.MPESA_ENV !== "production";
  const configured = Boolean(
    process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_CALLBACK_SECRET &&
    (sandbox || (process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY))
  );
  return NextResponse.json({ configured });
}
