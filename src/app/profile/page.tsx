"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

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
        <input className="input" type="password" minLength={8} placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn">Change password</button>
      </form>
    </div>
  );
}
