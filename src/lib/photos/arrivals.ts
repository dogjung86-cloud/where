import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingStarterSchemaError } from "@/lib/starter-schema";

type ArrivalCandidate = {
  id: string;
  owner_id: string;
  processed_path: string | null;
  thumbnail_path: string | null;
  city_name: string | null;
  country_name: string | null;
};

type StarterArrivalCandidate = {
  id: string;
  processed_path: string;
  thumbnail_path: string | null;
  city_name: string;
  country_name: string;
};

type ClaimArrivalOptions = {
  excludeCities?: string[];
  excludePhotoIds?: string[];
  requireUncollectedCity?: boolean;
};

export type ClaimedArrival = {
  matchId: string;
  photoId: string;
  starterPhotoId: string | null;
  sourceType: "photo" | "starter";
  city: string;
  country: string;
  deliveredAt: string;
  thumbnailUrl: string | null;
};

function normalizeCity(city: string | null) {
  return city?.trim().toLowerCase() ?? "";
}

export async function getReceiverCollectedCities(
  supabase: SupabaseClient,
  receiverId: string,
) {
  const { data, error } = await supabase
    .from("photo_matches")
    .select("photos(city_name), starter_photos(city_name)")
    .eq("receiver_id", receiverId)
    .returns<
      Array<{
        photos: { city_name: string | null } | null;
        starter_photos: { city_name: string | null } | null;
      }>
    >();

  if (error && isMissingStarterSchemaError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("photo_matches")
      .select("photos(city_name)")
      .eq("receiver_id", receiverId)
      .returns<Array<{ photos: { city_name: string | null } | null }>>();

    if (legacyError) {
      throw new Error(legacyError.message);
    }

    return new Set(
      (legacyData ?? [])
        .map((match) => normalizeCity(match.photos?.city_name ?? null))
        .filter(Boolean),
    );
  }

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    (data ?? [])
      .flatMap((match) => [
        normalizeCity(match.photos?.city_name ?? null),
        normalizeCity(match.starter_photos?.city_name ?? null),
      ])
      .filter(Boolean),
  );
}

export async function claimArrivalForReceiver(
  supabase: SupabaseClient,
  photoBucket: string,
  receiverId: string,
  options: ClaimArrivalOptions = {},
): Promise<ClaimedArrival | null> {
  const { data: candidates, error: candidateError } = await supabase
    .from("photos")
    .select(
      [
        "id",
        "owner_id",
        "processed_path",
        "thumbnail_path",
        "city_name",
        "country_name",
      ].join(", "),
    )
    .eq("status", "ready")
    .neq("owner_id", receiverId)
    .gt("expires_at", new Date().toISOString())
    .not("processed_path", "is", null)
    .not("city_name", "is", null)
    .not("country_name", "is", null)
    .order("created_at", { ascending: true })
    .limit(32)
    .returns<ArrivalCandidate[]>();

  if (candidateError) {
    throw new Error(candidateError.message);
  }

  const excludedPhotoIds = new Set(options.excludePhotoIds ?? []);
  const excludedCities = new Set(
    (options.excludeCities ?? []).map((city) => city.trim().toLowerCase()),
  );
  const collectedCities = options.requireUncollectedCity
    ? await getReceiverCollectedCities(supabase, receiverId)
    : new Set<string>();

  if (candidates?.length) {
    const candidateIds = candidates.map((candidate) => candidate.id);
    const { data: existingMatches, error: existingMatchError } = await supabase
      .from("photo_matches")
      .select("photo_id")
      .eq("receiver_id", receiverId)
      .in("photo_id", candidateIds)
      .returns<Array<{ photo_id: string }>>();

    if (existingMatchError) {
      throw new Error(existingMatchError.message);
    }

    const alreadyReceivedPhotoIds = new Set(
      (existingMatches ?? []).map((match) => match.photo_id),
    );

    for (const candidate of candidates) {
      const candidateCity = normalizeCity(candidate.city_name);

      if (
        alreadyReceivedPhotoIds.has(candidate.id) ||
        excludedPhotoIds.has(candidate.id) ||
        excludedCities.has(candidateCity) ||
        (options.requireUncollectedCity && collectedCities.has(candidateCity))
      ) {
        continue;
      }

      const { data: claimedRows, error: claimError } = await supabase
        .from("photos")
        .update({ status: "matched" })
        .eq("id", candidate.id)
        .eq("status", "ready")
        .select("id")
        .returns<Array<{ id: string }>>();

      if (claimError) {
        throw new Error(claimError.message);
      }

      if (!claimedRows?.length) {
        continue;
      }

      const { data: matchRows, error: matchError } = await supabase
        .from("photo_matches")
        .insert({
          photo_id: candidate.id,
          sender_id: candidate.owner_id,
          receiver_id: receiverId,
        })
        .select("id, delivered_at")
        .returns<Array<{ id: string; delivered_at: string }>>();

      if (matchError || !matchRows?.[0]) {
        await supabase
          .from("photos")
          .update({ status: "ready" })
          .eq("id", candidate.id);

        throw new Error(
          matchError?.message || "Unable to create arrival match",
        );
      }

      const imagePath = candidate.thumbnail_path ?? candidate.processed_path;
      let thumbnailUrl: string | null = null;

      if (imagePath) {
        const { data: signedImage } = await supabase.storage
          .from(photoBucket)
          .createSignedUrl(imagePath, 60 * 30);

        thumbnailUrl = signedImage?.signedUrl ?? null;
      }

      return {
        matchId: matchRows[0].id,
        photoId: candidate.id,
        starterPhotoId: null,
        sourceType: "photo",
        city: candidate.city_name ?? "Somewhere",
        country: candidate.country_name ?? "Unknown country",
        deliveredAt: matchRows[0].delivered_at,
        thumbnailUrl,
      };
    }
  }

  const { data: starterCandidates, error: starterCandidateError } = await supabase
    .from("starter_photos")
    .select(
      [
        "id",
        "processed_path",
        "thumbnail_path",
        "city_name",
        "country_name",
      ].join(", "),
    )
    .eq("active", true)
    .order("delivered_count", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(64)
    .returns<StarterArrivalCandidate[]>();

  if (starterCandidateError && isMissingStarterSchemaError(starterCandidateError)) {
    return null;
  }

  if (starterCandidateError) {
    throw new Error(starterCandidateError.message);
  }

  if (!starterCandidates?.length) {
    return null;
  }

  const starterCandidateIds = starterCandidates.map((candidate) => candidate.id);
  const { data: existingStarterMatches, error: existingStarterMatchError } =
    await supabase
      .from("photo_matches")
      .select("starter_photo_id")
      .eq("receiver_id", receiverId)
      .in("starter_photo_id", starterCandidateIds)
      .returns<Array<{ starter_photo_id: string | null }>>();

  if (existingStarterMatchError) {
    throw new Error(existingStarterMatchError.message);
  }

  const alreadyReceivedStarterPhotoIds = new Set(
    (existingStarterMatches ?? [])
      .map((match) => match.starter_photo_id)
      .filter((id): id is string => Boolean(id)),
  );

  for (const candidate of starterCandidates) {
    const candidateCity = normalizeCity(candidate.city_name);

    if (
      alreadyReceivedStarterPhotoIds.has(candidate.id) ||
      excludedPhotoIds.has(candidate.id) ||
      excludedCities.has(candidateCity) ||
      (options.requireUncollectedCity && collectedCities.has(candidateCity))
    ) {
      continue;
    }

    const { data: matchRows, error: matchError } = await supabase
      .from("photo_matches")
      .insert({
        photo_id: null,
        receiver_id: receiverId,
        starter_photo_id: candidate.id,
        sender_id: null,
      })
      .select("id, delivered_at")
      .returns<Array<{ id: string; delivered_at: string }>>();

    if (matchError || !matchRows?.[0]) {
      throw new Error(matchError?.message || "Unable to create starter arrival");
    }

    await supabase.rpc("increment_starter_photo_delivery", {
      starter_photo_id_input: candidate.id,
    });

    const imagePath = candidate.thumbnail_path ?? candidate.processed_path;
    let thumbnailUrl: string | null = null;

    const { data: signedImage } = await supabase.storage
      .from(photoBucket)
      .createSignedUrl(imagePath, 60 * 30);

    thumbnailUrl = signedImage?.signedUrl ?? null;

    return {
      city: candidate.city_name,
      country: candidate.country_name,
      deliveredAt: matchRows[0].delivered_at,
      matchId: matchRows[0].id,
      photoId: candidate.id,
      starterPhotoId: candidate.id,
      sourceType: "starter",
      thumbnailUrl,
    };
  }

  return null;
}
