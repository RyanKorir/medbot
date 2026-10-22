"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SetupNotice from "@/components/SetupNotice";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { SPECIALTIES } from "@/lib/triage";

type Doctor = { id: string; specialty: string; hospital: string | null; bio: string | null; fee_kes: number; profiles: { full_name: string } | null };

function Directory() {
  const router = useRouter();
  const params = useSearchParams();
  const specialty = params.get("specialty") ?? "";
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    let q = supabase().from("doctors").select("id, specialty, hospital, bio, fee_kes, profiles(full_name)").eq("verified", true);
    if (specialty) q = q.eq("specialty", specialty);
    q.then(({ data }) => { setDoctors((data as unknown as Doctor[]) ?? []); setLoading(false); });
  }, [specialty]);

  async function consult(doctorId: string) {
    setMsg("");
    const sb = supabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/login"); return; }
    await sb.from("consents").upsert({ user_id: user.id, purpose: "consultation" });
    let intake: Record<string, unknown> = {};
    try { const raw = sessionStorage.getItem("medbot_check"); if (raw) intake = JSON.parse(raw); } catch { /* none saved */ }
    const { data, error } = await sb.from("consultations").insert({ patient_id: user.id, doctor_id: doctorId, ...intake }).select("id").single();
    if (error || !data) setMsg(error?.message ?? "Could not start consultation."); else router.push(`/consult/${data.id}`);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Doctors{specialty ? ` — ${specialty}` : ""}</h1>
      <div className="flex flex-wrap gap-2">
        <a href="/doctors" className={`rounded-full border px-3 py-1 text-sm ${!specialty ? "bg-brand-100 text-brand-700" : "bg-white"}`}>All</a>
        {SPECIALTIES.map((s) => (
          <a key={s} href={`/doctors?specialty=${encodeURIComponent(s)}`} className={`rounded-full border px-3 py-1 text-sm ${s === specialty ? "bg-brand-100 text-brand-700" : "bg-white"}`}>{s}</a>
        ))}
      </div>
      {!supabaseConfigured && <SetupNotice />}
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : doctors.length === 0 && supabaseConfigured ? (
        <p className="text-sm text-slate-600">No verified doctors in this category yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {doctors.map((d) => (
            <div key={d.id} className="card space-y-2">
              <div className="font-semibold">Dr. {d.profiles?.full_name ?? "Unnamed"}</div>
              <div className="text-sm text-slate-600">{d.specialty}{d.hospital ? ` · ${d.hospital}` : ""}</div>
              {d.bio && <p className="text-sm text-slate-600">{d.bio}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium">{d.fee_kes > 0 ? `KES ${d.fee_kes.toLocaleString()}` : "Free"}</span>
                <button className="btn" onClick={() => consult(d.id)}>Start consultation</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Doctors() {
  return <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}><Directory /></Suspense>;
}
