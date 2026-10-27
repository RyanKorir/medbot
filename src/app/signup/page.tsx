"use client";
import Link from "next/link";
import { useState } from "react";
import Captcha, { captchaEnabled } from "@/components/Captcha";
import Honeypot from "@/components/Honeypot";
import SetupNotice from "@/components/SetupNotice";
import { reportTrap, useAttemptGuard } from "@/lib/guard";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export default function Signup() {
  const guard = useAttemptGuard("signup");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "patient" });
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (guard.wait > 0) return;
    if (trap || guard.tooFast()) { reportTrap(trap ? "honeypot_signup" : "bot_timing"); guard.fail(); setSent(true); return; } // bots are told it worked
    if (captchaEnabled && !captcha) { setError("Please complete the verification check."); return; }
    setError("");
    const { error } = await supabase().auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.full_name, role: form.role }, captchaToken: captcha ?? undefined },
    });
    if (error) { guard.fail(); setError(error.message); } else setSent(true);
  }

  if (sent) return <div className="card mx-auto max-w-sm">Check your email to confirm your account, then <Link className="font-medium text-brand-700" href="/login">log in</Link>.</div>;

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Create your account</h1>
      {!supabaseConfigured && <SetupNotice />}
      <form onSubmit={submit} className="card relative space-y-3">
        <Honeypot value={trap} onChange={setTrap} />
        <input className="input" placeholder="Full name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
        <input className="input" type="email" placeholder="Email" autoComplete="username" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        <input className="input" type="password" placeholder="Password (10+ characters)" minLength={10} autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} required />
        <select className="input" value={form.role} onChange={(e) => set("role", e.target.value)}>
          <option value="patient">I am a patient</option>
          <option value="doctor">I am a doctor (verification required)</option>
        </select>
        <label className="flex gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          I consent to Medbot processing my health information to provide consultations, as described under the Kenya Data Protection Act, 2019. I can withdraw this at any time.
        </label>
        <Captcha onToken={setCaptcha} />
        {guard.wait > 0 && <p className="text-sm text-amber-700">Too many attempts. Try again in {guard.wait}s.</p>}
        {error && guard.wait === 0 && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn w-full" disabled={!consent || guard.wait > 0}>Sign up</button>
      </form>
    </div>
  );
}
