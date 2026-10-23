"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { assess, type AgeGroup } from "@/lib/predict";
import { ALL_SYMPTOMS, symptomLabel } from "@/lib/triage";

const urgencyStyle = {
  emergency: "border-red-300 bg-red-50 text-red-800",
  soon: "border-amber-300 bg-amber-50 text-amber-800",
  routine: "border-emerald-300 bg-emerald-50 text-emerald-800",
} as const;
const urgencyText = {
  emergency: "Seek emergency care now. Call 999 or 112, or go to the nearest hospital.",
  soon: "See a doctor soon: within a day or two, or sooner if you get worse.",
  routine: "Likely not urgent, but book a consultation if symptoms persist.",
} as const;

export default function Check() {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [done, setDone] = useState(false);
  const [age, setAge] = useState<AgeGroup>("");
  const [sex, setSex] = useState("");

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_SYMPTOMS.filter((s) => !selected.includes(s) && symptomLabel(s).toLowerCase().includes(q)).slice(0, 12);
  }, [query, selected]);
  const result = useMemo(() => (done ? assess(selected, age) : null), [done, selected, age]);

  // Keep the latest check so it can be attached to a consultation (the doctor starts with a summary, not a blank chat).
  useEffect(() => {
    if (!result || result.predictions.length === 0) return;
    try {
      sessionStorage.setItem("medbot_check", JSON.stringify({
        symptoms: selected, top_prediction: result.predictions[0].label, urgency: result.urgency,
        age_group: age || null, sex: sex || null,
      }));
    } catch { /* storage unavailable: the check still works */ }
  }, [result, selected, age, sex]);

  const toggle = (s: string) => { setDone(false); setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])); };

  const shareText = result && result.predictions.length
    ? `Medbot symptom check: ${selected.map(symptomLabel).join(", ")}. Possible: ${result.predictions.map((p) => p.label).join(", ")}. Urgency: ${result.urgency}. Not a diagnosis. https://medbot-xi-one.vercel.app/check`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Symptom checker</h1>
        <p className="text-sm text-slate-600">Add everything you are experiencing. Three or more symptoms gives better results.</p>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select className="input" value={age} onChange={(e) => { setAge(e.target.value as AgeGroup); setDone(false); }}>
            <option value="">Age group (optional)</option>
            <option value="child">Under 5</option>
            <option value="adult">5 to 64</option>
            <option value="senior">65 or older</option>
          </select>
          <select className="input" value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">Sex (optional)</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
        <input className="input" placeholder="Type a symptom, e.g. headache, cough, fever…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {options.map((s) => (
            <button key={s} onClick={() => toggle(s)} className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-brand-50">+ {symptomLabel(s)}</button>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {selected.map((s) => (
              <button key={s} onClick={() => toggle(s)} className="rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-700">{symptomLabel(s)} ✕</button>
            ))}
          </div>
        )}
        <button className="btn" disabled={selected.length === 0} onClick={() => setDone(true)}>See possible causes</button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-4 text-sm font-medium ${urgencyStyle[result.urgency]}`}>
            {urgencyText[result.urgency]}
            {result.redFlags.length > 0 && <div className="mt-1 font-normal">Warning signs selected: {result.redFlags.map(symptomLabel).join(", ")}.</div>}
            {result.ageBumped && <div className="mt-1 font-normal">Raised one level because of the age group you chose: young children and older adults can get worse faster.</div>}
          </div>

          {result.lowConfidence && (
            <div className="rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-700">
              <strong>Not enough information for a reliable match.</strong> Add more symptoms, or talk to a doctor who can ask you questions. Treat the list below as tentative.
            </div>
          )}

          <div className={result.lowConfidence ? "space-y-4 opacity-70" : "space-y-4"}>
            {result.predictions.map((p, i) => (
              <div key={p.key} className="card flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{i + 1}. {p.label}{p.cantMiss && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 align-middle text-xs font-semibold text-red-700">Serious: needs ruling out</span>}</div>
                  <div className="text-sm text-slate-600">Suggested specialist: {p.specialty}</div>
                </div>
                <div className="text-right">
                  {p.cantMiss ? <div className="text-sm font-semibold text-red-700">Ask a doctor</div> : (<>
                    <div className="text-sm text-slate-500">match</div>
                    <div className="text-lg font-bold">{Math.round(p.probability * 100)}%</div>
                  </>)}
                  <Link className="text-sm font-medium text-brand-700 hover:underline" href={`/doctors?specialty=${encodeURIComponent(p.specialty)}`}>Talk to a {p.specialty} →</Link>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="btn" href={`/doctors?specialty=${encodeURIComponent(result.predictions[0]?.specialty ?? "")}`}>Share this check with a doctor</Link>
            <a className="btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>Share on WhatsApp</a>
          </div>
        </div>
      )}

      <details className="card text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-800">About this checker, and its limits</summary>
        <div className="mt-2 space-y-2">
          <p>It compares your symptoms with a public dataset of 41 conditions, including malaria, typhoid, tuberculosis and HIV, and weighs each by how common it is in Kenyan outpatient care (KNBS health statistics). A serious condition that your symptoms fit is always shown, even if a common one ranks higher. It is a statistical tool, not a doctor, and it was not clinically validated on Kenyan patients.</p>
          <p>Studies of symptom checkers found they sometimes under-estimate urgency, so Medbot errs on the side of caution. It does not cover every condition, such as cholera or measles. If you feel seriously unwell, ignore the results and get care.</p>
          <p>Your symptoms stay in your browser until you choose to share them with a doctor.</p>
        </div>
      </details>
    </div>
  );
}
