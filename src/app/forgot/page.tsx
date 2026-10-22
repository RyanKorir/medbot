"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
    if (error) setError(error.message); else setSent(true);
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      {sent ? <div className="card text-sm">If an account exists for {email}, a reset link is on its way. Check your spam folder too.</div> : (
        <form onSubmit={submit} className="card space-y-3">
          <input className="input" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn w-full">Send reset link</button>
        </form>
      )}
    </div>
  );
}
