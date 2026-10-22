import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Item = { Name: string; Value?: string | number };

// Safaricom calls this after the customer enters (or cancels) their PIN. The secret in the URL, checked again
// inside the database function, stops anyone else from faking a payment.
export async function POST(req: NextRequest, { params }: { params: { secret: string } }) {
  if (!process.env.MPESA_CALLBACK_SECRET || params.secret !== process.env.MPESA_CALLBACK_SECRET) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const cb = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return NextResponse.json({ ResultCode: 1, ResultDesc: "Bad request" }, { status: 400 });

  const items: Item[] = cb.CallbackMetadata?.Item ?? [];
  const get = (n: string) => items.find((i) => i.Name === n)?.Value;

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await sb.rpc("record_mpesa_callback", {
    p_secret: process.env.MPESA_CALLBACK_SECRET,
    p_checkout: cb.CheckoutRequestID,
    p_code: Number(cb.ResultCode),
    p_desc: String(cb.ResultDesc ?? ""),
    p_receipt: (get("MpesaReceiptNumber") as string | undefined) ?? null,
    p_amount: get("Amount") !== undefined ? Number(get("Amount")) : null,
  });
  if (error) console.error("record_mpesa_callback failed", error.message);
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
