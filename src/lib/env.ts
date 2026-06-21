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
    treasuryWallet: getOptionalEnv("WHERE_TREASURY_WALLET"),
    rewardsWallet: getOptionalEnv("WHERE_REWARDS_WALLET"),
    solanaRpcUrl: getOptionalEnv(
      "SOLANA_RPC_URL",
      "https://api.mainnet-beta.solana.com",
    ),
  };
}
