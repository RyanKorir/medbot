"use client";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./supabase";

export type Me = { id: string; email: string | undefined; full_name: string; role: "patient" | "doctor" | "admin" } | null;

/** Current user + profile. `loading` is true until the first check finishes. */
export function useMe() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    const sb = supabase();
    async function load() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setMe(null); setLoading(false); return; }
      const { data } = await sb.from("profiles").select("full_name, role").eq("id", user.id).single();
      setMe({ id: user.id, email: user.email, full_name: data?.full_name ?? "", role: (data?.role as "patient") ?? "patient" });
      setLoading(false);
    }
    load();
    const { data: sub } = sb.auth.onAuthStateChange(() => { load(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { me, loading };
}
