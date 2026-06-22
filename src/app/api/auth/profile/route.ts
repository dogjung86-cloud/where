import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import {
  getUserDisplayName,
  getVerifiedSolanaWalletAddress,
} from "@/lib/auth-profile";
import { jsonError, validationError } from "@/lib/http";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError("Authentication required", 401);
    }

    const supabase = createServiceSupabaseClient();
    const displayName = getUserDisplayName(user);
    const walletAddress = getVerifiedSolanaWalletAddress(user);
    const now = new Date().toISOString();

    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      return jsonError(selectError.message, 500);
    }

    if (existingProfile) {
      const updatePayload: Record<string, string | null> = {
        display_name: displayName,
        updated_at: now,
      };

      if (walletAddress) {
        updatePayload.wallet_address = walletAddress;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);

      if (updateError) {
        return jsonError(updateError.message, 409);
      }
    } else {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        display_name: displayName,
        wallet_address: walletAddress,
        updated_at: now,
      });

      if (insertError) {
        return jsonError(insertError.message, 409);
      }
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        displayName,
        walletAddress,
      },
    });
  } catch (error) {
    return validationError(error);
  }
}
