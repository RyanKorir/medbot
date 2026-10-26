"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { SPECIALTIES } from "@/lib/triage";

type Row = { id: string; status: string; paid: boolean; urgency: "emergency" | "soon" | "routine" | null; reason: string | null; created_at: string; other_name: string | null; specialty: string; last_body: string | null; last_at: string | null; unread: number };
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
  const [rating, setRating] = useState<{ avg_rating: number; n: number } | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    const sb = supabase();
    const { data } = await sb.rpc("my_inbox");
    setRows((data as Row[]) ?? []);
    if (me.role === "doctor") {
      const { data: d } = await sb.from("doctors").select("specialty, hospital, bio, fee_kes, verified, licence_number, licence_doc").eq("id", me.id).maybeSingle();
      const { data: rt } = await sb.from("doctor_ratings").select("avg_rating, n").eq("doctor_id", me.id).maybeSingle();
      setRating(rt ?? null);
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
            <h2 className="font-semibold">Your doctor profile{rating ? <span className="ml-2 text-sm font-normal text-amber-600">★ {rating.avg_rating} ({rating.n})</span> : null}</h2>
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
        <h2 className="font-semibold">{me.role === "doctor" ? "Patient messages" : "Your conversations"}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">{me.role === "doctor" ? "No patient messages yet." : <>No conversations yet. <Link className="font-medium text-brand-700" href="/doctors">Message a specialist</Link>.</>}</p>
        ) : rows.map((r) => (
          <Link key={r.id} href={`/consult/${r.id}`} className={`card block hover:border-brand-500 ${r.unread > 0 ? "border-brand-500" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium">
                {r.urgency && <span className={`h-2.5 w-2.5 rounded-full ${dotColor[r.urgency]}`} />}
                {me.role === "doctor" ? r.other_name || "Patient" : `Dr. ${r.other_name ?? ""}`}
                {r.unread > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{r.unread} new</span>}
                {!r.last_at && r.status === "open" && me.role === "doctor" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">New request</span>}
              </div>
              <span className="whitespace-nowrap text-xs text-slate-500">{new Date(r.last_at ?? r.created_at).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 truncate text-sm text-slate-600">{r.last_body ?? r.reason ?? "No messages yet"}</div>
            <div className="mt-1 text-xs text-slate-500">{r.specialty} · {r.status}{!r.paid && r.status === "open" ? " · awaiting payment" : ""}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
