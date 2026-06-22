import type { User } from "@supabase/supabase-js";

const SOLANA_WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const WALLET_METADATA_KEYS = [
  "wallet_address",
  "walletAddress",
  "address",
  "public_key",
  "publicKey",
  "provider_id",
  "providerId",
  "sub",
];

const WEB3_PROVIDER_TOKENS = ["web3", "solana"];

export function isSolanaWalletAddress(value: string) {
  return SOLANA_WALLET_PATTERN.test(value.trim());
}

export function formatWalletAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function hasWeb3ProviderValue(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    return WEB3_PROVIDER_TOKENS.some((token) => normalized.includes(token));
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasWeb3ProviderValue(entry));
  }

  return false;
}

function findWalletAddress(
  record: Record<string, unknown> | null,
  depth = 0,
): string | null {
  if (!record) {
    return null;
  }

  for (const key of WALLET_METADATA_KEYS) {
    const value = readString(record, key);

    if (value && isSolanaWalletAddress(value)) {
      return value;
    }
  }

  if (depth > 3) {
    return null;
  }

  for (const value of Object.values(record)) {
    if (typeof value === "string" && isSolanaWalletAddress(value)) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string" && isSolanaWalletAddress(entry)) {
          return entry.trim();
        }

        const nestedEntry = findWalletAddress(asRecord(entry), depth + 1);

        if (nestedEntry) {
          return nestedEntry;
        }
      }
    }

    const nestedValue = findWalletAddress(asRecord(value), depth + 1);

    if (nestedValue) {
      return nestedValue;
    }
  }

  return null;
}

function isSolanaWeb3Record(record: Record<string, unknown> | null) {
  if (!record) {
    return false;
  }

  return (
    hasWeb3ProviderValue(record.provider) ||
    hasWeb3ProviderValue(record.provider_id) ||
    hasWeb3ProviderValue(record.providerId) ||
    hasWeb3ProviderValue(record.chain) ||
    hasWeb3ProviderValue(record.providers)
  );
}

export function getVerifiedSolanaWalletAddress(user: User) {
  for (const identity of user.identities ?? []) {
    const identityRecord = asRecord(identity);
    const identityData = asRecord(identity.identity_data);
    const walletAddress =
      findWalletAddress(identityData) ?? findWalletAddress(identityRecord);

    if (
      walletAddress &&
      (hasWeb3ProviderValue(identity.provider) ||
        isSolanaWeb3Record(identityData) ||
        isSolanaWeb3Record(identityRecord))
    ) {
      return walletAddress;
    }
  }

  const userMetadata = asRecord(user.user_metadata);
  const userWalletAddress = findWalletAddress(userMetadata);

  if (userWalletAddress && isSolanaWeb3Record(userMetadata)) {
    return userWalletAddress;
  }

  const appMetadata = asRecord(user.app_metadata);
  const appWalletAddress = findWalletAddress(appMetadata);
  const hasWeb3Provider =
    isSolanaWeb3Record(appMetadata) || isSolanaWeb3Record(userMetadata);

  if (hasWeb3Provider) {
    return userWalletAddress ?? appWalletAddress;
  }

  return null;
}

export function getUserDisplayName(user: User) {
  const metadata = asRecord(user.user_metadata);

  return (
    readString(metadata ?? {}, "full_name") ??
    readString(metadata ?? {}, "name") ??
    readString(metadata ?? {}, "display_name") ??
    user.email ??
    getVerifiedSolanaWalletAddress(user) ??
    null
  );
}
