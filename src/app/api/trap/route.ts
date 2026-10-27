import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const FORM_KINDS = ["honeypot_login", "honeypot_signup", "honeypot_forgot", "bot_timing"];

async function record(req: NextRequest, kind: string, detail: string) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ua = req.headers.get("user-agent") ?? "";
  console.warn(JSON.stringify({ trap: kind, ip, ua, detail })); // also lands in the Vercel logs
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    await sb.rpc("report_web_trap", { p_kind: kind, p_ip: ip, p_ua: ua, p_detail: detail });
  } catch { /* logging must never break the response */ }
}

// Scanner probes (rewritten here from next.config.mjs): log, then pretend nothing is there.
async function probe(req: NextRequest) {
  // For rewritten requests the handler still sees the path the scanner asked for.
  await record(req, "scanner_probe", `${req.method} ${req.nextUrl.pathname}`.slice(0, 150));
  return new NextResponse("Not Found", { status: 404 });
}
export const GET = probe, HEAD = probe, PUT = probe, DELETE = probe, PATCH = probe;

// Honeypot / bot-timing reports from our own forms. Anything else posted here is a scanner, not a person.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { kind?: string; detail?: string } | null;
  if (body && typeof body === "object" && typeof body.kind === "string" && FORM_KINDS.includes(body.kind)) {
    await record(req, body.kind, String(body.detail ?? "").slice(0, 150));
    return NextResponse.json({ ok: true });
  }
  return probe(req);
}
