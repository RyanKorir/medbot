"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Msg = { id: number; sender_id: string; body: string; created_at: string };

export default function Consult() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = supabase();
    let channel: ReturnType<typeof sb.channel> | null = null;
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMe(user.id);
      const { data, error } = await sb.from("messages").select("id, sender_id, body, created_at").eq("consultation_id", id).order("created_at");
      if (error) setError(error.message); else setMessages(data ?? []);
      channel = sb.channel(`consult-${id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `consultation_id=eq.${id}` },
          (payload) => setMessages((cur) => (cur.some((m) => m.id === (payload.new as Msg).id) ? cur : [...cur, payload.new as Msg])))
        .subscribe();
    })();
    return () => { if (channel) sb.removeChannel(channel); };
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

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-xl font-bold">Consultation</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="card h-[60vh] space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-slate-500">Say hello and describe how you are feeling.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === me ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === me ? "bg-brand-600 text-white" : "bg-slate-100"}`}>{m.body}</div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input className="input" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <button className="btn">Send</button>
      </form>
      <p className="text-xs text-slate-500">Not for emergencies. If you feel seriously unwell, call 999/112.</p>
    </div>
  );
}
