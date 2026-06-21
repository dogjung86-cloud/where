import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/env";

export function createServiceSupabaseClient() {
  const config = getSupabaseConfig();

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
