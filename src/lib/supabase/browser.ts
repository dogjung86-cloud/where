import { createClient } from "@supabase/supabase-js";

import { cleanAsciiEnvValue } from "@/lib/env-clean";

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? cleanAsciiEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL)
    : "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? cleanAsciiEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
    },
  });
}
