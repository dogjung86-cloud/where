import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase/server";

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export async function getAuthenticatedUser(
  request: NextRequest,
): Promise<User | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    return null;
  }

  return data.user;
}
