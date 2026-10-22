"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { SPECIALTIES } from "@/lib/triage";

type Row = { urgency: "emergency" | "soon" | "routine" | null; id: string; created_at: string; status: string; patient: { full_name: string } | null; doctor: { specialty: string; profiles: { full_name: string } | null } | null };
type DoctorRow = { specialty: string; hospital: string | null; bio: string | null; fee_kes: number; verified: boolean };

export default function Dashboard() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [doc, setDoc] = useState<DoctorRow | null>(null);
  const [form, setForm] = useState({ specialty: SPECIALTIES[0], hospital: "", bio: "", fee_kes: 0 });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!me) return;
    const sb = supabase();
    const { data } = await sb.from("consultations")
      .select("id, urgency, created_at, status, patient:profiles!consultations_patient_id_fkey(full_name), doctor:doctors(specialty, profiles(full_name))")
      .order("created_at", { ascending: false });
    setRows((data as unknown as Row[]) ?? []);
    if (me.role === "doctor") {
      const { data: d } = await sb.from("doctors").select("specialty, hospital, bio, fee_kes, verified").eq("id", me.id).maybeSingle();
      if (d) { setDoc(d); setForm({ specialty: d.specialty, hospital: d.hospital ?? "", bio: d.bio ?? "", fee_kes: d.fee_kes }); }
    }
  }, [me]);

  useEffect(() => { if (!loading && !me) router.push("/login"); }, [loading, me, router]);
  useEffect(() => { load(); }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setMsg("");
    const sb = supabase();
    const values = { specialty: form.specialty, hospital: form.hospital || null, bio: form.bio || null, fee_kes: Number(form.fee_kes) || 0 };
    const { error } = doc
      ? await sb.from("doctors").update(values).eq("id", me.id)
      : await sb.from("doctors").insert({ id: me.id, ...values });
    setMsg(error ? error.message : "Saved. An admin will verify your registration before you appear in the directory.");
    load();
  }

  if (loading || !me) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Hello, {me.full_name || me.email}</h1>
        <p className="text-sm capitalize text-slate-600">{me.role} account</p>
      </div>

      {me.role === "doctor" && (
        <form onSubmit={saveProfile} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your doctor profile</h2>
            {doc && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${doc.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{doc.verified ? "Verified" : "Awaiting verification"}</span>}
          </div>
          <select className="input" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
            {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="Hospital or clinic" value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} />
          <textarea className="input" rows={3} placeholder="Short bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          <input className="input" type="number" min={0} placeholder="Consultation fee (KES)" value={form.fee_kes} onChange={(e) => setForm({ ...form, fee_kes: Number(e.target.value) })} />
          {msg && <p className="text-sm text-slate-600">{msg}</p>}
          <button className="btn">{doc ? "Update profile" : "Submit for verification"}</button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Your consultations</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">{me.role === "doctor" ? "No patients yet." : <>None yet. <Link className="font-medium text-brand-700" href="/doctors">Find a doctor</Link>.</>}</p>
        ) : rows.map((r) => (
          <Link key={r.id} href={`/consult/${r.id}`} className="card flex items-center justify-between hover:border-brand-500">
            <div>
              <div className="flex items-center gap-2 font-medium">{r.urgency && <span className={`h-2.5 w-2.5 rounded-full ${r.urgency === "emergency" ? "bg-red-500" : r.urgency === "soon" ? "bg-amber-500" : "bg-emerald-500"}`} />}{me.role === "doctor" ? r.patient?.full_name || "Patient" : `Dr. ${r.doctor?.profiles?.full_name ?? ""}`}</div>
              <div className="text-xs text-slate-500">{r.doctor?.specialty} · {new Date(r.created_at).toLocaleDateString()}</div>
            </div>
            <span className="text-sm font-medium text-brand-700">Open chat →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
