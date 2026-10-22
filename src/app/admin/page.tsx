"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type D = { id: string; specialty: string; hospital: string | null; fee_kes: number; verified: boolean; licence_number: string | null; licence_doc: string | null; profiles: { full_name: string } | null };

export default function Admin() {
  const { me, loading } = useMe();
  const [docs, setDocs] = useState<D[]>([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase().from("doctors").select("id, specialty, hospital, fee_kes, verified, licence_number, licence_doc, profiles(full_name)").order("verified");
    if (error) setErr(error.message); else setDocs((data as unknown as D[]) ?? []);
  }, []);

  useEffect(() => { if (me?.role === "admin") load(); }, [me, load]);

  async function setVerified(id: string, verified: boolean) {
    setErr("");
    const { error } = await supabase().from("doctors").update({ verified }).eq("id", id);
    if (error) setErr(error.message);
    load();
  }
  async function viewDoc(path: string) {
    const { data, error } = await supabase().storage.from("licences").createSignedUrl(path, 60);
    if (error || !data) setErr(error?.message ?? "Could not open the document."); else window.open(data.signedUrl, "_blank");
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (me?.role !== "admin") return <div className="card text-sm">This page is for administrators only.</div>;

  const pending = docs.filter((d) => !d.verified);
  const Row = (d: D) => (
    <div key={d.id} className="card flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <div className="font-semibold">Dr. {d.profiles?.full_name || "Unnamed"}</div>
        <div className="text-sm text-slate-600">{d.specialty}{d.hospital ? ` · ${d.hospital}` : ""} · KES {d.fee_kes.toLocaleString()}</div>
        <div className="text-sm">Licence no: {d.licence_number ? <strong>{d.licence_number}</strong> : <span className="text-red-600">not provided</span>}
          {d.licence_doc && <button className="ml-3 font-medium text-brand-700 hover:underline" onClick={() => viewDoc(d.licence_doc!)}>View document</button>}</div>
      </div>
      {d.verified
        ? <button className="btn-ghost" onClick={() => setVerified(d.id, false)}>Revoke</button>
        : <button className="btn" disabled={!d.licence_number || !d.licence_doc} title={!d.licence_number || !d.licence_doc ? "Licence number and document are required" : ""} onClick={() => setVerified(d.id, true)}>Verify</button>}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Doctor verification</h1>
      <p className="text-sm text-slate-600">Open the licence document and check the number against the KMPDC register before verifying. Verify is disabled until both are provided.</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <section className="space-y-3"><h2 className="font-semibold">Awaiting verification ({pending.length})</h2>{pending.length ? pending.map(Row) : <p className="text-sm text-slate-500">Nothing pending.</p>}</section>
      <section className="space-y-3"><h2 className="font-semibold">Verified ({docs.length - pending.length})</h2>{docs.filter((d) => d.verified).map(Row)}</section>
    </div>
  );
}
