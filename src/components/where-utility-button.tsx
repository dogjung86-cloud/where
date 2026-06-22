"use client";

import { MapPin, Shuffle } from "lucide-react";
import { Transaction } from "@solana/web3.js";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type UtilityKey = "city_reroll" | "uncollected_city";

type AppliedArrival = {
  matchId: string;
  photoId: string;
  city: string;
  country: string;
  deliveredAt: string;
  thumbnailUrl: string | null;
};

type PhantomProvider = {
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
  isPhantom?: boolean;
  publicKey?: { toBase58: () => string };
  signAndSendTransaction?: (
    transaction: Transaction,
  ) => Promise<{ signature: string } | string>;
};

type WhereUtilityButtonProps = {
  compact?: boolean;
  targetMatchId?: string;
  utilityKey: UtilityKey;
  onApplied?: (arrival: AppliedArrival, targetMatchId?: string) => void;
  onStatus?: (message: string) => void;
};

const UTILITY_COPY: Record<
  UtilityKey,
  {
    ariaLabel: string;
    cost: string;
    label: string;
  }
> = {
  city_reroll: {
    ariaLabel: "Try another city for this arrival",
    cost: "1,000 $WHERE",
    label: "Try another city",
  },
  uncollected_city: {
    ariaLabel: "Receive an uncollected city",
    cost: "3,000 $WHERE",
    label: "Uncollected city",
  },
};

function getPhantomProvider() {
  const walletWindow = window as Window & {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  };

  return walletWindow.phantom?.solana ?? walletWindow.solana ?? null;
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data as T;
}

export function WhereUtilityButton({
  compact = false,
  onApplied,
  onStatus,
  targetMatchId,
  utilityKey,
}: WhereUtilityButtonProps) {
  const [isBusy, setIsBusy] = useState(false);
  const copy = UTILITY_COPY[utilityKey];
  const Icon = utilityKey === "city_reroll" ? Shuffle : MapPin;

  async function handleClick() {
    setIsBusy(true);
    onStatus?.(`Opening Phantom for ${copy.cost}...`);

    try {
      const supabase = createBrowserSupabaseClient();

      if (!supabase) {
        throw new Error("Login is required to use $WHERE utilities.");
      }

      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("Please log in before using $WHERE utilities.");
      }

      if (utilityKey === "city_reroll" && !targetMatchId) {
        throw new Error("Try another city is available on real inbox arrivals.");
      }

      const provider = getPhantomProvider();

      if (!provider?.isPhantom || !provider.signAndSendTransaction) {
        throw new Error("Please install or unlock Phantom wallet.");
      }

      const wallet = provider.publicKey
        ? { publicKey: provider.publicKey }
        : await provider.connect();
      const walletAddress = wallet.publicKey.toBase58();
      const quote = await readJsonResponse<{
        spendId: string;
        transaction: {
          transaction: string;
        };
      }>(
        await fetch("/api/where/spend", {
          body: JSON.stringify({
            utilityKey,
            walletAddress,
          }),
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        }),
      );
      const transaction = Transaction.from(
        base64ToBytes(quote.transaction.transaction),
      );
      const signed = await provider.signAndSendTransaction(transaction);
      const txSignature =
        typeof signed === "string" ? signed : signed.signature;

      onStatus?.("Payment sent. Confirming on-chain...");

      const confirmation = await readJsonResponse<{
        reason?: string;
        status: "confirmed" | "pending";
      }>(
        await fetch("/api/where/spend", {
          body: JSON.stringify({
            spendId: quote.spendId,
            txSignature,
            walletAddress,
          }),
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          method: "PATCH",
        }),
      );

      if (confirmation.status !== "confirmed") {
        onStatus?.(confirmation.reason ?? "Payment is still confirming.");
        return;
      }

      const applied = await readJsonResponse<{
        arrival: AppliedArrival;
        status: "applied";
      }>(
        await fetch("/api/photos/arrival/utility", {
          body: JSON.stringify({
            spendId: quote.spendId,
            targetMatchId,
          }),
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        }),
      );

      onApplied?.(applied.arrival, targetMatchId);
      onStatus?.(`${copy.label} applied.`);
    } catch (error) {
      onStatus?.(
        error instanceof Error ? error.message : "Could not use this utility.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        aria-label={`${copy.ariaLabel} (${copy.cost})`}
        className="grid size-8 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-[#5f574f] transition hover:border-[#0d6b4f] hover:text-[#0d6b4f] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isBusy}
        onClick={handleClick}
        title={`${copy.label} - ${copy.cost}`}
        type="button"
      >
        <Icon size={14} strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold text-[#171717] transition hover:border-[#0d6b4f] hover:text-[#0d6b4f] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isBusy}
      onClick={handleClick}
      title={`${copy.cost}`}
      type="button"
    >
      <Icon size={16} strokeWidth={2} />
      <span>{copy.label}</span>
    </button>
  );
}
