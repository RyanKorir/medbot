import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medbot — check symptoms, talk to a doctor",
  description: "Free symptom checker and online consultations built for Kenya.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-brand-700">Medbot</Link>
            <div className="flex items-center gap-4 text-sm font-medium">
              <Link href="/check" className="hover:text-brand-700">Symptom checker</Link>
              <Link href="/doctors" className="hover:text-brand-700">Doctors</Link>
              <Link href="/login" className="btn-ghost">Log in</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-slate-500">
          Medbot gives general information only and is not a medical diagnosis. In an emergency call 999 or 112, or go to the nearest hospital.
        </footer>
      </body>
    </html>
  );
}
