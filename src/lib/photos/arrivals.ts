import type { SupabaseClient } from "@supabase/supabase-js";

type ArrivalCandidate = {
  id: string;
  owner_id: string;
  processed_path: string | null;
  thumbnail_path: string | null;
  city_name: string | null;
  country_name: string | null;
};

type ClaimArrivalOptions = {
  excludeCities?: string[];
  excludePhotoIds?: string[];
  requireUncollectedCity?: boolean;
};

export type ClaimedArrival = {
  matchId: string;
  photoId: string;
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
    .select("photos(city_name)")
    .eq("receiver_id", receiverId)
    .returns<Array<{ photos: { city_name: string | null } | null }>>();

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    (data ?? [])
      .map((match) => normalizeCity(match.photos?.city_name ?? null))
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
    .order("created_at", { ascending: true })
    .limit(32)
    .returns<ArrivalCandidate[]>();

  if (candidateError) {
    throw new Error(candidateError.message);
  }

  if (!candidates?.length) {
    return null;
  }

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
  const excludedPhotoIds = new Set(options.excludePhotoIds ?? []);
  const excludedCities = new Set(
    (options.excludeCities ?? []).map((city) => city.trim().toLowerCase()),
  );
  const collectedCities = options.requireUncollectedCity
    ? await getReceiverCollectedCities(supabase, receiverId)
    : new Set<string>();

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

      throw new Error(matchError?.message || "Unable to create arrival match");
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
      city: candidate.city_name ?? "Somewhere",
      country: candidate.country_name ?? "Unknown country",
      deliveredAt: matchRows[0].delivered_at,
      thumbnailUrl,
    };
  }

  return null;
}
