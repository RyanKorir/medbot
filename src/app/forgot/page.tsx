"use client";
import { useState } from "react";
import Captcha, { captchaEnabled } from "@/components/Captcha";
import Honeypot from "@/components/Honeypot";
import { reportTrap, useAttemptGuard } from "@/lib/guard";
import { supabase } from "@/lib/supabase";

export default function Forgot() {
  const guard = useAttemptGuard("forgot");
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (guard.wait > 0) return;
    if (trap || guard.tooFast()) { reportTrap(trap ? "honeypot_forgot" : "bot_timing"); guard.fail(); setSent(true); return; }
    if (captchaEnabled && !captcha) { setError("Please complete the verification check."); return; }
    setError("");
    const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset`, captchaToken: captcha ?? undefined });
    guard.fail(); // every request counts: this form should never be hammered
    if (error) setError(error.message); else setSent(true);
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      {sent ? <div className="card text-sm">If an account exists for that email, a reset link is on its way. Check your spam folder too.</div> : (
        <form onSubmit={submit} className="card relative space-y-3">
          <Honeypot value={trap} onChange={setTrap} />
          <input className="input" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Captcha onToken={setCaptcha} />
          {guard.wait > 0 && <p className="text-sm text-amber-700">Please wait {guard.wait}s before trying again.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn w-full" disabled={guard.wait > 0}>Send reset link</button>
        </form>
      )}
    </div>
  );
}
