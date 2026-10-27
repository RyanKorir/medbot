import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// A daily cron (vercel.json) calls this. The query counts as database activity, which stops Supabase's
// free plan from pausing the project after 7 quiet days. It also doubles as a simple uptime check.
export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await sb.from("app_settings").select("payments_enabled").eq("id", 1).maybeSingle();
  await sb.rpc("prune_security_events"); // keep the trap log to 30 days
  return NextResponse.json({ ok: !error }, { status: error ? 503 : 200 });
}
