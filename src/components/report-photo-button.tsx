"use client";

import type { FormEvent } from "react";
import { Flag, X } from "lucide-react";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ReportReason = "sexual" | "abuse" | "gore" | "spam" | "other";

const REPORT_REASONS: Array<{
  label: string;
  value: ReportReason;
}> = [
  { label: "Nudity or sexual content", value: "sexual" },
  { label: "Abuse or exploitation", value: "abuse" },
  { label: "Graphic violence", value: "gore" },
  { label: "Spam or scam", value: "spam" },
  { label: "Other", value: "other" },
];

type ReportPhotoButtonProps = {
  city: string;
  country: string;
  matchId?: string;
  photoId?: string;
  starterPhotoId?: string | null;
  sourceType?: "photo" | "starter";
};

export function ReportPhotoButton({
  city,
  country,
  matchId,
  photoId,
  starterPhotoId,
  sourceType = "photo",
}: ReportPhotoButtonProps) {
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState<ReportReason>("sexual");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      const reportPhotoId = sourceType === "starter" ? undefined : photoId;
      const reportStarterPhotoId =
        sourceType === "starter" ? starterPhotoId ?? photoId : undefined;

      if (!reportPhotoId && !reportStarterPhotoId) {
        setStatus(
          "Report flow ready. Real received photos will be sent to moderation.",
        );
        return;
      }

      const supabase = createBrowserSupabaseClient();

      if (!supabase) {
        throw new Error("Login is required to report a photo.");
      }

      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("Login is required to report a photo.");
      }

      const response = await fetch("/api/photos/report", {
        body: JSON.stringify({
          details: details || undefined,
          matchId,
          photoId: reportPhotoId,
          reason,
          starterPhotoId: reportStarterPhotoId,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        status?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not submit report.");
      }

      setStatus("Report submitted. This photo will be reviewed.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit report.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        aria-label={`Report photo from ${city}, ${country}`}
        className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-[#5f574f] transition hover:border-[#b84a3a] hover:text-[#b84a3a]"
        onClick={() => {
          setError(null);
          setStatus(null);
          setIsOpen(true);
        }}
        title="Report"
        type="button"
      >
        <Flag size={14} strokeWidth={2} />
      </button>

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/70 p-4"
          onClick={() => setIsOpen(false)}
          role="dialog"
        >
          <form
            className="w-full max-w-md rounded-lg border border-[#d8d0c2] bg-[#f7f3ec] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#776e62]">
                  Report photo
                </p>
                <h2 className="text-xl font-semibold">
                  {city}, {country}
                </h2>
              </div>
              <button
                aria-label="Close report"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-[#171717]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={17} strokeWidth={2} />
              </button>
            </div>

            <label className="text-sm font-semibold text-[#171717]">
              Reason
              <select
                className="mt-2 h-10 w-full rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm"
                onChange={(event) => setReason(event.target.value as ReportReason)}
                value={reason}
              >
                {REPORT_REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-semibold text-[#171717]">
              Details
              <textarea
                className="mt-2 min-h-24 w-full resize-none rounded-lg border border-[#d8d0c2] bg-white p-3 text-sm"
                maxLength={500}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Optional context for review"
                value={details}
              />
            </label>

            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-[#776e62]">
              Reports hide exact GPS from reviewers. IP enforcement uses a
              hashed network identifier.
            </p>

            {error ? (
              <p className="mt-3 rounded-lg bg-[#fff0ed] px-3 py-2 text-xs font-semibold text-[#b84a3a]">
                {error}
              </p>
            ) : null}

            {status ? (
              <p className="mt-3 rounded-lg bg-[#e4f3eb] px-3 py-2 text-xs font-semibold text-[#0d6b4f]">
                {status}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-[#d8d0c2] bg-white px-4 text-sm font-semibold"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-lg bg-[#171717] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
