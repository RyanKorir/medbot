"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { SPECIALTIES } from "@/lib/triage";

type Row = { urgency: "emergency" | "soon" | "routine" | null; id: string; created_at: string; status: string; patient: { full_name: string } | null; doctor: { specialty: string; profiles: { full_name: string } | null } | null };
type DoctorRow = { specialty: string; hospital: string | null; bio: string | null; fee_kes: number; verified: boolean; licence_number: string | null; licence_doc: string | null };
const dotColor = { emergency: "bg-red-500", soon: "bg-amber-500", routine: "bg-emerald-500" } as const;

export default function Dashboard() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [doc, setDoc] = useState<DoctorRow | null>(null);
  const [form, setForm] = useState({ specialty: SPECIALTIES[0], hospital: "", bio: "", fee_kes: 0, licence_number: "" });
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const sb = supabase();
    const { data } = await sb.from("consultations")
      .select("id, urgency, created_at, status, patient:profiles!consultations_patient_id_fkey(full_name), doctor:doctors(specialty, profiles(full_name))")
      .order("created_at", { ascending: false });
    setRows((data as unknown as Row[]) ?? []);
    if (me.role === "doctor") {
      const { data: d } = await sb.from("doctors").select("specialty, hospital, bio, fee_kes, verified, licence_number, licence_doc").eq("id", me.id).maybeSingle();
      if (d) { setDoc(d); setForm({ specialty: d.specialty, hospital: d.hospital ?? "", bio: d.bio ?? "", fee_kes: d.fee_kes, licence_number: d.licence_number ?? "" }); }
    }
  }, [me]);

  useEffect(() => { if (!loading && !me) router.push("/login"); }, [loading, me, router]);
  useEffect(() => { load(); }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setMsg(""); setBusy(true);
    const sb = supabase();
    let licence_doc = doc?.licence_doc ?? null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setMsg("The file must be under 5 MB."); setBusy(false); return; }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const path = `${me.id}/licence.${ext}`;
      const up = await sb.storage.from("licences").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) { setMsg(up.error.message); setBusy(false); return; }
      licence_doc = path;
    }
    const values = { specialty: form.specialty, hospital: form.hospital || null, bio: form.bio || null, fee_kes: Number(form.fee_kes) || 0, licence_number: form.licence_number.trim() || null, licence_doc };
    const { error } = doc
      ? await sb.from("doctors").update(values).eq("id", me.id)
      : await sb.from("doctors").insert({ id: me.id, ...values });
    setBusy(false);
    setFile(null);
    setMsg(error ? error.message : "Saved. An admin will check your KMPDC licence before you appear in the directory.");
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
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-medium">Professional registration (required for verification)</div>
            <input className="input" placeholder="KMPDC licence / registration number" value={form.licence_number} onChange={(e) => setForm({ ...form, licence_number: e.target.value })} required />
            <input className="text-sm" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-slate-500">{doc?.licence_doc ? "A document is on file. Upload again to replace it." : "Upload a PDF or photo of your practising licence (max 5 MB). Only you and Medbot admins can see it."}</p>
          </div>
          {msg && <p className="text-sm text-slate-600">{msg}</p>}
          <button className="btn" disabled={busy}>{busy ? "Saving…" : doc ? "Update profile" : "Submit for verification"}</button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Your consultations</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">{me.role === "doctor" ? "No patients yet." : <>None yet. <Link className="font-medium text-brand-700" href="/doctors">Find a doctor</Link>.</>}</p>
        ) : rows.map((r) => (
          <Link key={r.id} href={`/consult/${r.id}`} className="card flex items-center justify-between hover:border-brand-500">
            <div>
              <div className="flex items-center gap-2 font-medium">
                {r.urgency && <span className={`h-2.5 w-2.5 rounded-full ${dotColor[r.urgency]}`} />}
                {me.role === "doctor" ? r.patient?.full_name || "Patient" : `Dr. ${r.doctor?.profiles?.full_name ?? ""}`}
              </div>
              <div className="text-xs text-slate-500">{r.doctor?.specialty} · {new Date(r.created_at).toLocaleDateString()} · {r.status}</div>
            </div>
            <span className="text-sm font-medium text-brand-700">{r.status === "open" ? "Open chat →" : "View →"}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
