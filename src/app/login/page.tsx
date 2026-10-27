"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Captcha, { captchaEnabled } from "@/components/Captcha";
import Honeypot from "@/components/Honeypot";
import MfaChallenge from "@/components/MfaChallenge";
import SetupNotice from "@/components/SetupNotice";
import { reportTrap, useAttemptGuard } from "@/lib/guard";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const guard = useAttemptGuard("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [trap, setTrap] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needMfa, setNeedMfa] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (guard.wait > 0) return;
    if (trap || guard.tooFast()) { // a bot: report it, answer like a normal failure, never touch the auth server
      reportTrap(trap ? "honeypot_login" : "bot_timing");
      guard.fail(); setError("Invalid email or password."); return;
    }
    if (captchaEnabled && !captcha) { setError("Please complete the verification check."); return; }
    setBusy(true); setError("");
    const { error } = await supabase().auth.signInWithPassword({ email, password, options: captcha ? { captchaToken: captcha } : undefined });
    setBusy(false);
    if (error) { guard.fail(); setError(error.message); return; }
    guard.ok();
    const { data } = await supabase().auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") setNeedMfa(true); else router.push("/doctors");
  }

  if (needMfa) return <div className="mx-auto max-w-sm"><MfaChallenge onDone={() => router.push("/doctors")} /></div>;

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Log in</h1>
      {!supabaseConfigured && <SetupNotice />}
      <form onSubmit={submit} className="card relative space-y-3">
        <Honeypot value={trap} onChange={setTrap} />
        <input className="input" type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Captcha onToken={setCaptcha} />
        {guard.wait > 0 && <p className="text-sm text-amber-700">Too many attempts. Try again in {guard.wait >= 60 ? `${Math.ceil(guard.wait / 60)} min` : `${guard.wait}s`}.</p>}
        {error && guard.wait === 0 && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn w-full" disabled={busy || guard.wait > 0}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
      <p className="text-sm text-slate-600"><Link className="font-medium text-brand-700" href="/forgot">Forgot your password?</Link></p>
      <p className="text-sm text-slate-600">New here? <Link className="font-medium text-brand-700" href="/signup">Create an account</Link></p>
    </div>
  );
}
