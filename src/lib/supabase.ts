import { createBrowserClient } from "@supabase/ssr";

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let client: ReturnType<typeof createBrowserClient> | null = null;
export function supabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing"
    );
  }
  return client;
}
