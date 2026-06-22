const DEFAULT_WHERE_TREASURY_WALLET =
  "9DpeHu3QSr3tkr4Mr6sLiriXKnUpDhgzh7tBg3FcZxBr";
const DEFAULT_SOLANA_RPC_URL =
  "https://mainnet.helius-rpc.com/?api-key=b5e995b9-0436-4ae6-b4d8-8f7fc4798f13";

export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string, fallback = "") {
  return process.env[name] || fallback;
}

export function getSupabaseConfig() {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    photoBucket: getOptionalEnv("SUPABASE_PHOTO_BUCKET", "photos"),
  };
}

export function getWhereWalletConfig() {
  return {
    tokenMint: getOptionalEnv("WHERE_TOKEN_MINT"),
    burnWallet: getOptionalEnv("WHERE_BURN_WALLET"),
    treasuryWallet: getOptionalEnv(
      "WHERE_TREASURY_WALLET",
      DEFAULT_WHERE_TREASURY_WALLET,
    ),
    rewardsWallet: getOptionalEnv("WHERE_REWARDS_WALLET"),
    solanaRpcUrl: getOptionalEnv("SOLANA_RPC_URL", DEFAULT_SOLANA_RPC_URL),
  };
}

export function getModerationConfig() {
  return {
    ipHashSecret: getOptionalEnv(
      "IP_HASH_SECRET",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "where-local-development-ip-hash",
    ),
  };
}
