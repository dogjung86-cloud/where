import { createHmac } from "crypto";
import { isIP } from "net";
import { NextRequest } from "next/server";

import { getModerationConfig } from "@/lib/env";

function normalizeIpAddress(value: string) {
  return value.trim().toLowerCase();
}

function normalizeForwardedIpCandidate(value: string) {
  let candidate = value.trim().toLowerCase();

  if (!candidate) {
    return null;
  }

  if (candidate.startsWith("for=")) {
    candidate = candidate.slice(4);
  }

  candidate = candidate.replace(/^"|"$/g, "");

  if (candidate.startsWith("[")) {
    const closingBracket = candidate.indexOf("]");

    if (closingBracket > 0) {
      candidate = candidate.slice(1, closingBracket);
    }
  } else {
    const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);

    if (ipv4WithPort?.[1]) {
      candidate = ipv4WithPort[1];
    }
  }

  if (candidate.startsWith("::ffff:")) {
    const mappedIpv4 = candidate.slice("::ffff:".length);

    if (isIP(mappedIpv4)) {
      candidate = mappedIpv4;
    }
  }

  return isIP(candidate) ? candidate : null;
}

function splitHeaderCandidates(value: string) {
  return value
    .split(",")
    .flatMap((entry) => entry.split(";"))
    .map(normalizeForwardedIpCandidate)
    .filter((candidate): candidate is string => Boolean(candidate));
}

export function isPrivateIpAddress(ipAddress: string) {
  const normalized = normalizeForwardedIpCandidate(ipAddress);

  if (!normalized) {
    return true;
  }

  if (normalized.includes(":")) {
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  const octets = normalized.split(".").map((part) => Number(part));

  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export function getClientIpCandidates(request: NextRequest) {
  const orderedHeaderNames = [
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
    "x-client-ip",
    "x-forwarded-for",
    "x-vercel-forwarded-for",
    "fastly-client-ip",
    "x-railway-edge-ip",
    "forwarded",
  ];
  const candidates: string[] = [];

  for (const headerName of orderedHeaderNames) {
    const headerValue = request.headers.get(headerName);

    if (!headerValue) {
      continue;
    }

    candidates.push(...splitHeaderCandidates(headerValue));
  }

  return Array.from(new Set(candidates));
}

export function getClientIpAddress(request: NextRequest) {
  const candidates = getClientIpCandidates(request);

  return (
    candidates.find((candidate) => !isPrivateIpAddress(candidate)) ??
    candidates[0] ??
    null
  );
}

export function hashIpAddress(ipAddress: string) {
  const { ipHashSecret } = getModerationConfig();

  return createHmac("sha256", ipHashSecret)
    .update(normalizeIpAddress(ipAddress))
    .digest("hex");
}

export function getRequestIpHash(request: NextRequest) {
  const ipAddress = getClientIpAddress(request);

  if (!ipAddress) {
    return null;
  }

  return hashIpAddress(ipAddress);
}
