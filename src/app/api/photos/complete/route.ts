import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/env";
import { jsonError, validationError } from "@/lib/http";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

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

    const body = completeUploadSchema.parse(await request.json());
    const supabase = createServiceSupabaseClient();
    const { photoBucket } = getSupabaseConfig();

    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("id, owner_id, original_path, status")
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
    const processedBuffer = await sharp(inputBuffer, { failOn: "none" })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toBuffer();

    const processedPath = `processed/${user.id}/${photo.id}.webp`;
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

    const { error: updateError } = await supabase
      .from("photos")
      .update({
        processed_path: processedPath,
        status: "ready",
        processed_at: new Date().toISOString(),
      })
      .eq("id", photo.id);

    if (updateError) {
      return jsonError(updateError.message, 500);
    }

    return NextResponse.json({
      photoId: photo.id,
      processedPath,
      status: "ready",
    });
  } catch (error) {
    return validationError(error);
  }
}
