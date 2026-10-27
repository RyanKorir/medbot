"use client";
import { useEffect, useRef } from "react";

// Cloudflare Turnstile (free). Inert until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; enable the same CAPTCHA in Supabase
// (Authentication -> Attack Protection) so the server checks the token too.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const captchaEnabled = Boolean(SITE_KEY);

type Turnstile = { render: (el: HTMLElement, o: Record<string, unknown>) => string };
declare global { interface Window { turnstile?: Turnstile } }

export default function Captcha({ onToken }: { onToken: (t: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let rendered = false;
    const render = () => {
      if (rendered || !window.turnstile || !ref.current) return;
      rendered = true;
      window.turnstile.render(ref.current, { sitekey: SITE_KEY, callback: (t: string) => onToken(t), "expired-callback": () => onToken(null) });
    };
    if (window.turnstile) render();
    else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true; s.onload = render;
      document.head.appendChild(s);
    }
  }, [onToken]);
  return SITE_KEY ? <div ref={ref} /> : null;
}
