import { createHmac } from "crypto";
import { NextRequest } from "next/server";

import { getModerationConfig } from "@/lib/env";

function normalizeIpAddress(value: string) {
  return value.trim().toLowerCase();
}

export function getClientIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return normalizeIpAddress(forwardedFor.split(",")[0] ?? "");
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return normalizeIpAddress(realIp);
  }

  const cloudflareIp = request.headers.get("cf-connecting-ip");

  if (cloudflareIp) {
    return normalizeIpAddress(cloudflareIp);
  }

  return null;
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
