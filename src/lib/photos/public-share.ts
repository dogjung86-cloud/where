import { cache } from "react";

import { getOptionalEnv, getSupabaseConfig } from "@/lib/env";
import { isMissingStarterSchemaError } from "@/lib/starter-schema";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type ShareMatchRow = {
  id: string;
  delivered_at: string;
  receiver_deleted_at: string | null;
  starter_photo_id: string | null;
  photos: {
    city_name: string | null;
    country_name: string | null;
    processed_path: string | null;
    thumbnail_path: string | null;
  } | null;
  starter_photos: {
    city_name: string;
    country_name: string;
    processed_path: string;
    thumbnail_path: string | null;
  } | null;
};

type LegacyShareMatchRow = Omit<
  ShareMatchRow,
  "starter_photo_id" | "starter_photos"
>;

export type PublicShareArrival = {
  city: string;
  country: string;
  deliveredAt: string;
  imagePath: string;
  imageUrl: string;
  matchId: string;
  ogImageUrl: string;
  shareUrl: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getPublicAppUrl() {
  return getOptionalEnv("NEXT_PUBLIC_APP_URL", "https://playwhere.xyz").replace(
    /\/$/,
    "",
  );
}

export const getPublicShareArrival = cache(
  async (matchId: string): Promise<PublicShareArrival | null> => {
    if (!UUID_PATTERN.test(matchId)) {
      return null;
    }

    const supabase = createServiceSupabaseClient();
    const { photoBucket } = getSupabaseConfig();
    const shareResult = await supabase
      .from("photo_matches")
      .select(
        [
          "id",
          "delivered_at",
          "receiver_deleted_at",
          "starter_photo_id",
          "photos(city_name, country_name, processed_path, thumbnail_path)",
          "starter_photos(city_name, country_name, processed_path, thumbnail_path)",
        ].join(", "),
      )
      .eq("id", matchId)
      .is("receiver_deleted_at", null)
      .maybeSingle<ShareMatchRow>();
    let data = shareResult.data;
    let error = shareResult.error;

    if (error && isMissingStarterSchemaError(error)) {
      const legacyShareResult = await supabase
        .from("photo_matches")
        .select(
          [
            "id",
            "delivered_at",
            "receiver_deleted_at",
            "photos(city_name, country_name, processed_path, thumbnail_path)",
          ].join(", "),
        )
        .eq("id", matchId)
        .is("receiver_deleted_at", null)
        .maybeSingle<LegacyShareMatchRow>();

      data = legacyShareResult.data
        ? {
            ...legacyShareResult.data,
            starter_photo_id: null,
            starter_photos: null,
          }
        : null;
      error = legacyShareResult.error;
    }

    if (error || !data) {
      return null;
    }

    const source = data.photos ?? data.starter_photos;

    if (!source) {
      return null;
    }

    const imagePath = source.processed_path ?? source.thumbnail_path;

    if (!imagePath) {
      return null;
    }

    const { data: signedImage } = await supabase.storage
      .from(photoBucket)
      .createSignedUrl(imagePath, 60 * 60 * 24 * 7);

    if (!signedImage?.signedUrl) {
      return null;
    }

    return {
      city: source.city_name ?? "Somewhere",
      country: source.country_name ?? "Unknown country",
      deliveredAt: data.delivered_at,
      imagePath,
      imageUrl: signedImage.signedUrl,
      matchId: data.id,
      ogImageUrl: `${getPublicAppUrl()}/api/og/share/${data.id}`,
      shareUrl: `${getPublicAppUrl()}/share/${data.id}`,
    };
  },
);
