import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

// Server-side client with service role key — never expose to the browser
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
}

// Convenience alias
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
