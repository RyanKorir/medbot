import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SANDBOX_SHORTCODE = "174379";
// Public Daraja sandbox passkey (published in Safaricom's docs). Production uses your own via MPESA_PASSKEY.
const SANDBOX_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

function normalisePhone(raw: string): string | null {
  const d = raw.replace(/[\s+\-()]/g, "");
  if (/^0[17]\d{8}$/.test(d)) return "254" + d.slice(1);
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^[17]\d{8}$/.test(d)) return "254" + d;
  return null;
}

export async function POST(req: NextRequest) {
  const sandbox = process.env.MPESA_ENV !== "production";
  const base = sandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE ?? (sandbox ? SANDBOX_SHORTCODE : "");
  const passkey = process.env.MPESA_PASSKEY ?? (sandbox ? SANDBOX_PASSKEY : "");
  const callbackSecret = process.env.MPESA_CALLBACK_SECRET;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!key || !secret || !shortcode || !passkey || !callbackSecret || !site) {
    return NextResponse.json({ error: "M-Pesa payments are not set up yet. Please try again later." }, { status: 503 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { consultation_id?: string; phone?: string } | null;
  const phone = body?.phone ? normalisePhone(body.phone) : null;
  if (!body?.consultation_id || !UUID.test(body.consultation_id) || !phone) return NextResponse.json({ error: "Enter a valid Safaricom number, e.g. 0712345678." }, { status: 400 });

  // Runs as the signed-in patient, so database rules decide whether this payment is allowed and what the amount is.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await sb.rpc("start_payment", { cid: body.consultation_id, p_phone: phone });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return NextResponse.json({ error: error?.message ?? "Could not start the payment." }, { status: 400 });

  const fail = async (msg: string, status = 502) => {
    await sb.rpc("attach_checkout", { pid: row.payment_id, p_checkout: "", p_error: msg });
    return NextResponse.json({ error: msg }, { status });
  };

  try {
    const auth = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64") }, cache: "no-store",
    });
    if (!auth.ok) return fail("Could not reach M-Pesa. Please try again.");
    const { access_token } = (await auth.json()) as { access_token: string };

    const timestamp = new Date(Date.now() + 3 * 3600 * 1000).toISOString().replace(/[-T:.Z]/g, "").slice(0, 14); // Nairobi time
    const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");
    const stk = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode, Password: password, Timestamp: timestamp,
        TransactionType: process.env.MPESA_TXN_TYPE ?? "CustomerPayBillOnline",
        Amount: row.amount, PartyA: phone, PartyB: shortcode, PhoneNumber: phone,
        CallBackURL: `${site}/api/mpesa/callback/${callbackSecret}`,
        AccountReference: "Medbot", TransactionDesc: "Consultation", // Daraja limits: reference 12 chars, description 13
      }),
    });
    const out = (await stk.json()) as { ResponseCode?: string; CheckoutRequestID?: string; errorMessage?: string; ResponseDescription?: string };
    if (!stk.ok || out.ResponseCode !== "0" || !out.CheckoutRequestID) {
      const msg = out.errorMessage ?? out.ResponseDescription ?? "M-Pesa rejected the request.";
      // Daraja allows one open prompt per phone at a time; say so in plain words.
      return fail(/lock subscriber/i.test(msg) ? "A payment request is already open on this number. Wait one minute, then try again." : msg);
    }

    await sb.rpc("attach_checkout", { pid: row.payment_id, p_checkout: out.CheckoutRequestID });
    return NextResponse.json({ ok: true, amount: row.amount });
  } catch {
    return fail("Could not reach M-Pesa. Please try again.");
  }
}
