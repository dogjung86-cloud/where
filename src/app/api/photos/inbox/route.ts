import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/env";
import { jsonError, validationError } from "@/lib/http";
import { isMissingStarterSchemaError } from "@/lib/starter-schema";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getInboxUsage, getUserWhereEntitlements } from "@/lib/where/entitlements";

type InboxMatchRow = {
  id: string;
  delivered_at: string;
  photo_id: string | null;
  starter_photo_id: string | null;
  photos: {
    id: string;
    city_name: string | null;
    country_name: string | null;
    processed_path: string | null;
    thumbnail_path: string | null;
  } | null;
  starter_photos: {
    id: string;
    city_name: string;
    country_name: string;
    processed_path: string;
    thumbnail_path: string | null;
  } | null;
};

type LegacyInboxMatchRow = Omit<
  InboxMatchRow,
  "starter_photo_id" | "starter_photos"
>;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError("Authentication required", 401);
    }

    const supabase = createServiceSupabaseClient();
    const { photoBucket } = getSupabaseConfig();
    const [entitlements, inboxCount] = await Promise.all([
      getUserWhereEntitlements(user),
      getInboxUsage(user.id),
    ]);
    const inboxResult = await supabase
      .from("photo_matches")
      .select(
        [
          "id",
          "delivered_at",
          "photo_id",
          "starter_photo_id",
          "photos(id, city_name, country_name, processed_path, thumbnail_path)",
          "starter_photos(id, city_name, country_name, processed_path, thumbnail_path)",
        ].join(", "),
      )
      .eq("receiver_id", user.id)
      .is("receiver_deleted_at", null)
      .order("delivered_at", { ascending: false })
      .limit(50)
      .returns<InboxMatchRow[]>();
    let data = inboxResult.data;
    let error = inboxResult.error;

    if (error && isMissingStarterSchemaError(error)) {
      const legacyInboxResult = await supabase
        .from("photo_matches")
        .select(
          [
            "id",
            "delivered_at",
            "photo_id",
            "photos(id, city_name, country_name, processed_path, thumbnail_path)",
          ].join(", "),
        )
        .eq("receiver_id", user.id)
        .is("receiver_deleted_at", null)
        .order("delivered_at", { ascending: false })
        .limit(50)
        .returns<LegacyInboxMatchRow[]>();

      data =
        legacyInboxResult.data?.map((match) => ({
          ...match,
          starter_photo_id: null,
          starter_photos: null,
        })) ?? null;
      error = legacyInboxResult.error;
    }

    if (error) {
      return jsonError(error.message, 500);
    }

    const moments = await Promise.all(
      (data ?? []).map(async (match) => {
        const source = match.photos ?? match.starter_photos;
        const imagePath =
          source?.thumbnail_path ?? source?.processed_path ?? null;
        let image: string | null = null;

        if (imagePath) {
          const { data: signedImage } = await supabase.storage
            .from(photoBucket)
            .createSignedUrl(imagePath, 60 * 30);

          image = signedImage?.signedUrl ?? null;
        }

        return {
          city: source?.city_name ?? "Somewhere",
          country: source?.country_name ?? "Unknown country",
          deliveredAt: match.delivered_at,
          image,
          matchId: match.id,
          photoId: match.photo_id ?? match.starter_photo_id,
          starterPhotoId: match.starter_photo_id,
          sourceType: match.starter_photo_id ? "starter" : "photo",
        };
      }),
    );

    return NextResponse.json({
      inbox: {
        count: inboxCount,
        limit: entitlements.inboxLimit,
        receiveCount: entitlements.receiveCount,
        tierName: entitlements.tierName,
        whereBalance: entitlements.whereBalance,
      },
      moments,
    });
  } catch (error) {
    return validationError(error);
  }
}
