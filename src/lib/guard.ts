"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Front-end friction for bots and casual guessing. This is NOT the real protection (an attacker can skip the page and call
// the API directly); the real protection is database rules, Supabase rate limits and CAPTCHA. It slows scripts that drive the form.
type State = { count: number; until: number };
const key = (form: string) => `medbot_attempts:${form}`;
const read = (form: string): State => { try { return JSON.parse(localStorage.getItem(key(form)) ?? "") as State; } catch { return { count: 0, until: 0 }; } };

export function reportTrap(kind: string, detail?: string) {
  try { fetch("/api/trap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, detail }), keepalive: true }); } catch { /* ignore */ }
}

export function useAttemptGuard(form: string) {
  const [wait, setWait] = useState(0);
  const shown = useRef(Date.now());

  useEffect(() => {
    const tick = () => setWait(Math.max(0, Math.ceil((read(form).until - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [form]);

  /** True when the form was submitted faster than a human could fill it in. */
  const tooFast = useCallback(() => Date.now() - shown.current < 1500, []);
  /** Call after a failed attempt: 3 free tries, then 30s, 60s, 2m ... up to 15 minutes. */
  const fail = useCallback(() => {
    const s = read(form);
    const count = (s.count || 0) + 1;
    const delay = count >= 3 ? Math.min(900, 30 * 2 ** (count - 3)) : 0;
    try { localStorage.setItem(key(form), JSON.stringify({ count, until: delay ? Date.now() + delay * 1000 : 0 })); } catch { /* private mode */ }
    setWait(delay);
  }, [form]);
  const ok = useCallback(() => { try { localStorage.removeItem(key(form)); } catch { /* ignore */ } setWait(0); }, [form]);

  return { wait, tooFast, fail, ok };
}
