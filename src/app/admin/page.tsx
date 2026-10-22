"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Pay = { id: string; amount_kes: number; status: string; phone: string; mpesa_receipt: string | null; created_at: string };
type D = { id: string; specialty: string; hospital: string | null; fee_kes: number; verified: boolean; licence_number: string | null; licence_doc: string | null; profiles: { full_name: string } | null };

export default function Admin() {
  const { me, loading } = useMe();
  const [docs, setDocs] = useState<D[]>([]);
  const [err, setErr] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [pays, setPays] = useState<Pay[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase().from("doctors").select("id, specialty, hospital, fee_kes, verified, licence_number, licence_doc, profiles(full_name)").order("verified");
    if (error) setErr(error.message); else setDocs((data as unknown as D[]) ?? []);
    const { data: st } = await supabase().from("app_settings").select("payments_enabled").eq("id", 1).maybeSingle();
    setEnabled(Boolean(st?.payments_enabled));
    const { data: ps } = await supabase().from("payments").select("id, amount_kes, status, phone, mpesa_receipt, created_at").order("created_at", { ascending: false }).limit(20);
    setPays((ps as Pay[]) ?? []);
  }, []);
  async function togglePayments() {
    if (!enabled && !confirm("Turn on paid consultations? Do this only after your M-Pesa keys are set in Vercel. New consultations with doctors who charge a fee will need payment before chatting.")) return;
    const { error } = await supabase().from("app_settings").update({ payments_enabled: !enabled }).eq("id", 1);
    if (error) setErr(error.message);
    load();
  }

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
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">M-Pesa payments</h2>
            <p className="text-sm text-slate-600">{enabled ? "On: doctors who charge a fee are paid before chatting starts." : "Off: all consultations are free for now."}</p>
          </div>
          <button className={enabled ? "btn-ghost" : "btn"} onClick={togglePayments}>{enabled ? "Turn off" : "Turn on"}</button>
        </div>
        {pays.length > 0 && (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500"><tr><th className="py-1">Date</th><th>Amount</th><th>Phone</th><th>Status</th><th>Receipt</th></tr></thead>
            <tbody>{pays.map((p) => <tr key={p.id} className="border-t"><td className="py-1">{new Date(p.created_at).toLocaleString()}</td><td>KES {p.amount_kes}</td><td>{p.phone}</td><td>{p.status}</td><td>{p.mpesa_receipt ?? "-"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
      <section className="space-y-3"><h2 className="font-semibold">Verified ({docs.length - pending.length})</h2>{docs.filter((d) => d.verified).map(Row)}</section>
    </div>
  );
}
