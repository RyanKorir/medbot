"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

function TwoFactor() {
  const [factorId, setFactorId] = useState<string | null>(null); // verified factor, if any
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    const { data } = await supabase().auth.mfa.listFactors();
    setFactorId(data?.totp?.[0]?.id ?? null);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function start() {
    setMsg("");
    const sb = supabase();
    const { data: all } = await sb.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id }); // clear half-finished attempts
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Medbot ${Date.now()}` });
    if (error || !data) { setMsg(error?.message ?? "Could not start setup."); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    const sb = supabase();
    const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId: enroll.id });
    if (e1 || !ch) { setMsg(e1?.message ?? "Failed."); return; }
    const { error: e2 } = await sb.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.id, code: code.trim() });
    if (e2) { setMsg("That code did not work. Try the newest one."); return; }
    setEnroll(null); setCode(""); setMsg("Two-factor is now on. You will be asked for a code each time you log in."); refresh();
  }
  async function remove() {
    if (!factorId || !confirm_("Turn off two-factor protection?")) return;
    const { error } = await supabase().auth.mfa.unenroll({ factorId });
    setMsg(error ? "Log out and back in with your code first, then try again." : "Two-factor turned off."); refresh();
  }
  const confirm_ = (t: string) => window.confirm(t);

  return (
    <div className="card space-y-3">
      <div className="font-semibold">Two-factor protection</div>
      {factorId && !enroll ? (
        <>
          <p className="text-sm text-emerald-700">On. Your account needs a code from your authenticator app to log in.</p>
          <button className="btn-ghost" onClick={remove}>Turn off</button>
        </>
      ) : enroll ? (
        <form onSubmit={confirm} className="space-y-3">
          <p className="text-sm text-slate-600">Scan this with Google Authenticator, Microsoft Authenticator or similar, then enter the 6-digit code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="Two-factor QR code" className="h-44 w-44" />
          <p className="break-all text-xs text-slate-500">Cannot scan? Enter this key: {enroll.secret}</p>
          <input className="input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button className="btn">Turn on</button>
        </form>
      ) : (
        <>
          <p className="text-sm text-slate-600">Adds a second step at login so a stolen password alone is not enough. Strongly recommended for doctors and admins.</p>
          <button className="btn" onClick={start}>Set up two-factor</button>
        </>
      )}
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
    </div>
  );
}

export default function Profile() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { if (!loading && !me) router.push("/login"); }, [loading, me, router]);
  useEffect(() => { if (me) setName(me.full_name); }, [me]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const { error } = await supabase().from("profiles").update({ full_name: name.trim() }).eq("id", me.id);
    setMsg(error ? error.message : "Name updated.");
  }
  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase().auth.updateUser({ password });
    setMsg(error ? error.message : "Password changed."); setPassword("");
  }

  if (loading || !me) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <p className="text-sm text-slate-600">{me.email} · <span className="capitalize">{me.role}</span></p>
      {msg && <p className="text-sm text-brand-700">{msg}</p>}
      <form onSubmit={saveName} className="card space-y-3">
        <label className="text-sm font-medium">Full name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="btn">Save name</button>
      </form>
      <form onSubmit={savePassword} className="card space-y-3">
        <label className="text-sm font-medium">Change password</label>
        <input className="input" type="password" minLength={10} autoComplete="new-password" placeholder="New password (10+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn">Change password</button>
      </form>
      <TwoFactor />
    </div>
  );
}
