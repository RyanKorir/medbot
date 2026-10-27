"use client";
import { useCallback, useEffect, useState } from "react";
import MfaChallenge from "@/components/MfaChallenge";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Stats = Record<string, number | null>;
type Pay = { id: string; amount_kes: number; status: string; phone: string; mpesa_receipt: string | null; created_at: string };
type Ev = { id: number; at: string; kind: string; ip: string | null; ua: string | null; detail: string | null };
type D = { id: string; specialty: string; hospital: string | null; fee_kes: number; verified: boolean; licence_number: string | null; licence_doc: string | null; profiles: { full_name: string } | null };

export default function Admin() {
  const { me, loading } = useMe();
  const [docs, setDocs] = useState<D[]>([]);
  const [err, setErr] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pays, setPays] = useState<Pay[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [mfaNeeded, setMfaNeeded] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data, error } = await sb.from("doctors").select("id, specialty, hospital, fee_kes, verified, licence_number, licence_doc, profiles(full_name)").order("verified");
    if (error) setErr(error.message); else setDocs((data as unknown as D[]) ?? []);
    const { data: sd } = await sb.rpc("admin_stats");
    setStats((sd as Stats) ?? null);
    const { data: st } = await sb.from("app_settings").select("payments_enabled").eq("id", 1).maybeSingle();
    setEnabled(Boolean(st?.payments_enabled));
    const { data: ps } = await sb.from("payments").select("id, amount_kes, status, phone, mpesa_receipt, created_at").order("created_at", { ascending: false }).limit(20);
    setPays((ps as Pay[]) ?? []);
    const { data: ev } = await sb.from("security_events").select("id, at, kind, ip, ua, detail").order("at", { ascending: false }).limit(30);
    setEvents((ev as Ev[]) ?? []);
    fetch("/api/payments-status").then((r) => r.json()).then((j: { configured: boolean }) => setConfigured(j.configured)).catch(() => setConfigured(null));
  }, []);

  // If this admin has two-factor on but this session is not verified yet, ask for the code first.
  useEffect(() => {
    if (me?.role !== "admin") return;
    supabase().auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      const need = data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
      setMfaNeeded(need);
      if (!need) load();
    });
  }, [me, load]);

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
  async function togglePayments() {
    if (!enabled && configured === false) { setErr("Add MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in Vercel first, otherwise patients cannot pay and chats stay locked."); return; }
    if (!enabled && !confirm("Turn on paid consultations? New consultations with doctors who charge a fee will need payment before chatting.")) return;
    const { error } = await supabase().from("app_settings").update({ payments_enabled: !enabled }).eq("id", 1);
    if (error) setErr(error.message);
    load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (me?.role !== "admin") return <div className="card text-sm">This page is for administrators only.</div>;
  if (mfaNeeded) return <div className="mx-auto max-w-sm"><MfaChallenge onDone={() => { setMfaNeeded(false); load(); }} /></div>;

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
      <h1 className="text-2xl font-bold">Admin overview</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ["Patients", stats.patients], ["Doctors (verified)", `${stats.doctors_total} (${stats.doctors_verified})`],
            ["Consultations", stats.consultations_total], ["Open now", stats.consultations_open],
            ["Last 7 days", stats.consultations_7d], ["Emergency checks", stats.emergency_checks],
            ["Revenue (KES)", Number(stats.revenue_kes ?? 0).toLocaleString()], ["Avg rating", stats.avg_rating ? `${stats.avg_rating} (${stats.reviews})` : "-"],
            ["Checker accuracy", stats.labelled ? `${Math.round((Number(stats.agree) / Number(stats.labelled)) * 100)}% of ${stats.labelled}` : "No labelled cases yet"],
          ] as [string, string | number | null][]).map(([k, v]) => (
            <div key={k} className="card !p-3"><div className="text-xs text-slate-500">{k}</div><div className="text-lg font-bold">{v ?? 0}</div></div>
          ))}
        </div>
      )}

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Security events {events.length > 0 && <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{events.length}</span>}</h2>
            <p className="text-sm text-slate-600">Bots caught by hidden form fields, scanner probes (e.g. WordPress or .php URLs), and calls to decoy API functions. Kept 30 days. Nothing here is a real user action.</p>
          </div>
        </div>
        {events.length === 0 ? <p className="text-sm text-slate-500">No suspicious activity recorded.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500"><tr><th className="py-1">When</th><th>Type</th><th>IP</th><th>Detail</th></tr></thead>
            <tbody>{events.map((e) => <tr key={e.id} className="border-t align-top"><td className="py-1 whitespace-nowrap">{new Date(e.at).toLocaleString()}</td><td>{e.kind}</td><td>{e.ip ?? "-"}</td><td className="break-all">{e.detail ?? ""}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">M-Pesa payments</h2>
            <p className="text-sm text-slate-600">{enabled ? "On: doctors who charge a fee are paid before chatting starts." : "Off: all consultations are free for now."}</p>
            {enabled && configured === false && <p className="mt-1 text-sm font-medium text-red-600">Warning: payments are on but the M-Pesa keys are not set in Vercel. Patients cannot pay, so chats with paid doctors stay locked. Turn payments off or add the keys.</p>}
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

      <h2 className="pt-2 text-xl font-bold">Doctor verification</h2>
      <p className="text-sm text-slate-600">Open the licence document and check the number against the KMPDC register before verifying. Verify is disabled until both are provided.</p>
      <section className="space-y-3"><h2 className="font-semibold">Awaiting verification ({pending.length})</h2>{pending.length ? pending.map(Row) : <p className="text-sm text-slate-500">Nothing pending.</p>}</section>
      <section className="space-y-3"><h2 className="font-semibold">Verified ({docs.length - pending.length})</h2>{docs.filter((d) => d.verified).map(Row)}</section>
    </div>
  );
}
