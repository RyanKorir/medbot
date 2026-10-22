"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

export default function Nav() {
  const { me, loading } = useMe();
  const router = useRouter();

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
        {!loading && me && <Link href="/dashboard" className="hover:text-brand-700">Dashboard</Link>}
        {!loading && me && <Link href="/profile" className="hover:text-brand-700">Profile</Link>}
        {!loading && me?.role === "admin" && <Link href="/admin" className="hover:text-brand-700">Admin</Link>}
        {!loading && (me
          ? <button onClick={logout} className="btn-ghost">Log out</button>
          : <Link href="/login" className="btn-ghost">Log in</Link>)}
      </div>
    </nav>
  );
}
