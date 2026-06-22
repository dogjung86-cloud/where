import type { User } from "@supabase/supabase-js";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

import { getVerifiedSolanaWalletAddress } from "@/lib/auth-profile";
import { getWhereWalletConfig } from "@/lib/env";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_INBOX_LIMIT,
  getInboxLimitForBalance,
  getTierForBalance,
} from "@/lib/where/tiers";

function tokenAmountToWholeTokens(amount: string, decimals: number) {
  return Number(BigInt(amount) / BigInt(10) ** BigInt(decimals));
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

async function getWhereBalance(walletAddress: string) {
  const { solanaRpcUrl, tokenMint } = getWhereWalletConfig();

  if (!tokenMint) {
    return 0;
  }

  try {
    const connection = new Connection(solanaRpcUrl, "confirmed");
    const mint = new PublicKey(tokenMint);
    const owner = new PublicKey(walletAddress);
    const tokenAccount = getAssociatedTokenAddressSync(mint, owner);
    const balance = await connection.getTokenAccountBalance(tokenAccount);

    return tokenAmountToWholeTokens(
      balance.value.amount,
      balance.value.decimals,
    );
  } catch {
    return 0;
  }
}

export async function getUserWhereEntitlements(user: User) {
  const walletAddress =
    getVerifiedSolanaWalletAddress(user) ?? (await getProfileWalletAddress(user.id));
  const whereBalance = walletAddress ? await getWhereBalance(walletAddress) : 0;
  const tier = getTierForBalance(whereBalance);

  return {
    inboxLimit: getInboxLimitForBalance(whereBalance),
    receiveCount: tier?.receiveCount ?? 1,
    tierName: tier?.name ?? "Free",
    walletAddress,
    whereBalance,
  };
}

export async function getInboxUsage(userId: string) {
  const supabase = createServiceSupabaseClient();
  const { count, error } = await supabase
    .from("photo_matches")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("receiver_deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function assertInboxHasSpace(user: User) {
  const entitlements = await getUserWhereEntitlements(user);
  const inboxCount = await getInboxUsage(user.id);

  if (inboxCount >= entitlements.inboxLimit) {
    return {
      hasSpace: false,
      inboxCount,
      ...entitlements,
    };
  }

  return {
    hasSpace: true,
    inboxCount,
    ...entitlements,
  };
}

export function inboxFullMessage(inboxLimit = DEFAULT_INBOX_LIMIT) {
  return `Your inbox is full (${inboxLimit}/${inboxLimit}). Delete an arrival or hold more $WHERE to increase your inbox limit before sending a photo.`;
}
