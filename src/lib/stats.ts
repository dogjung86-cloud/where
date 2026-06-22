import { createServiceSupabaseClient } from "@/lib/supabase/server";

const ACCEPTED_PHOTO_STATUSES = ["ready", "matched", "reported", "expired"];

type ShareTargetRow = {
  target: string;
};

type CityRow = {
  city_name: string | null;
  country_name: string | null;
};

export type AppStats = {
  citiesUnlocked: number;
  deliveredArrivals: number;
  openReports: number;
  shareBreakdown: Record<string, number>;
  shares: number;
  signedUpUsers: number;
  sentPhotos: number;
};

async function getExactCount(
  table: string,
) {
  const supabase = createServiceSupabaseClient();
  const { count, error } = await supabase.from(table).select("id", {
    count: "exact",
    head: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getAcceptedPhotoCount() {
  const supabase = createServiceSupabaseClient();
  const { count, error } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .in("status", ACCEPTED_PHOTO_STATUSES);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getOpenReportCount() {
  const supabase = createServiceSupabaseClient();
  const { count, error } = await supabase
    .from("photo_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getAppStats(): Promise<AppStats> {
  const supabase = createServiceSupabaseClient();
  const [
    signedUpUsers,
    sentPhotos,
    deliveredArrivals,
    shares,
    openReports,
    cityResult,
    shareTargetsResult,
  ] = await Promise.all([
    getExactCount("profiles"),
    getAcceptedPhotoCount(),
    getExactCount("photo_matches"),
    getExactCount("share_events"),
    getOpenReportCount(),
    supabase
      .from("photos")
      .select("city_name, country_name")
      .in("status", ACCEPTED_PHOTO_STATUSES)
      .not("city_name", "is", null)
      .returns<CityRow[]>(),
    supabase.from("share_events").select("target").returns<ShareTargetRow[]>(),
  ]);

  if (cityResult.error) {
    throw new Error(cityResult.error.message);
  }

  if (shareTargetsResult.error) {
    throw new Error(shareTargetsResult.error.message);
  }

  const cityKeys = new Set(
    (cityResult.data ?? []).map(
      (row) => `${row.city_name ?? ""}|${row.country_name ?? ""}`,
    ),
  );
  const shareBreakdown = (shareTargetsResult.data ?? []).reduce<
    Record<string, number>
  >((counts, row) => {
    counts[row.target] = (counts[row.target] ?? 0) + 1;
    return counts;
  }, {});

  return {
    citiesUnlocked: cityKeys.size,
    deliveredArrivals,
    openReports,
    shareBreakdown,
    shares,
    signedUpUsers,
    sentPhotos,
  };
}
