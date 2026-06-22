import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { jsonError, validationError } from "@/lib/http";
import { getRequestIpHash } from "@/lib/moderation/ip";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const reportPhotoSchema = z.object({
  details: z.string().trim().max(500).optional(),
  matchId: z.string().uuid().optional(),
  photoId: z.string().uuid(),
  reason: z.enum(["sexual", "abuse", "gore", "spam", "other"]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError("Authentication required", 401);
    }

    const body = reportPhotoSchema.parse(await request.json());
    const supabase = createServiceSupabaseClient();

    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("id, owner_id, report_count, status")
      .eq("id", body.photoId)
      .single();

    if (photoError || !photo) {
      return jsonError("Photo not found", 404);
    }

    if (photo.owner_id === user.id) {
      return jsonError("You cannot report your own photo", 400);
    }

    let matchQuery = supabase
      .from("photo_matches")
      .select("id")
      .eq("photo_id", photo.id)
      .eq("receiver_id", user.id);

    if (body.matchId) {
      matchQuery = matchQuery.eq("id", body.matchId);
    }

    const { data: match, error: matchError } = await matchQuery.maybeSingle();

    if (matchError) {
      return jsonError(matchError.message, 500);
    }

    if (!match) {
      return jsonError("Only receivers can report an arrived photo", 403);
    }

    const { data: report, error: reportError } = await supabase
      .from("photo_reports")
      .insert({
        details: body.details ?? null,
        match_id: match.id,
        photo_id: photo.id,
        reason: body.reason,
        reported_owner_id: photo.owner_id,
        reporter_id: user.id,
        reporter_ip_hash: getRequestIpHash(request),
      })
      .select("id")
      .single();

    if (reportError) {
      if (reportError.code === "23505") {
        return jsonError("You already reported this photo", 409);
      }

      return jsonError(reportError.message, 500);
    }

    const { count, error: countError } = await supabase
      .from("photo_reports")
      .select("id", { count: "exact", head: true })
      .eq("photo_id", photo.id);

    if (countError) {
      return jsonError(countError.message, 500);
    }

    const reportCount = count ?? photo.report_count + 1;
    const { error: updatePhotoError } = await supabase
      .from("photos")
      .update({
        report_count: reportCount,
        status: "reported",
      })
      .eq("id", photo.id);

    if (updatePhotoError) {
      return jsonError(updatePhotoError.message, 500);
    }

    await supabase
      .from("photo_matches")
      .update({ reported_at: new Date().toISOString() })
      .eq("id", match.id);

    return NextResponse.json({
      reportId: report.id,
      reportCount,
      status: "reported",
    });
  } catch (error) {
    return validationError(error);
  }
}
