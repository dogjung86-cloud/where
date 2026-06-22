import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getWhereWalletConfig } from "@/lib/env";
import { jsonError, validationError } from "@/lib/http";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  buildWhereSpendTransaction,
  verifyWhereSpendTransaction,
} from "@/lib/where/solana";
import { getUtilityPrice, splitWhereSpend } from "@/lib/where/tiers";

const spendQuoteSchema = z.object({
  utilityKey: z.string().trim().min(1),
  walletAddress: z.string().trim().min(32).max(44).optional(),
});

const spendConfirmSchema = z.object({
  spendId: z.string().uuid(),
  txSignature: z.string().trim().min(40).max(120),
  walletAddress: z.string().trim().min(32).max(44),
});

type SpendQuoteRow = {
  id: string;
  user_id: string;
  utility_key: string;
  amount: number;
  burn_amount: number;
  treasury_amount: number;
  rewards_amount: number;
  status: string;
};

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

function requireWallet(value: string, label: string) {
  const wallet = parseWallet(value);

  if (!wallet) {
    throw new Error(`${label} is required before $WHERE payments can be used.`);
  }

  return wallet;
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
    const destinations = {
      burn: {
        wallet: null,
        amount: split.burnAmount,
      },
      treasury: {
        wallet: parseWallet(wallets.treasuryWallet),
        amount: split.treasuryAmount,
      },
      rewards: {
        wallet: split.rewardsAmount > 0 ? parseWallet(wallets.rewardsWallet) : null,
        amount: split.rewardsAmount,
      },
    };

    if (!body.walletAddress) {
      return NextResponse.json({
        utility,
        tokenMint: parseWallet(wallets.tokenMint),
        destinations,
        status: "quote",
      });
    }

    const supabase = createServiceSupabaseClient();
    const { data: spend, error: insertError } = await supabase
      .from("where_spends")
      .insert({
        user_id: user.id,
        utility_key: utility.key,
        amount: utility.cost,
        burn_amount: split.burnAmount,
        treasury_amount: split.treasuryAmount,
        rewards_amount: split.rewardsAmount,
        status: "quote",
      })
      .select("id")
      .single();

    if (insertError || !spend) {
      return jsonError(insertError?.message || "Could not create quote", 500);
    }

    const transaction = await buildWhereSpendTransaction({
      amount: utility.cost,
      rewardsWallet:
        split.rewardsAmount > 0
          ? requireWallet(wallets.rewardsWallet, "WHERE_REWARDS_WALLET")
          : undefined,
      rpcUrl: wallets.solanaRpcUrl,
      senderWallet: body.walletAddress,
      spendId: spend.id,
      split,
      tokenMint: requireWallet(wallets.tokenMint, "WHERE_TOKEN_MINT"),
      treasuryWallet: requireWallet(
        wallets.treasuryWallet,
        "WHERE_TREASURY_WALLET",
      ),
      utilityKey: utility.key,
    });

    return NextResponse.json({
      destinations,
      spendId: spend.id,
      status: "quote",
      tokenMint: parseWallet(wallets.tokenMint),
      transaction,
      utility,
    });
  } catch (error) {
    return validationError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError("Authentication required", 401);
    }

    const body = spendConfirmSchema.parse(await request.json());
    const supabase = createServiceSupabaseClient();
    const { data: spendData, error: spendError } = await supabase
      .from("where_spends")
      .select(
        [
          "id",
          "user_id",
          "utility_key",
          "amount",
          "burn_amount",
          "treasury_amount",
          "rewards_amount",
          "status",
        ].join(", "),
      )
      .eq("id", body.spendId)
      .eq("user_id", user.id)
      .single();
    const spend = spendData as unknown as SpendQuoteRow | null;

    if (spendError || !spend) {
      return jsonError("Spend quote not found", 404);
    }

    const utility = getUtilityPrice(spend.utility_key);

    if (!utility || utility.cost !== spend.amount) {
      return jsonError("Spend quote is no longer valid", 409);
    }

    const wallets = getWhereWalletConfig();
    const verification = await verifyWhereSpendTransaction({
      amount: spend.amount,
      rewardsWallet:
        spend.rewards_amount > 0
          ? requireWallet(wallets.rewardsWallet, "WHERE_REWARDS_WALLET")
          : undefined,
      rpcUrl: wallets.solanaRpcUrl,
      senderWallet: body.walletAddress,
      spendId: spend.id,
      split: {
        burnAmount: spend.burn_amount,
        treasuryAmount: spend.treasury_amount,
        rewardsAmount: spend.rewards_amount,
      },
      tokenMint: requireWallet(wallets.tokenMint, "WHERE_TOKEN_MINT"),
      treasuryWallet: requireWallet(
        wallets.treasuryWallet,
        "WHERE_TREASURY_WALLET",
      ),
      txSignature: body.txSignature,
      utilityKey: spend.utility_key,
    });

    if (!verification.confirmed) {
      await supabase
        .from("where_spends")
        .update({
          status: "pending",
          tx_signature: body.txSignature,
        })
        .eq("id", spend.id);

      return NextResponse.json({
        reason: verification.reason,
        spendId: spend.id,
        status: "pending",
      });
    }

    const { error: updateError } = await supabase
      .from("where_spends")
      .update({
        confirmed_at: new Date().toISOString(),
        status: "confirmed",
        tx_signature: body.txSignature,
      })
      .eq("id", spend.id);

    if (updateError) {
      return jsonError(updateError.message, 500);
    }

    return NextResponse.json({
      spendId: spend.id,
      status: "confirmed",
      utility,
    });
  } catch (error) {
    return validationError(error);
  }
}
