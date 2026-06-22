import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { jsonError, validationError } from "@/lib/http";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const deleteArrivalSchema = z.object({
  matchId: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError("Authentication required", 401);
    }

    const body = deleteArrivalSchema.parse(await request.json());
    const supabase = createServiceSupabaseClient();
    const { data: match, error: matchError } = await supabase
      .from("photo_matches")
      .select("id, photo_id, receiver_id")
      .eq("id", body.matchId)
      .maybeSingle();

    if (matchError) {
      return jsonError(matchError.message, 500);
    }

    if (!match) {
      return jsonError("Arrival not found", 404);
    }

    if (match.receiver_id !== user.id) {
      return jsonError("Only the receiver can remove this arrival", 403);
    }

    const { error: deleteError } = await supabase
      .from("photo_matches")
      .delete()
      .eq("id", match.id)
      .eq("receiver_id", user.id);

    if (deleteError) {
      return jsonError(deleteError.message, 500);
    }

    if (match.photo_id) {
      await supabase
        .from("photos")
        .update({ status: "expired" })
        .eq("id", match.photo_id)
        .eq("status", "matched");
    }

    return NextResponse.json({
      status: "deleted",
    });
  } catch (error) {
    return validationError(error);
  }
}
