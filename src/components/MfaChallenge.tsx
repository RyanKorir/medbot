"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Asks for the 6-digit code from the user's authenticator app and upgrades the session to two-factor level.
export default function MfaChallenge({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const sb = supabase();
    const { data: f } = await sb.auth.mfa.listFactors();
    const factor = f?.totp?.[0];
    if (!factor) { setErr("No authenticator app is set up on this account."); setBusy(false); return; }
    const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId: factor.id });
    if (e1 || !ch) { setErr(e1?.message ?? "Could not start verification."); setBusy(false); return; }
    const { error: e2 } = await sb.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: code.trim() });
    setBusy(false);
    if (e2) setErr("That code did not work. Use the newest code from your app."); else onDone();
  }

  return (
    <form onSubmit={verify} className="card space-y-3">
      <div className="font-semibold">Two-factor verification</div>
      <p className="text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
      <input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
    </form>
  );
}
