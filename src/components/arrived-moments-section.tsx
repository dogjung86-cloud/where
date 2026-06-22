"use client";

import { RefreshCcw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LocationMapCard } from "@/components/location-map-card";
import { ReportPhotoButton } from "@/components/report-photo-button";
import { ShareArrivalPhoto } from "@/components/share-arrival-photo";
import { WhereUtilityButton } from "@/components/where-utility-button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type ArrivedMoment = {
  city: string;
  country: string;
  detailMap: string;
  image: string;
  map: string;
  matchId?: string;
  photoId?: string;
  starterPhotoId?: string | null;
  sourceType?: "photo" | "starter";
  region: string;
  time: string;
};

type ApiInboxMoment = {
  city: string;
  country: string;
  deliveredAt: string;
  image: string | null;
  matchId: string;
  photoId: string | null;
  starterPhotoId: string | null;
  sourceType: "photo" | "starter";
};

type AppliedArrival = {
  matchId: string;
  photoId: string | null;
  starterPhotoId: string | null;
  sourceType: "photo" | "starter";
  city: string;
  country: string;
  deliveredAt: string;
  thumbnailUrl: string | null;
};

function momentKey(moment: ArrivedMoment) {
  return moment.matchId ?? `${moment.city}-${moment.country}-${moment.time}`;
}

function formatArrivalTime(value: string) {
  const deliveredAt = new Date(value).getTime();
  const diffMs = Date.now() - deliveredAt;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  return `${Math.round(diffHours / 24)} days ago`;
}

async function getAccessToken() {
  const supabase = createBrowserSupabaseClient();

  if (!supabase) {
    throw new Error("Login is required to update your inbox.");
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("Login is required to update your inbox.");
  }

  return accessToken;
}

export function ArrivedMomentsSection({
  moments,
}: {
  moments: ArrivedMoment[];
}) {
  const router = useRouter();
  const [hiddenMomentKeys, setHiddenMomentKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveMoments, setLiveMoments] = useState<ArrivedMoment[] | null>(null);
  const [pendingDeleteMoment, setPendingDeleteMoment] =
    useState<ArrivedMoment | null>(null);
  const [utilityMoments, setUtilityMoments] = useState<ArrivedMoment[]>([]);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const mapByCity = useMemo(() => {
    return new Map(
      moments.map((moment) => [
        moment.city,
        {
          detailMap: moment.detailMap,
          map: moment.map,
          region: moment.region,
        },
      ]),
    );
  }, [moments]);

  const decorateArrival = useCallback((arrival: AppliedArrival): ArrivedMoment => {
    const mapPoint = mapByCity.get(arrival.city) ?? {
      detailMap: "/maps/simple/buenos-aires.svg",
      map: "/maps/simple/buenos-aires.svg",
      region: arrival.country,
    };

    return {
      city: arrival.city,
      country: arrival.country,
      detailMap: mapPoint.detailMap,
      image: arrival.thumbnailUrl ?? "/samples/sample-03.webp",
      map: mapPoint.map,
      matchId: arrival.matchId,
      photoId: arrival.photoId ?? undefined,
      starterPhotoId: arrival.starterPhotoId,
      sourceType: arrival.sourceType,
      region: mapPoint.region,
      time: formatArrivalTime(arrival.deliveredAt),
    };
  }, [mapByCity]);

  const loadLiveInbox = useCallback(async (accessToken?: string) => {
    const token = accessToken ?? (await getAccessToken());
    const response = await fetch("/api/photos/inbox", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      moments?: ApiInboxMoment[];
    };

    if (!response.ok) {
      throw new Error(payload.error || "Could not load inbox.");
    }

    setLiveMoments(
      (payload.moments ?? []).map((moment) =>
        decorateArrival({
          city: moment.city,
          country: moment.country,
          deliveredAt: moment.deliveredAt,
          matchId: moment.matchId,
          photoId: moment.photoId,
          starterPhotoId: moment.starterPhotoId,
          sourceType: moment.sourceType,
          thumbnailUrl: moment.image,
        }),
      ),
    );
  }, [decorateArrival]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token;

      if (!isMounted) {
        return;
      }

      if (!accessToken) {
        setLiveMoments(null);
        return;
      }

      loadLiveInbox(accessToken).catch((error: unknown) => {
        if (isMounted) {
          setStatus(
            error instanceof Error ? error.message : "Could not load inbox.",
          );
        }
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.access_token) {
          setLiveMoments(null);
          setUtilityMoments([]);
          return;
        }

        loadLiveInbox(session.access_token).catch((error: unknown) => {
          setStatus(
            error instanceof Error ? error.message : "Could not load inbox.",
          );
        });
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadLiveInbox]);

  const inboxMoments = liveMoments ?? moments;
  const visibleMoments = useMemo(
    () =>
      [...utilityMoments, ...inboxMoments].filter(
        (moment) => !hiddenMomentKeys.has(momentKey(moment)),
      ),
    [hiddenMomentKeys, inboxMoments, utilityMoments],
  );

  function hideMoment(key: string) {
    setHiddenMomentKeys((current) => new Set(current).add(key));
  }

  async function refreshInbox() {
    setIsRefreshing(true);
    setStatus("Checking for new arrivals...");

    if (liveMoments) {
      try {
        await loadLiveInbox();
        setStatus("Inbox refreshed.");
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Could not refresh inbox.",
        );
      } finally {
        setIsRefreshing(false);
      }

      return;
    }

    router.refresh();
    window.setTimeout(() => {
      setIsRefreshing(false);
      setStatus("Inbox refreshed.");
    }, 450);
  }

  async function removeFromInbox(moment: ArrivedMoment) {
    const key = momentKey(moment);

    setRemovingKey(key);
    setStatus(null);

    try {
      if (moment.matchId) {
        const accessToken = await getAccessToken();
        const response = await fetch("/api/photos/arrival", {
          body: JSON.stringify({
            matchId: moment.matchId,
          }),
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          method: "DELETE",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Could not remove this photo.");
        }
      }

      hideMoment(key);
      setLiveMoments((current) =>
        current?.filter((item) => momentKey(item) !== key) ?? current,
      );
      setPendingDeleteMoment(null);
      setStatus("Deleted from your inbox.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not remove this photo.",
      );
    } finally {
      setRemovingKey(null);
    }
  }

  function handleUtilityApplied(
    arrival: AppliedArrival,
    targetMatchId?: string,
  ) {
    const nextMoment = decorateArrival(arrival);

    setUtilityMoments((current) => [nextMoment, ...current]);

    if (targetMatchId) {
      setHiddenMomentKeys((current) => new Set(current).add(targetMatchId));
      setLiveMoments((current) =>
        current?.filter((item) => item.matchId !== targetMatchId) ?? current,
      );
    }
  }

  return (
    <section className="rounded-lg border border-[#d8d0c2] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#776e62]">Inbox</p>
          <h2 className="text-2xl font-semibold">Arrived moments</h2>
          <p className="mt-1 text-sm text-[#776e62]">
            Shy selfies, travel snaps, family moments, and quiet ordinary days
            from other cities.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WhereUtilityButton
            onApplied={handleUtilityApplied}
            onStatus={setStatus}
            utilityKey="uncollected_city"
          />
          <button
            aria-label="Refresh inbox"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#d8d0c2] text-[#171717] transition hover:border-[#171717] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRefreshing}
            onClick={refreshInbox}
            title="Refresh inbox"
            type="button"
          >
            <RefreshCcw
              className={isRefreshing ? "animate-spin" : ""}
              size={17}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {status ? (
        <p
          aria-live="polite"
          className="mb-3 rounded-lg bg-[#e2f4ee] px-3 py-2 text-sm font-medium text-[#0d6b4f]"
        >
          {status}
        </p>
      ) : null}

      {visibleMoments.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visibleMoments.map((moment) => {
            const key = momentKey(moment);
            const isRemoving = removingKey === key;

            return (
              <article
                className="overflow-hidden rounded-lg border border-[#e2dbd0] bg-[#f7f3ec]"
                key={key}
              >
                <ShareArrivalPhoto
                  city={moment.city}
                  country={moment.country}
                  image={moment.image}
                  matchId={moment.matchId}
                  photoId={moment.photoId}
                  starterPhotoId={moment.starterPhotoId}
                  sourceType={moment.sourceType}
                />
                <div className="p-3">
                  <div className="mb-2 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{moment.city}</p>
                      <p className="truncate text-xs text-[#776e62]">
                        {moment.country} - {moment.time}
                      </p>
                    </div>
                  </div>
                  <LocationMapCard
                    city={moment.city}
                    country={moment.country}
                    detailMap={moment.detailMap}
                    map={moment.map}
                    region={moment.region}
                  />
                  <div className="mt-2 flex items-center justify-end gap-1">
                    <WhereUtilityButton
                      compact
                      onApplied={handleUtilityApplied}
                      onStatus={setStatus}
                      targetMatchId={moment.matchId}
                      utilityKey="city_reroll"
                    />
                    <ShareArrivalPhoto
                      city={moment.city}
                      country={moment.country}
                      image={moment.image}
                      matchId={moment.matchId}
                      photoId={moment.photoId}
                      starterPhotoId={moment.starterPhotoId}
                      sourceType={moment.sourceType}
                      variant="icon"
                    />
                    <ReportPhotoButton
                      city={moment.city}
                      country={moment.country}
                      matchId={moment.matchId}
                      photoId={moment.photoId}
                      starterPhotoId={moment.starterPhotoId}
                      sourceType={moment.sourceType}
                    />
                    <button
                      aria-label={`Remove photo from ${moment.city}, ${moment.country} from inbox`}
                      className="grid size-8 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-[#5f574f] transition hover:border-[#171717] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isRemoving}
                      onClick={() => setPendingDeleteMoment(moment)}
                      title="Remove from inbox"
                      type="button"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#d8d0c2] bg-[#f7f3ec] px-4 py-10 text-center">
          <p className="text-sm font-semibold">No arrivals in your inbox.</p>
          <p className="mt-2 text-sm text-[#776e62]">
            Send a photo to open the next arrival.
          </p>
        </div>
      )}

      {pendingDeleteMoment ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/70 p-4"
          onClick={() => setPendingDeleteMoment(null)}
          role="dialog"
        >
          <div
            className="w-full max-w-sm rounded-lg border border-[#d8d0c2] bg-[#f7f3ec] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#776e62]">
                  Delete arrival
                </p>
                <h2 className="text-xl font-semibold">
                  {pendingDeleteMoment.city}, {pendingDeleteMoment.country}
                </h2>
              </div>
              <button
                aria-label="Close delete confirmation"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-[#171717]"
                onClick={() => setPendingDeleteMoment(null)}
                type="button"
              >
                <X size={17} strokeWidth={2} />
              </button>
            </div>

            <p className="rounded-lg bg-white px-3 py-2 text-sm leading-6 text-[#5f574f]">
              Are you sure you want to delete this photo from your inbox?
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-[#d8d0c2] bg-white px-4 text-sm font-semibold"
                onClick={() => setPendingDeleteMoment(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-lg bg-[#b84a3a] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={removingKey === momentKey(pendingDeleteMoment)}
                onClick={() => removeFromInbox(pendingDeleteMoment)}
                type="button"
              >
                {removingKey === momentKey(pendingDeleteMoment)
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
