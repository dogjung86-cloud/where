"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminNavLink() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isMounted = true;

    async function checkAdmin(accessToken: string | null | undefined) {
      if (!accessToken) {
        if (isMounted) {
          setIsAdmin(false);
        }

        return;
      }

      const response = await fetch("/api/admin/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        isAdmin?: boolean;
      };

      if (isMounted) {
        setIsAdmin(Boolean(payload.isAdmin));
      }
    }

    function refreshAdminStatus() {
      client.auth.getSession().then(({ data }) => {
        checkAdmin(data.session?.access_token).catch(() => {
          if (isMounted) {
            setIsAdmin(false);
          }
        });
      });
    }

    refreshAdminStatus();

    window.addEventListener("where:auth-profile-synced", refreshAdminStatus);

    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        checkAdmin(session?.access_token).catch(() => {
          if (isMounted) {
            setIsAdmin(false);
          }
        });
      },
    );

    return () => {
      isMounted = false;
      window.removeEventListener(
        "where:auth-profile-synced",
        refreshAdminStatus,
      );
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!isAdmin) {
    return null;
  }

  return (
    <Link
      className="inline-flex h-10 items-center justify-center rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold text-[#171717] transition hover:border-[#171717]"
      href="/admin"
    >
      Admin
    </Link>
  );
}
