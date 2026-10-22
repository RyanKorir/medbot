"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Intake = { symptoms: string[]; top_prediction: string | null; urgency: "emergency" | "soon" | "routine" | null; age_group: string | null; sex: string | null };
type Consult = Intake & { status: "open" | "closed"; doctor_id: string; patient_id: string; paid: boolean; doctor: { fee_kes: number } | null };
type Msg = { id: number; sender_id: string; body: string; created_at: string };
const dot = { emergency: "bg-red-500", soon: "bg-amber-500", routine: "bg-emerald-500" } as const;
const label = (s: string) => { const t = s.replace(/_/g, " ").replace(/\s+/g, " ").trim(); return t.charAt(0).toUpperCase() + t.slice(1); };

export default function Consult() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [c, setC] = useState<Consult | null>(null);
  const [reviewed, setReviewed] = useState<{ rating: number } | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState<{ state: "idle" | "sending" | "waiting" | "timeout"; msg: string }>({ state: "idle", msg: "" });
  const bottom = useRef<HTMLDivElement>(null);

  async function loadConsult() {
    const sb = supabase();
    const { data } = await sb.from("consultations").select("symptoms, top_prediction, urgency, age_group, sex, status, doctor_id, patient_id, paid, doctor:doctors(fee_kes)").eq("id", id).maybeSingle();
    if (data) setC(data as Consult);
    const { data: r } = await sb.from("reviews").select("rating").eq("consultation_id", id).maybeSingle();
    setReviewed(r ?? null);
  }

  useEffect(() => {
    const sb = supabase();
    let channel: ReturnType<typeof sb.channel> | null = null;
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMe(user.id);
      await loadConsult();
      const { data, error } = await sb.from("messages").select("id, sender_id, body, created_at").eq("consultation_id", id).order("created_at");
      if (error) setError(error.message); else setMessages(data ?? []);
      channel = sb.channel(`consult-${id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `consultation_id=eq.${id}` },
          (payload) => setMessages((cur) => (cur.some((m) => m.id === (payload.new as Msg).id) ? cur : [...cur, payload.new as Msg])))
        .subscribe();
    })();
    return () => { if (channel) sb.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !me) return;
    setText("");
    const { error } = await supabase().from("messages").insert({ consultation_id: id, sender_id: me, body });
    if (error) setError(error.message);
  }
  async function startPayment(e: React.FormEvent) {
    e.preventDefault();
    setPay({ state: "sending", msg: "" });
    const { data: { session } } = await supabase().auth.getSession();
    const res = await fetch("/api/mpesa/stk", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ consultation_id: id, phone }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setPay({ state: "idle", msg: j.error ?? "Payment failed. Please try again." });
    else setPay({ state: "waiting", msg: "" });
  }
  // After the STK prompt is sent, check for the confirmation every 3 seconds (up to 2 minutes).
  useEffect(() => {
    if (pay.state !== "waiting") return;
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > 120000) { setPay({ state: "timeout", msg: "" }); clearInterval(t); return; }
      loadConsult();
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.state]);

  async function closeConsult() {
    if (!confirm("Close this consultation? Neither of you can send more messages afterwards.")) return;
    const { error } = await supabase().rpc("close_consultation", { cid: id });
    if (error) setError(error.message); else loadConsult();
  }
  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return;
    const { error } = await supabase().from("reviews").insert({ consultation_id: id, rating, comment: comment.trim() || null });
    if (error) setError(error.message); else loadConsult();
  }

  const isDoctor = c && me === c.doctor_id;
  const isPatient = c && me === c.patient_id;
  const closed = c?.status === "closed";

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Consultation {closed && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 align-middle text-xs font-semibold text-slate-600">Closed</span>}</h1>
        {isDoctor && !closed && <button className="btn-ghost" onClick={closeConsult}>Close consultation</button>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {c && c.symptoms.length > 0 && (
        <div className="card space-y-1 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            {c.urgency && <span className={`h-2.5 w-2.5 rounded-full ${dot[c.urgency]}`} />}
            Symptom check summary{c.urgency ? ` · ${c.urgency}` : ""}
          </div>
          <div><span className="text-slate-500">Symptoms:</span> {c.symptoms.map(label).join(", ")}</div>
          {c.top_prediction && <div><span className="text-slate-500">Top automated match:</span> {c.top_prediction} <span className="text-xs text-slate-400">(not a diagnosis)</span></div>}
          {(c.age_group || c.sex) && <div><span className="text-slate-500">Patient:</span> {[c.sex, c.age_group === "child" ? "under 5" : c.age_group === "senior" ? "65+" : c.age_group].filter(Boolean).join(", ")}</div>}
        </div>
      )}

      <div className="card h-[55vh] space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-slate-500">Say hello and describe how you are feeling.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === me ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === me ? "bg-brand-600 text-white" : "bg-slate-100"}`}>{m.body}</div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {closed ? (
        isPatient && !reviewed ? (
          <form onSubmit={submitReview} className="card space-y-3">
            <div className="font-semibold">How was your consultation?</div>
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setRating(n)} className={n <= rating ? "text-amber-500" : "text-slate-300"} aria-label={`${n} stars`}>★</button>)}
            </div>
            <textarea className="input" rows={2} placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
            <button className="btn" disabled={rating < 1}>Submit review</button>
          </form>
        ) : <p className="text-sm text-slate-500">This consultation is closed.{reviewed ? ` Rated ${reviewed.rating}/5.` : ""}</p>
      ) : !c ? null : !c.paid ? (
          isPatient ? (
            <form onSubmit={startPayment} className="card space-y-3">
              <div className="font-semibold">Pay KES {(c.doctor?.fee_kes ?? 0).toLocaleString()} to start chatting</div>
              {pay.state === "waiting" ? (
                <p className="text-sm text-slate-700">Check your phone and enter your M-Pesa PIN. This page updates automatically.</p>
              ) : (
                <>
                  <input className="input" inputMode="tel" placeholder="M-Pesa number, e.g. 0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  <button className="btn" disabled={pay.state === "sending"}>{pay.state === "sending" ? "Sending request…" : "Pay with M-Pesa"}</button>
                </>
              )}
              {pay.state === "timeout" && <p className="text-sm text-amber-700">We have not received a confirmation. If money left your account, wait a minute and refresh. Otherwise try again.</p>}
              {pay.msg && <p className="text-sm text-red-600">{pay.msg}</p>}
            </form>
          ) : <p className="text-sm text-slate-500">Waiting for the patient to pay the consultation fee.</p>
        ) : (
        <form onSubmit={send} className="flex gap-2">
          <input className="input" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          <button className="btn">Send</button>
        </form>
      )}
      <p className="text-xs text-slate-500">Not for emergencies. If you feel seriously unwell, call 999 or 112.</p>
    </div>
  );
}
