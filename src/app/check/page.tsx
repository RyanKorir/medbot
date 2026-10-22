"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { assess } from "@/lib/predict";
import { ALL_SYMPTOMS, symptomLabel } from "@/lib/triage";

const urgencyStyle = {
  emergency: "border-red-300 bg-red-50 text-red-800",
  soon: "border-amber-300 bg-amber-50 text-amber-800",
  routine: "border-emerald-300 bg-emerald-50 text-emerald-800",
} as const;
const urgencyText = {
  emergency: "Seek emergency care now. Call 999/112 or go to the nearest hospital.",
  soon: "See a doctor soon — within a day or two, or sooner if you get worse.",
  routine: "Likely not urgent, but book a consultation if symptoms persist.",
} as const;

export default function Check() {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [done, setDone] = useState(false);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_SYMPTOMS.filter((s) => !selected.includes(s) && symptomLabel(s).toLowerCase().includes(q)).slice(0, 12);
  }, [query, selected]);
  const result = useMemo(() => (done ? assess(selected) : null), [done, selected]);

  const toggle = (s: string) => { setDone(false); setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Symptom checker</h1>
        <p className="text-sm text-slate-600">Search and add everything you are experiencing. Three or more symptoms gives better results.</p>
      </div>

      <div className="card space-y-3">
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
          </div>
          {result.predictions.map((p, i) => (
            <div key={p.key} className="card flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{i + 1}. {p.label}</div>
                <div className="text-sm text-slate-600">Suggested specialist: {p.specialty}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">match</div>
                <div className="text-lg font-bold">{Math.round(p.probability * 100)}%</div>
                <Link className="text-sm font-medium text-brand-700 hover:underline" href={`/doctors?specialty=${encodeURIComponent(p.specialty)}`}>Find a {p.specialty} →</Link>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500">These are statistical matches from a public training dataset, not a diagnosis. Only a clinician can diagnose you.</p>
        </div>
      )}
    </div>
  );
}
