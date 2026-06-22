import type { User } from "@supabase/supabase-js";

const SOLANA_WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const WALLET_METADATA_KEYS = [
  "wallet_address",
  "walletAddress",
  "address",
  "public_key",
  "publicKey",
  "sub",
];

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

function findWalletAddress(record: Record<string, unknown> | null) {
  if (!record) {
    return null;
  }

  for (const key of WALLET_METADATA_KEYS) {
    const value = readString(record, key);

    if (value && isSolanaWalletAddress(value)) {
      return value;
    }
  }

  return null;
}

function isSolanaWeb3Record(record: Record<string, unknown> | null) {
  if (!record) {
    return false;
  }

  const provider = readString(record, "provider")?.toLowerCase();
  const chain = readString(record, "chain")?.toLowerCase();

  return provider === "web3" || chain === "solana";
}

export function getVerifiedSolanaWalletAddress(user: User) {
  for (const identity of user.identities ?? []) {
    const provider = identity.provider?.toLowerCase();
    const identityData = asRecord(identity.identity_data);

    if (provider === "web3" || isSolanaWeb3Record(identityData)) {
      const walletAddress = findWalletAddress(identityData);

      if (walletAddress) {
        return walletAddress;
      }
    }
  }

  const userMetadata = asRecord(user.user_metadata);

  if (isSolanaWeb3Record(userMetadata)) {
    const walletAddress = findWalletAddress(userMetadata);

    if (walletAddress) {
      return walletAddress;
    }
  }

  const appMetadata = asRecord(user.app_metadata);
  const providers = appMetadata?.providers;
  const hasWeb3Provider =
    readString(appMetadata ?? {}, "provider") === "web3" ||
    (Array.isArray(providers) && providers.includes("web3"));

  if (hasWeb3Provider) {
    return findWalletAddress(userMetadata) ?? findWalletAddress(appMetadata);
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
