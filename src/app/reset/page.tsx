"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Reset() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase().auth.updateUser({ password });
    if (error) setError(error.message); else { setDone(true); setTimeout(() => router.push("/dashboard"), 1500); }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      {done ? <div className="card text-sm">Password updated. Taking you to your dashboard…</div> : (
        <form onSubmit={submit} className="card space-y-3">
          <input className="input" type="password" minLength={8} placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn w-full">Save password</button>
          <p className="text-xs text-slate-500">If this says you are not logged in, open the reset link from your email again.</p>
        </form>
      )}
    </div>
  );
}
