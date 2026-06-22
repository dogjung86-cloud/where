import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin";
import { getSupabaseConfig } from "@/lib/env";
import { jsonError, validationError } from "@/lib/http";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ReportRow = {
  id: string;
  created_at: string;
  details: string | null;
  match_id: string | null;
  photo_id: string;
  reason: string;
  reported_owner_id: string;
  reporter_id: string;
  reporter_ip_hash: string | null;
  reviewed_at: string | null;
  status: string;
  photos: {
    city_name: string | null;
    country_name: string | null;
    created_at: string;
    id: string;
    original_path: string;
    owner_id: string;
    processed_path: string | null;
    report_count: number;
    status: string;
    thumbnail_path: string | null;
    uploader_ip_hash: string | null;
  } | null;
};

const deletePhotoSchema = z.object({
  photoId: z.string().uuid(),
});

const updateReportSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["open", "reviewed", "dismissed", "actioned"]),
});

function compactHash(value: string | null) {
  if (!value) {
    return null;
  }

  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return jsonError("Admin wallet required", 403);
    }

    const supabase = createServiceSupabaseClient();
    const { photoBucket } = getSupabaseConfig();
    const { data, error } = await supabase
      .from("photo_reports")
      .select(
        [
          "id",
          "created_at",
          "details",
          "match_id",
          "photo_id",
          "reason",
          "reported_owner_id",
          "reporter_id",
          "reporter_ip_hash",
          "reviewed_at",
          "status",
          [
            "photos(",
            [
              "city_name",
              "country_name",
              "created_at",
              "id",
              "original_path",
              "owner_id",
              "processed_path",
              "report_count",
              "status",
              "thumbnail_path",
              "uploader_ip_hash",
            ].join(", "),
            ")",
          ].join(""),
        ].join(", "),
      )
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ReportRow[]>();

    if (error) {
      return jsonError(error.message, 500);
    }

    const reports = await Promise.all(
      (data ?? []).map(async (report) => {
        const imagePath =
          report.photos?.thumbnail_path ?? report.photos?.processed_path ?? null;
        let imageUrl: string | null = null;

        if (imagePath) {
          const { data: signedImage } = await supabase.storage
            .from(photoBucket)
            .createSignedUrl(imagePath, 60 * 30);

          imageUrl = signedImage?.signedUrl ?? null;
        }

        return {
          id: report.id,
          createdAt: report.created_at,
          details: report.details,
          matchId: report.match_id,
          photo: report.photos
            ? {
                city: report.photos.city_name ?? "Somewhere",
                country: report.photos.country_name ?? "Unknown country",
                createdAt: report.photos.created_at,
                id: report.photos.id,
                imageUrl,
                ownerId: report.photos.owner_id,
                reportCount: report.photos.report_count,
                status: report.photos.status,
                uploaderIpHash: compactHash(report.photos.uploader_ip_hash),
              }
            : null,
          photoId: report.photo_id,
          reason: report.reason,
          reportedOwnerId: report.reported_owner_id,
          reporterId: report.reporter_id,
          reporterIpHash: compactHash(report.reporter_ip_hash),
          reviewedAt: report.reviewed_at,
          status: report.status,
        };
      }),
    );

    return NextResponse.json({
      admin: {
        walletAddress: adminUser.walletAddress,
      },
      reports,
    });
  } catch (error) {
    return validationError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return jsonError("Admin wallet required", 403);
    }

    const body = updateReportSchema.parse(await request.json());
    const reviewedAt =
      body.status === "open" ? null : new Date().toISOString();
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase
      .from("photo_reports")
      .update({
        reviewed_at: reviewedAt,
        status: body.status,
      })
      .eq("id", body.reportId);

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      reportId: body.reportId,
      status: body.status,
    });
  } catch (error) {
    return validationError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return jsonError("Admin wallet required", 403);
    }

    const body = deletePhotoSchema.parse(await request.json());
    const supabase = createServiceSupabaseClient();
    const { photoBucket } = getSupabaseConfig();
    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("id, original_path, processed_path, thumbnail_path")
      .eq("id", body.photoId)
      .maybeSingle<{
        id: string;
        original_path: string;
        processed_path: string | null;
        thumbnail_path: string | null;
      }>();

    if (photoError) {
      return jsonError(photoError.message, 500);
    }

    if (!photo) {
      return jsonError("Photo not found", 404);
    }

    const paths = [
      photo.original_path,
      photo.processed_path,
      photo.thumbnail_path,
    ].filter((path): path is string => Boolean(path));

    if (paths.length) {
      const { error: storageError } = await supabase.storage
        .from(photoBucket)
        .remove(paths);

      if (storageError) {
        return jsonError(storageError.message, 500);
      }
    }

    const { error: deleteError } = await supabase
      .from("photos")
      .delete()
      .eq("id", photo.id);

    if (deleteError) {
      return jsonError(deleteError.message, 500);
    }

    return NextResponse.json({
      deletedPaths: paths.length,
      photoId: photo.id,
      status: "deleted",
    });
  } catch (error) {
    return validationError(error);
  }
}
