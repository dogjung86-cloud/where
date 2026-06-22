import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, validationError } from "@/lib/http";
import { getRequestIpHash } from "@/lib/moderation/ip";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const shareEventSchema = z.object({
  matchId: z.string().uuid().optional(),
  photoId: z.string().uuid().optional(),
  shareUrl: z.string().url().max(500).optional(),
  target: z.enum(["x", "instagram", "native", "copy_link", "save"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = shareEventSchema.parse(await request.json());
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.from("share_events").insert({
      match_id: body.matchId ?? null,
      photo_id: body.photoId ?? null,
      share_url: body.shareUrl ?? null,
      target: body.target,
      viewer_ip_hash: getRequestIpHash(request),
      viewer_user_agent: request.headers.get("user-agent"),
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      status: "recorded",
    });
  } catch (error) {
    return validationError(error);
  }
}
