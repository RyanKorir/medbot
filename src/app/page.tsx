import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4 py-6">
        <h1 className="text-4xl font-bold tracking-tight">Not feeling well? Start here.</h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Tell Medbot your symptoms, see what they could point to and how urgent they are, then chat with a verified doctor — all in one place.
        </p>
        <div className="flex gap-3">
          <Link href="/check" className="btn">Check my symptoms</Link>
          <Link href="/doctors" className="btn-ghost">Find a doctor</Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Private by design", "Your symptom check runs in your browser. Nothing is sent anywhere until you choose to consult a doctor."],
          ["Urgency first", "Warning signs like chest pain or breathlessness trigger an emergency alert before anything else."],
          ["Right specialist", "Results point you to the right kind of doctor, then you can chat with them securely."],
        ].map(([t, d]) => (
          <div key={t} className="card"><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></div>
        ))}
      </section>
    </div>
  );
}
