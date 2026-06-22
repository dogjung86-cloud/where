import { NextRequest } from "next/server";

import { getGeoIpConfig, getReverseGeocodingConfig } from "@/lib/env";
import { getClientIpAddress, isPrivateIpAddress } from "@/lib/moderation/ip";

export type PhotoLocation = {
  cityName: string | null;
  regionName: string | null;
  countryCode: string | null;
  countryName: string | null;
  displayLat: number | null;
  displayLng: number | null;
  accuracyM: number | null;
  locationSource: "browser_gps" | "ip";
};

type IpWhoIsResponse = {
  success?: boolean;
  city?: unknown;
  region?: unknown;
  country?: unknown;
  country_code?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  message?: unknown;
};

type ReverseGeocodeResponse = {
  city?: unknown;
  countryCode?: unknown;
  countryName?: unknown;
  latitude?: unknown;
  locality?: unknown;
  localityInfo?: {
    administrative?: Array<{ isoCode?: unknown; name?: unknown }>;
  };
  longitude?: unknown;
  principalSubdivision?: unknown;
  principalSubdivisionCode?: unknown;
};

function readString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function roundCoordinate(value: number | null) {
  if (value === null) {
    return null;
  }

  return Number(value.toFixed(2));
}

function readRoundedCoordinate(value: number) {
  return Number(value.toFixed(2));
}

function buildGeoIpUrl(endpoint: string, ipAddress: string) {
  if (endpoint.includes("{ip}")) {
    return endpoint.replace("{ip}", encodeURIComponent(ipAddress));
  }

  const url = new URL(endpoint);
  url.searchParams.set("ip", ipAddress);
  return url.toString();
}

function buildReverseGeocodingUrl(
  endpoint: string,
  latitude: number,
  longitude: number,
) {
  if (endpoint.includes("{lat}") || endpoint.includes("{lng}")) {
    return endpoint
      .replace("{lat}", encodeURIComponent(String(latitude)))
      .replace("{lng}", encodeURIComponent(String(longitude)))
      .replace("{latitude}", encodeURIComponent(String(latitude)))
      .replace("{longitude}", encodeURIComponent(String(longitude)));
  }

  const url = new URL(endpoint);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  return url.toString();
}

function normalizeCountryName(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const countryAliases: Record<string, string> = {
    "Korea (the Republic of)": "South Korea",
    "United States of America": "United States",
  };

  return countryAliases[normalized] ?? normalized;
}

function normalizeGeoIpPayload(payload: IpWhoIsResponse): PhotoLocation | null {
  if (payload.success === false) {
    return null;
  }

  const cityName = readString(payload.city);
  const countryName = normalizeCountryName(readString(payload.country));

  if (!cityName && !countryName) {
    return null;
  }

  const latitude = readNumber(payload.latitude);
  const longitude = readNumber(payload.longitude);

  return {
    accuracyM: 50_000,
    cityName,
    countryCode: readString(payload.country_code)?.toUpperCase() ?? null,
    countryName,
    displayLat: roundCoordinate(latitude),
    displayLng: roundCoordinate(longitude),
    locationSource: "ip",
    regionName: readString(payload.region),
  };
}

function normalizeReverseGeocodePayload(
  payload: ReverseGeocodeResponse,
  latitude: number,
  longitude: number,
  accuracyM: number | null,
): PhotoLocation | null {
  const administrative = payload.localityInfo?.administrative ?? [];
  const cityName =
    readString(payload.city) ??
    readString(payload.locality) ??
    readString(payload.principalSubdivision);
  const countryName = normalizeCountryName(
    readString(payload.countryName) ??
      readString(
        administrative.find((item) => readString(item.isoCode)?.length === 2)
          ?.name,
      ),
  );

  if (!cityName && !countryName) {
    return null;
  }

  return {
    accuracyM,
    cityName,
    countryCode: readString(payload.countryCode)?.toUpperCase() ?? null,
    countryName,
    displayLat: readRoundedCoordinate(latitude),
    displayLng: readRoundedCoordinate(longitude),
    locationSource: "browser_gps",
    regionName: readString(payload.principalSubdivision),
  };
}

export async function getRequestPhotoLocation(
  request: NextRequest,
): Promise<PhotoLocation | null> {
  const ipAddress = getClientIpAddress(request);

  if (!ipAddress || isPrivateIpAddress(ipAddress)) {
    return null;
  }

  const { endpoint, timeoutMs } = getGeoIpConfig();

  if (!endpoint) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number.isFinite(timeoutMs) ? timeoutMs : 2500,
  );

  try {
    const response = await fetch(buildGeoIpUrl(endpoint, ipAddress), {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as IpWhoIsResponse;

    return normalizeGeoIpPayload(payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getReverseGeocodedPhotoLocation({
  accuracyM,
  latitude,
  longitude,
}: {
  accuracyM: number | null;
  latitude: number;
  longitude: number;
}): Promise<PhotoLocation | null> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const { endpoint, timeoutMs } = getReverseGeocodingConfig();

  if (!endpoint) {
    return null;
  }

  const roundedLatitude = readRoundedCoordinate(latitude);
  const roundedLongitude = readRoundedCoordinate(longitude);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number.isFinite(timeoutMs) ? timeoutMs : 3500,
  );

  try {
    const response = await fetch(
      buildReverseGeocodingUrl(endpoint, roundedLatitude, roundedLongitude),
      {
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ReverseGeocodeResponse;

    return normalizeReverseGeocodePayload(
      payload,
      roundedLatitude,
      roundedLongitude,
      accuracyM,
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
