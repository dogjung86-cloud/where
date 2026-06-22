import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { getVerifiedSolanaWalletAddress } from "@/lib/auth-profile";
import { getOptionalEnv } from "@/lib/env";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const DEFAULT_ADMIN_WALLET = "EaBSiRk9WaeBcw6K2pphsgEeBSxU24smuyvH2oLr4iiC";

export type AdminUser = {
  user: User;
  walletAddress: string;
};

function getAdminWallets() {
  return getOptionalEnv("SOMEWHERE_ADMIN_WALLETS", DEFAULT_ADMIN_WALLET)
    .split(",")
    .map((wallet) => wallet.trim())
    .filter(Boolean);
}

export function isAdminWalletAddress(walletAddress: string | null | undefined) {
  if (!walletAddress) {
    return false;
  }

  return getAdminWallets().includes(walletAddress.trim());
}

async function getProfileWalletAddress(userId: string) {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", userId)
    .maybeSingle<{ wallet_address: string | null }>();

  return data?.wallet_address ?? null;
}

export async function getAdminUser(
  request: NextRequest,
): Promise<AdminUser | null> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return null;
  }

  const verifiedWallet = getVerifiedSolanaWalletAddress(user);

  if (verifiedWallet && isAdminWalletAddress(verifiedWallet)) {
    return {
      user,
      walletAddress: verifiedWallet,
    };
  }

  const profileWallet = await getProfileWalletAddress(user.id);

  if (profileWallet && isAdminWalletAddress(profileWallet)) {
    return {
      user,
      walletAddress: profileWallet,
    };
  }

  return null;
}
