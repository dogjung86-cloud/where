import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/env";
import { jsonError, validationError } from "@/lib/http";
import { getRequestIpHash } from "@/lib/moderation/ip";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { assertInboxHasSpace, inboxFullMessage } from "@/lib/where/entitlements";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const signedUploadSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]),
  byteSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  cityName: z.string().trim().min(1).max(120).optional(),
  regionName: z.string().trim().min(1).max(120).optional(),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
  countryName: z.string().trim().min(1).max(120).optional(),
  locationSource: z
    .enum(["ip", "browser_gps", "photo_exif", "manual"])
    .default("ip"),
  displayLat: z.number().min(-90).max(90).optional(),
  displayLng: z.number().min(-180).max(180).optional(),
  accuracyM: z.number().int().positive().max(100_000).optional(),
});

function extensionForContentType(contentType: string) {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  if (contentType === "image/heic") {
    return "heic";
  }

  return "jpg";
}

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

    const body = signedUploadSchema.parse(await request.json());
    const supabase = createServiceSupabaseClient();
    const { photoBucket } = getSupabaseConfig();
    const uploaderIpHash = getRequestIpHash(request);

    if (uploaderIpHash) {
      const { data: bannedIp, error: bannedIpError } = await supabase
        .from("banned_ip_hashes")
        .select("ip_hash, expires_at")
        .eq("ip_hash", uploaderIpHash)
        .maybeSingle();

      if (bannedIpError) {
        return jsonError(bannedIpError.message, 500);
      }

      if (
        bannedIp &&
        (!bannedIp.expires_at || new Date(bannedIp.expires_at) > new Date())
      ) {
        return jsonError("This network is blocked from uploading photos.", 403);
      }
    }

    const photoId = crypto.randomUUID();
    const extension = extensionForContentType(body.contentType);
    const storagePath = `incoming/${user.id}/${photoId}.${extension}`;

    const { error: insertError } = await supabase.from("photos").insert({
      id: photoId,
      owner_id: user.id,
      storage_bucket: photoBucket,
      original_path: storagePath,
      status: "awaiting_upload",
      content_type: body.contentType,
      byte_size: body.byteSize,
      city_name: body.cityName ?? null,
      region_name: body.regionName ?? null,
      country_code: body.countryCode ?? null,
      country_name: body.countryName ?? null,
      location_source: body.locationSource,
      display_lat: body.displayLat ?? null,
      display_lng: body.displayLng ?? null,
      accuracy_m: body.accuracyM ?? null,
      uploader_ip_hash: uploaderIpHash,
      uploader_user_agent: request.headers.get("user-agent"),
    });

    if (insertError) {
      return jsonError(insertError.message, 500);
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from(photoBucket)
      .createSignedUploadUrl(storagePath);

    if (signedUrlError) {
      return jsonError(signedUrlError.message, 500);
    }

    return NextResponse.json({
      photoId,
      bucket: photoBucket,
      path: storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  } catch (error) {
    return validationError(error);
  }
}
