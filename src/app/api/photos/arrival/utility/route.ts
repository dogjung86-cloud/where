import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/env";
import { jsonError, validationError } from "@/lib/http";
import { claimArrivalForReceiver } from "@/lib/photos/arrivals";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { assertInboxHasSpace, inboxFullMessage } from "@/lib/where/entitlements";

const arrivalUtilitySchema = z.object({
  spendId: z.string().uuid(),
  targetMatchId: z.string().uuid().optional(),
});

type SpendRow = {
  id: string;
  utility_key: string;
  status: string;
  applied_at: string | null;
};

type MatchRow = {
  id: string;
  photo_id: string;
  receiver_id: string;
  receiver_deleted_at: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError("Authentication required", 401);
    }

    const body = arrivalUtilitySchema.parse(await request.json());
    const supabase = createServiceSupabaseClient();
    const { photoBucket } = getSupabaseConfig();
    const { data: spend, error: spendError } = await supabase
      .from("where_spends")
      .select("id, utility_key, status, applied_at")
      .eq("id", body.spendId)
      .eq("user_id", user.id)
      .single<SpendRow>();

    if (spendError || !spend) {
      return jsonError("Spend not found", 404);
    }

    if (spend.status !== "confirmed") {
      return jsonError("Payment is not confirmed yet", 409);
    }

    if (spend.applied_at) {
      return jsonError("This utility was already used", 409);
    }

    if (spend.utility_key === "city_reroll") {
      if (!body.targetMatchId) {
        return jsonError("targetMatchId is required for Try another city", 400);
      }

      const { data: match, error: matchError } = await supabase
        .from("photo_matches")
        .select("id, photo_id, receiver_id, receiver_deleted_at")
        .eq("id", body.targetMatchId)
        .single<MatchRow>();

      if (matchError || !match) {
        return jsonError("Arrival not found", 404);
      }

      if (match.receiver_id !== user.id || match.receiver_deleted_at) {
        return jsonError("Arrival is not available in your inbox", 403);
      }

      const { data: currentPhoto, error: currentPhotoError } = await supabase
        .from("photos")
        .select("id, city_name")
        .eq("id", match.photo_id)
        .single<{ id: string; city_name: string | null }>();

      if (currentPhotoError || !currentPhoto) {
        return jsonError("Arrival photo not found", 404);
      }

      const arrival = await claimArrivalForReceiver(
        supabase,
        photoBucket,
        user.id,
        {
          excludeCities: currentPhoto.city_name ? [currentPhoto.city_name] : [],
          excludePhotoIds: [currentPhoto.id],
        },
      );

      if (!arrival) {
        return jsonError("No other city is available right now", 404);
      }

      const now = new Date().toISOString();
      const { error: hideError } = await supabase
        .from("photo_matches")
        .update({ receiver_deleted_at: now })
        .eq("id", match.id)
        .eq("receiver_id", user.id);

      if (hideError) {
        return jsonError(hideError.message, 500);
      }

      const { error: applyError } = await supabase
        .from("where_spends")
        .update({
          applied_at: now,
          utility_target_match_id: match.id,
        })
        .eq("id", spend.id)
        .is("applied_at", null);

      if (applyError) {
        return jsonError(applyError.message, 500);
      }

      return NextResponse.json({
        arrival,
        status: "applied",
      });
    }

    if (spend.utility_key === "uncollected_city") {
      const inboxSpace = await assertInboxHasSpace(user);

      if (!inboxSpace.hasSpace) {
        return jsonError(inboxFullMessage(inboxSpace.inboxLimit), 409);
      }

      const arrival = await claimArrivalForReceiver(
        supabase,
        photoBucket,
        user.id,
        {
          requireUncollectedCity: true,
        },
      );

      if (!arrival) {
        return jsonError("No uncollected city is available right now", 404);
      }

      const { error: applyError } = await supabase
        .from("where_spends")
        .update({
          applied_at: new Date().toISOString(),
        })
        .eq("id", spend.id)
        .is("applied_at", null);

      if (applyError) {
        return jsonError(applyError.message, 500);
      }

      return NextResponse.json({
        arrival,
        status: "applied",
      });
    }

    return jsonError("This spend cannot be applied to arrivals", 400);
  } catch (error) {
    return validationError(error);
  }
}
