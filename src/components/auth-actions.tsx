"use client";

import type { SolanaWallet } from "@supabase/auth-js";
import type { Session } from "@supabase/supabase-js";
import { ChevronDown, Globe2, LogIn, LogOut, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { syncAuthenticatedProfile } from "@/lib/auth-client";
import {
  formatWalletAddress,
  getUserDisplayName,
  getVerifiedSolanaWalletAddress,
} from "@/lib/auth-profile";
import { openPhantomForCurrentPage } from "@/lib/phantom-mobile";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type PendingProvider = "google" | "phantom" | "sign_out";

type PhantomProvider = {
  isPhantom?: boolean;
  providers?: PhantomProvider[];
  publicKey?: {
    toBase58?: () => string;
    toString: () => string;
  } | null;
  connect?: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage?: (
    message: Uint8Array,
    encoding?: "utf8" | string,
  ) => Promise<Uint8Array | { signature: Uint8Array }> | Uint8Array | { signature: Uint8Array };
};

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

function getPhantomProvider() {
  const provider = window.solana;

  if (!provider) {
    return null;
  }

  if (provider.isPhantom) {
    return provider;
  }

  return provider.providers?.find((entry) => entry.isPhantom) ?? null;
}

function getProviderWalletAddress(
  provider: PhantomProvider,
  connectedPublicKey?: { toString: () => string },
) {
  if (provider.publicKey?.toBase58) {
    return provider.publicKey.toBase58();
  }

  if (provider.publicKey) {
    return provider.publicKey.toString();
  }

  return connectedPublicKey?.toString() ?? null;
}

function createSupabaseWallet(provider: PhantomProvider, walletAddress: string) {
  const signMessage = provider.signMessage?.bind(provider);

  return {
    publicKey: {
      toBase58: () => walletAddress,
    },
    signMessage: async (message, encoding) => {
      if (!signMessage) {
        throw new Error("Phantom message signing is unavailable.");
      }

      const signature = await signMessage(message, encoding);

      if (signature instanceof Uint8Array) {
        return signature;
      }

      if (signature.signature instanceof Uint8Array) {
        return signature.signature;
      }

      throw new Error("Phantom returned an invalid signature.");
    },
  } satisfies SolanaWallet;
}

function createAuthNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getSessionLabel(session: Session | null) {
  if (!session) {
    return null;
  }

  const walletAddress = getVerifiedSolanaWalletAddress(session.user);

  if (walletAddress) {
    return formatWalletAddress(walletAddress);
  }

  return getUserDisplayName(session.user) ?? "Signed in";
}

export function AuthActions({ compact = false }: { compact?: boolean }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingProvider | null>(null);
  const [sessionLabel, setSessionLabel] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSessionLabel(getSessionLabel(data.session));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessionLabel(getSessionLabel(session));
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  async function handleGoogleSignIn() {
    setPending("google");
    setAuthError("");
    setIsMenuOpen(false);

    if (!supabase) {
      setAuthError("Supabase is not configured.");
      setPending(null);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setAuthError(error.message);
    }

    setPending(null);
  }

  async function handlePhantomSignIn() {
    setPending("phantom");
    setAuthError("");
    setIsMenuOpen(false);

    if (!supabase) {
      setAuthError("Supabase is not configured.");
      setPending(null);
      return;
    }

    const provider = getPhantomProvider();

    if (!provider) {
      const target = openPhantomForCurrentPage();
      setAuthError(
        target === "mobile"
          ? "Opening this page in Phantom. Continue login inside the Phantom app."
          : "Install or unlock Phantom, then try again.",
      );
      setPending(null);
      return;
    }

    try {
      const response = await provider.connect?.();
      const walletAddress = getProviderWalletAddress(
        provider,
        response?.publicKey,
      );

      if (!walletAddress) {
        throw new Error("Phantom wallet address was not available.");
      }

      if (!provider.signMessage) {
        throw new Error("Please update Phantom to sign in with this wallet.");
      }

      const { data, error } = await supabase.auth.signInWithWeb3({
        chain: "solana",
        wallet: createSupabaseWallet(provider, walletAddress),
        statement: "Sign in to SomeWhere to exchange private photos.",
        options: {
          url: window.location.origin,
          signInWithSolana: {
            expirationTime: new Date(Date.now() + 5 * 60_000).toISOString(),
            nonce: createAuthNonce(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session?.access_token) {
        const synced = await syncAuthenticatedProfile(data.session.access_token);
        setSessionLabel(
          synced.profile.walletAddress
            ? formatWalletAddress(synced.profile.walletAddress)
            : getSessionLabel(data.session),
        );
        window.dispatchEvent(new Event("where:auth-profile-synced"));
      }
    } finally {
      setPending(null);
    }
  }

  async function handleSignOut() {
    setPending("sign_out");
    setAuthError("");
    setIsMenuOpen(false);

    try {
      await supabase?.auth.signOut();
      setSessionLabel(null);
    } catch (error) {
      if (error instanceof Error) {
        setAuthError(error.message);
      }
    } finally {
      setPending(null);
    }
  }

  if (sessionLabel) {
    return (
      <div className="relative inline-flex items-center gap-2" ref={menuRef}>
        <div
          aria-label="Signed in account"
          className={
            compact
              ? "inline-flex h-10 max-w-[12rem] items-center gap-2 rounded-lg border border-[#171717] bg-[#171717] px-3 text-sm font-semibold text-white"
              : "inline-flex h-12 max-w-full items-center justify-center gap-2 rounded-lg border border-[#171717] bg-[#171717] px-4 text-sm font-semibold text-white"
          }
        >
          <span className="min-w-0 truncate">{sessionLabel}</span>
        </div>

        <button
          aria-label="Log out"
          className={
            compact
              ? "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#d8d0c2] bg-white text-[#171717] transition hover:border-[#171717] disabled:opacity-60"
              : "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold text-[#171717] transition hover:border-[#171717] disabled:opacity-60"
          }
          disabled={pending !== null}
          onClick={handleSignOut}
          type="button"
        >
          <LogOut size={17} strokeWidth={2} />
          <span className={compact ? "sr-only" : ""}>
            {pending === "sign_out" ? "Signing out..." : "Log out"}
          </span>
        </button>

        {authError ? (
          <p className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-[#e4b4a8] bg-white p-2 text-sm font-medium text-[#a33d2a] shadow-lg">
            {authError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className={
          compact
            ? "inline-flex h-10 items-center gap-2 rounded-lg border border-[#171717] bg-[#171717] px-3 text-sm font-semibold text-white"
            : "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#171717] bg-[#171717] px-4 text-sm font-semibold text-white"
        }
        disabled={pending !== null}
        onClick={() => setIsMenuOpen((value) => !value)}
        type="button"
      >
        <LogIn size={17} strokeWidth={2} />
        <span>
          {pending === "google"
            ? "Google..."
            : pending === "phantom"
              ? "Phantom..."
              : "Log in"}
        </span>
        <ChevronDown size={16} strokeWidth={2} />
      </button>

      {isMenuOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-[#d8d0c2] bg-white p-2 shadow-lg">
        <button
          className="inline-flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#171717] hover:bg-[#f7f3ec]"
          disabled={pending !== null}
          onClick={handleGoogleSignIn}
          type="button"
        >
          <Globe2 size={17} strokeWidth={2} />
          <span>
            {pending === "google"
              ? "Connecting..."
              : compact
                ? "Google"
                : "Continue with Google"}
          </span>
        </button>

        <button
          className="mt-1 inline-flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#171717] hover:bg-[#f7f3ec]"
          disabled={pending !== null}
          onClick={() => {
            handlePhantomSignIn().catch((error: unknown) => {
              setPending(null);
              setAuthError(
                error instanceof Error
                  ? error.message
                  : "Unable to connect Phantom.",
              );
            });
          }}
          type="button"
        >
          <Wallet size={17} strokeWidth={2} />
          <span>
            {pending === "phantom"
              ? "Signing..."
              : compact
                ? "Phantom"
                : "Continue with Phantom"}
          </span>
        </button>
        </div>
      ) : null}

      {authError ? (
        <p className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-[#e4b4a8] bg-white p-2 text-sm font-medium text-[#a33d2a] shadow-lg">
          {authError}
        </p>
      ) : null}
    </div>
  );
}
