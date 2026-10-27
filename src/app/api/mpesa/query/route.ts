import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SANDBOX_SHORTCODE = "174379";
const SANDBOX_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

// Safaricom does not retry a missed callback, so this asks Daraja directly (STK Push Query) whether a pending payment went through.
export async function POST(req: NextRequest) {
  const sandbox = process.env.MPESA_ENV !== "production";
  const base = sandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";
  const key = process.env.MPESA_CONSUMER_KEY, secret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE ?? (sandbox ? SANDBOX_SHORTCODE : "");
  const passkey = process.env.MPESA_PASSKEY ?? (sandbox ? SANDBOX_PASSKEY : "");
  const cbSecret = process.env.MPESA_CALLBACK_SECRET;
  if (!key || !secret || !shortcode || !passkey || !cbSecret) return NextResponse.json({ status: "unconfigured" }, { status: 503 });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const body = (await req.json().catch(() => null)) as { consultation_id?: string } | null;
  if (!token || !body?.consultation_id || !UUID.test(body.consultation_id)) return NextResponse.json({ status: "error" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const user = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: pay } = await user.from("payments").select("id, amount_kes, checkout_request_id, status")
    .eq("consultation_id", body.consultation_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!pay) return NextResponse.json({ status: "none" });
  if (pay.status !== "pending" || !pay.checkout_request_id) return NextResponse.json({ status: pay.status });

  try {
    const auth = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64") }, cache: "no-store" });
    if (!auth.ok) return NextResponse.json({ status: "pending" });
    const { access_token } = (await auth.json()) as { access_token: string };
    const timestamp = new Date(Date.now() + 3 * 3600 * 1000).toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const q = await fetch(`${base}/mpesa/stkpushquery/v1/query`, {
      method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ BusinessShortCode: shortcode, Password: Buffer.from(shortcode + passkey + timestamp).toString("base64"), Timestamp: timestamp, CheckoutRequestID: pay.checkout_request_id }),
    });
    const out = (await q.json()) as { ResultCode?: string | number; ResultDesc?: string };
    if (out.ResultCode === undefined) return NextResponse.json({ status: "pending" }); // Daraja says "being processed"
    // Same secret-guarded database function the callback uses. The query reply has no receipt, so it stays empty.
    const sys = createClient(url, anon, { auth: { persistSession: false } });
    await sys.rpc("record_mpesa_callback", { p_secret: cbSecret, p_checkout: pay.checkout_request_id, p_code: Number(out.ResultCode), p_desc: String(out.ResultDesc ?? ""), p_receipt: null, p_amount: Number(out.ResultCode) === 0 ? pay.amount_kes : null });
    return NextResponse.json({ status: Number(out.ResultCode) === 0 ? "paid" : "failed", desc: out.ResultDesc });
  } catch {
    return NextResponse.json({ status: "pending" });
  }
}
