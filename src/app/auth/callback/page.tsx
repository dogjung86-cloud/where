"use client";

import { useEffect, useState } from "react";

import { syncAuthenticatedProfile } from "@/lib/auth-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    let isMounted = true;

    async function completeSignIn() {
      const supabase = createBrowserSupabaseClient();

      if (!supabase) {
        setMessage("Supabase is not configured.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const authError =
        params.get("error_description") ?? params.get("error") ?? null;

      if (authError) {
        setMessage(authError);
        return;
      }

      const code = params.get("code");

      if (!code) {
        setMessage("Missing auth code.");
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session?.access_token) {
        await syncAuthenticatedProfile(data.session.access_token);
      }

      if (isMounted) {
        window.history.replaceState(null, "", "/");
        window.location.replace("/");
      }
    }

    completeSignIn().catch((error: unknown) => {
      if (error instanceof Error) {
        setMessage(error.message);
        return;
      }

      setMessage("Unable to complete sign in.");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f3ec] px-4 text-[#171717]">
      <section className="w-full max-w-sm rounded-lg border border-[#d8d0c2] bg-white p-5 text-center">
        <p className="text-sm font-medium text-[#776e62]">SomeWhere</p>
        <h1 className="mt-2 text-2xl font-semibold">{message}</h1>
      </section>
    </main>
  );
}
