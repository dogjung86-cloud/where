import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/env";
import { jsonError, validationError } from "@/lib/http";
import {
  claimArrivalForReceiver,
  type ClaimedArrival,
} from "@/lib/photos/arrivals";
import { getRequestPhotoLocation } from "@/lib/geoip";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { assertInboxHasSpace, inboxFullMessage } from "@/lib/where/entitlements";

export const runtime = "nodejs";

const completeUploadSchema = z.object({
  photoId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError("Authentication required", 401);
    }

    const inboxSpace = await assertInboxHasSpace(user);

    if (!inboxSpace.hasSpace) {
      return jsonError(inboxFullMessage(inboxSpace.inboxLimit), 409);
    }

    const body = completeUploadSchema.parse(await request.json());
    const supabase = createServiceSupabaseClient();
    const { photoBucket } = getSupabaseConfig();

    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("id, owner_id, original_path, status, city_name, country_name")
      .eq("id", body.photoId)
      .eq("owner_id", user.id)
      .single();

    if (photoError || !photo) {
      return jsonError("Photo not found", 404);
    }

    if (photo.status !== "awaiting_upload") {
      return jsonError("Photo is not waiting for upload completion", 409);
    }

    await supabase
      .from("photos")
      .update({ status: "processing" })
      .eq("id", photo.id);

    const { data: originalFile, error: downloadError } = await supabase.storage
      .from(photoBucket)
      .download(photo.original_path);

    if (downloadError || !originalFile) {
      await supabase
        .from("photos")
        .update({ status: "rejected" })
        .eq("id", photo.id);

      return jsonError(downloadError?.message || "Uploaded file missing", 400);
    }

    const inputBuffer = Buffer.from(await originalFile.arrayBuffer());
    const normalizedImage = sharp(inputBuffer, { failOn: "none" }).rotate();
    const processedBuffer = await normalizedImage
      .clone()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toBuffer();
    const thumbnailBuffer = await normalizedImage
      .clone()
      .resize({
        width: 400,
        height: 400,
        fit: "cover",
        withoutEnlargement: true,
      })
      .webp({ quality: 72 })
      .toBuffer();

    const processedPath = `processed/${user.id}/${photo.id}.webp`;
    const thumbnailPath = `thumbs/${user.id}/${photo.id}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(photoBucket)
      .upload(processedPath, processedBuffer, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      await supabase
        .from("photos")
        .update({ status: "rejected" })
        .eq("id", photo.id);

      return jsonError(uploadError.message, 500);
    }

    const { error: thumbnailUploadError } = await supabase.storage
      .from(photoBucket)
      .upload(thumbnailPath, thumbnailBuffer, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: true,
      });

    if (thumbnailUploadError) {
      await supabase
        .from("photos")
        .update({ status: "rejected" })
        .eq("id", photo.id);

      return jsonError(thumbnailUploadError.message, 500);
    }

    const updatePayload: Record<string, string | number | null> = {
      processed_path: processedPath,
      thumbnail_path: thumbnailPath,
      status: "ready",
      processed_at: new Date().toISOString(),
    };

    if (!photo.city_name || !photo.country_name) {
      const requestLocation = await getRequestPhotoLocation(request);

      if (requestLocation) {
        updatePayload.city_name = photo.city_name ?? requestLocation.cityName;
        updatePayload.region_name = requestLocation.regionName;
        updatePayload.country_code = requestLocation.countryCode;
        updatePayload.country_name =
          photo.country_name ?? requestLocation.countryName;
        updatePayload.location_source = "ip";
        updatePayload.display_lat = requestLocation.displayLat;
        updatePayload.display_lng = requestLocation.displayLng;
        updatePayload.accuracy_m = requestLocation.accuracyM;
      }
    }

    const { error: updateError } = await supabase
      .from("photos")
      .update(updatePayload)
      .eq("id", photo.id);

    if (updateError) {
      return jsonError(updateError.message, 500);
    }

    const arrivals: ClaimedArrival[] = [];
    const remainingInboxSpace = Math.max(
      0,
      inboxSpace.inboxLimit - inboxSpace.inboxCount,
    );
    const arrivalsToClaim = Math.min(
      inboxSpace.receiveCount,
      remainingInboxSpace,
    );

    try {
      for (let index = 0; index < arrivalsToClaim; index += 1) {
        const claimedArrival = await claimArrivalForReceiver(
          supabase,
          photoBucket,
          user.id,
        );

        if (!claimedArrival) {
          break;
        }

        arrivals.push(claimedArrival);
      }
    } catch (arrivalError) {
      console.error("Unable to claim arrival", arrivalError);
    }
    const arrival = arrivals[0] ?? null;

    return NextResponse.json({
      photoId: photo.id,
      processedPath,
      thumbnailPath,
      status: "ready",
      arrival,
      arrivals,
      arrivalStatus: arrivals.length ? "delivered" : "queued",
      inbox: {
        limit: inboxSpace.inboxLimit,
        remainingBeforeClaim: remainingInboxSpace,
      },
    });
  } catch (error) {
    return validationError(error);
  }
}
