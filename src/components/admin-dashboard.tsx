"use client";

import {
  CheckCircle2,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AdminReport = {
  createdAt: string;
  details: string | null;
  id: string;
  matchId: string | null;
  photo: {
    city: string;
    country: string;
    createdAt: string;
    id: string;
    imageUrl: string | null;
    ownerId: string | null;
    reportCount: number | null;
    sourceType: "photo" | "starter";
    status: string;
    uploaderIpHash: string | null;
  } | null;
  photoId: string | null;
  reason: string;
  reportedOwnerId: string | null;
  reporterId: string;
  reporterIpHash: string | null;
  reviewedAt: string | null;
  status: string;
};

type AdminReportsResponse = {
  admin?: {
    walletAddress: string;
  };
  error?: string;
  reports?: AdminReport[];
};

type ReportStatus = "actioned" | "dismissed" | "open" | "reviewed";

function formatDate(value: string | null) {
  if (!value) {
    return "Not reviewed";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortId(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function AdminDashboard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [adminWallet, setAdminWallet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [status, setStatus] = useState<string | null>(() =>
    supabase ? null : "Supabase is not configured.",
  );

  const loadReports = useCallback(
    async (token: string) => {
      setIsLoading(true);
      setStatus(null);

      const response = await fetch("/api/admin/reports", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as
        AdminReportsResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Could not load reports.");
      }

      setAdminWallet(payload.admin?.walletAddress ?? null);
      setReports(payload.reports ?? []);
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token ?? null;

      if (!isMounted) {
        return;
      }

      setAccessToken(token);

      if (!token) {
        setStatus("Log in with the admin Phantom wallet to view reports.");
        setIsLoading(false);
        return;
      }

      loadReports(token).catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setStatus(
          error instanceof Error ? error.message : "Could not load reports.",
        );
        setIsLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const token = session?.access_token ?? null;
        setAccessToken(token);

        if (!token) {
          setReports([]);
          setAdminWallet(null);
          setStatus("Log in with the admin Phantom wallet to view reports.");
          setIsLoading(false);
          return;
        }

        loadReports(token).catch((error: unknown) => {
          setStatus(
            error instanceof Error ? error.message : "Could not load reports.",
          );
          setIsLoading(false);
        });
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadReports, supabase]);

  async function refreshReports() {
    if (!accessToken) {
      return;
    }

    try {
      await loadReports(accessToken);
      setStatus("Reports refreshed.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not refresh reports.",
      );
      setIsLoading(false);
    }
  }

  async function updateReportStatus(reportId: string, nextStatus: ReportStatus) {
    if (!accessToken) {
      return;
    }

    setStatus(null);

    const response = await fetch("/api/admin/reports", {
      body: JSON.stringify({
        reportId,
        status: nextStatus,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setStatus(payload.error || "Could not update report.");
      return;
    }

    setReports((current) =>
      current.map((report) =>
        report.id === reportId
          ? {
              ...report,
              reviewedAt:
                nextStatus === "open" ? null : new Date().toISOString(),
              status: nextStatus,
            }
          : report,
      ),
    );
    setStatus("Report status updated.");
  }

  async function deletePhoto(report: AdminReport) {
    if (!accessToken || !report.photo) {
      return;
    }

    const confirmed = window.confirm(
      `Delete the reported photo from ${report.photo.city}, ${report.photo.country}? This removes the photo, storage files, matches, and reports.`,
    );

    if (!confirmed) {
      return;
    }

    setStatus(null);

    const response = await fetch("/api/admin/reports", {
      body: JSON.stringify({
        photoId: report.photo.sourceType === "photo" ? report.photo.id : undefined,
        starterPhotoId:
          report.photo.sourceType === "starter" ? report.photo.id : undefined,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setStatus(payload.error || "Could not delete photo.");
      return;
    }

    setReports((current) =>
      current.filter((item) => item.id !== report.id),
    );
    setStatus("Reported photo deleted.");
  }

  const openReports = reports.filter((report) => report.status === "open");

  return (
    <section className="rounded-lg border border-[#d8d0c2] bg-white p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#776e62]">Admin</p>
          <h1 className="text-3xl font-semibold">Reported photos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#776e62]">
            Review incoming reports, inspect the reported photo context, update
            report status, and permanently delete abusive photos from storage.
          </p>
          {adminWallet ? (
            <p className="mt-2 text-xs font-semibold text-[#0d6b4f]">
              Admin wallet: {shortId(adminWallet)}
            </p>
          ) : null}
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
          disabled={!accessToken || isLoading}
          onClick={refreshReports}
          type="button"
        >
          <RefreshCcw
            className={isLoading ? "animate-spin" : ""}
            size={16}
            strokeWidth={2}
          />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-[#f7f3ec] p-4">
          <p className="text-sm font-semibold">Open reports</p>
          <p className="mt-2 text-3xl font-semibold">{openReports.length}</p>
        </div>
        <div className="rounded-lg bg-[#f7f3ec] p-4">
          <p className="text-sm font-semibold">Visible reports</p>
          <p className="mt-2 text-3xl font-semibold">{reports.length}</p>
        </div>
        <div className="rounded-lg bg-[#f7f3ec] p-4">
          <p className="text-sm font-semibold">Admin actions</p>
          <p className="mt-2 text-sm leading-6 text-[#776e62]">
            Delete photo, mark reviewed, dismiss report.
          </p>
        </div>
      </div>

      {status ? (
        <p className="mb-4 rounded-lg bg-[#e4f3eb] px-3 py-2 text-sm font-semibold text-[#0d6b4f]">
          {status}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-[#d8d0c2] bg-[#f7f3ec] p-8 text-center text-sm font-semibold">
          Loading reports...
        </div>
      ) : reports.length ? (
        <div className="grid grid-cols-1 gap-3">
          {reports.map((report) => (
            <article
              className="grid grid-cols-1 gap-4 rounded-lg border border-[#e2dbd0] bg-[#f7f3ec] p-3 md:grid-cols-[180px_minmax(0,1fr)]"
              key={report.id}
            >
              <div className="overflow-hidden rounded-lg bg-white">
                {report.photo?.imageUrl ? (
                  <div
                    aria-label={`${report.photo.city}, ${report.photo.country}`}
                    className="aspect-[4/5] bg-cover bg-center"
                    style={{ backgroundImage: `url(${report.photo.imageUrl})` }}
                  />
                ) : (
                  <div className="grid aspect-[4/5] place-items-center text-[#776e62]">
                    <ShieldAlert size={28} strokeWidth={1.8} />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#776e62]">
                      {report.reason}
                    </p>
                    <h2 className="text-xl font-semibold">
                      {report.photo
                        ? `${report.photo.city}, ${report.photo.country}`
                        : "Deleted photo"}
                    </h2>
                    <p className="mt-1 text-xs text-[#776e62]">
                      Reported {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-[#0d6b4f]">
                    {report.status}
                  </span>
                </div>

                {report.details ? (
                  <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm leading-6 text-[#5f574f]">
                    {report.details}
                  </p>
                ) : null}

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[#776e62] sm:grid-cols-2 lg:grid-cols-3">
                  <p>Report ID: {shortId(report.id)}</p>
                  <p>
                    Photo ID:{" "}
                    {report.photoId ? shortId(report.photoId) : "Missing"}
                  </p>
                  <p>Reporter: {shortId(report.reporterId)}</p>
                  <p>
                    Owner:{" "}
                    {report.reportedOwnerId
                      ? shortId(report.reportedOwnerId)
                      : "System pool"}
                  </p>
                  <p>Reporter IP: {report.reporterIpHash ?? "None"}</p>
                  <p>Uploader IP: {report.photo?.uploaderIpHash ?? "None"}</p>
                  <p>Photo status: {report.photo?.status ?? "missing"}</p>
                  <p>Report count: {report.photo?.reportCount ?? 0}</p>
                  <p>Reviewed: {formatDate(report.reviewedAt)}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
                    onClick={() => updateReportStatus(report.id, "reviewed")}
                    type="button"
                  >
                    <CheckCircle2 size={15} strokeWidth={2} />
                    Reviewed
                  </button>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
                    onClick={() => updateReportStatus(report.id, "dismissed")}
                    type="button"
                  >
                    <XCircle size={15} strokeWidth={2} />
                    Dismiss
                  </button>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#b84a3a] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!report.photo}
                    onClick={() => deletePhoto(report)}
                    type="button"
                  >
                    <Trash2 size={15} strokeWidth={2} />
                    Delete photo
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#d8d0c2] bg-[#f7f3ec] p-8 text-center">
          <p className="text-sm font-semibold">No reports to review.</p>
        </div>
      )}
    </section>
  );
}
