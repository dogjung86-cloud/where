import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getWhereWalletConfig } from "@/lib/env";
import { jsonError, validationError } from "@/lib/http";
import { getUtilityPrice, splitWhereSpend } from "@/lib/where/tiers";

const spendQuoteSchema = z.object({
  utilityKey: z.string().trim().min(1),
});

function parseWallet(value: string) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const looksLikeBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);

  if (!looksLikeBase58) {
    throw new Error("Invalid Solana wallet address");
  }

  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError("Authentication required", 401);
    }

    const body = spendQuoteSchema.parse(await request.json());
    const utility = getUtilityPrice(body.utilityKey);

    if (!utility) {
      return jsonError("Unknown $WHERE utility", 404);
    }

    const split = splitWhereSpend(utility.cost);
    const wallets = getWhereWalletConfig();

    return NextResponse.json({
      utility,
      tokenMint: parseWallet(wallets.tokenMint),
      destinations: {
        burn: {
          wallet: parseWallet(wallets.burnWallet),
          amount: split.burnAmount,
        },
        treasury: {
          wallet: parseWallet(wallets.treasuryWallet),
          amount: split.treasuryAmount,
        },
        rewards: {
          wallet: parseWallet(wallets.rewardsWallet),
          amount: split.rewardsAmount,
        },
      },
      status: "quote",
    });
  } catch (error) {
    return validationError(error);
  }
}
