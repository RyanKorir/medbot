export default function SetupNotice() {
  return (
    <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900">
      Supabase is not configured yet. Copy <code>.env.example</code> to <code>.env.local</code>, add your free Supabase URL and anon key, and run <code>supabase/schema.sql</code> in the SQL editor.
    </div>
  );
}
