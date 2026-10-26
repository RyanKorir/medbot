"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

export default function Nav() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  // Refresh the unread count every 30 seconds while signed in.
  useEffect(() => {
    if (!me) { setUnread(0); return; }
    let live = true;
    const run = async () => {
      const { data } = await supabase().rpc("my_inbox");
      if (live) setUnread(((data as { unread: number }[]) ?? []).reduce((n, r) => n + r.unread, 0));
    };
    run();
    const t = setInterval(run, 30000);
    return () => { live = false; clearInterval(t); };
  }, [me]);

  async function logout() {
    await supabase().auth.signOut();
    router.push("/");
  }

  return (
    <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <Link href="/" className="text-lg font-bold text-brand-700">Medbot</Link>
      <div className="flex items-center gap-4 text-sm font-medium">
        <Link href="/check" className="hover:text-brand-700">Symptom checker</Link>
        <Link href="/doctors" className="hover:text-brand-700">Doctors</Link>
        {!loading && me && <Link href="/dashboard" className="hover:text-brand-700">Messages{unread > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">{unread}</span>}</Link>}
        {!loading && me && <Link href="/profile" className="hover:text-brand-700">Profile</Link>}
        {!loading && me?.role === "admin" && <Link href="/admin" className="hover:text-brand-700">Admin</Link>}
        {!loading && (me
          ? <button onClick={logout} className="btn-ghost">Log out</button>
          : <Link href="/login" className="btn-ghost">Log in</Link>)}
      </div>
    </nav>
  );
}
