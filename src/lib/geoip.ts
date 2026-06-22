import { NextRequest } from "next/server";

import { getGeoIpConfig } from "@/lib/env";
import { getClientIpAddress } from "@/lib/moderation/ip";

export type PhotoLocation = {
  cityName: string | null;
  regionName: string | null;
  countryCode: string | null;
  countryName: string | null;
  displayLat: number | null;
  displayLng: number | null;
  accuracyM: number | null;
  locationSource: "ip";
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

const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80:/i,
];

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

function isPrivateIpAddress(ipAddress: string) {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ipAddress));
}

function roundCoordinate(value: number | null) {
  if (value === null) {
    return null;
  }

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

function normalizeGeoIpPayload(payload: IpWhoIsResponse): PhotoLocation | null {
  if (payload.success === false) {
    return null;
  }

  const cityName = readString(payload.city);
  const countryName = readString(payload.country);

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
