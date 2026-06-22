"use client";

import type { ChangeEvent, DragEvent, MouseEvent } from "react";
import { Camera, ImagePlus, Lock, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type MessageTone = "auth" | "error" | "info" | "success";

type SignedUploadResponse = {
  photoId: string;
  bucket: string;
  path: string;
  token: string;
};

type ArrivalNotice = {
  matchId: string;
  photoId: string;
  starterPhotoId: string | null;
  sourceType: "photo" | "starter";
  city: string;
  country: string;
  deliveredAt: string;
  thumbnailUrl: string | null;
};

type CompleteUploadResponse = {
  photoId: string;
  processedPath: string;
  thumbnailPath: string;
  status: "ready";
  arrivalStatus: "delivered" | "queued";
  arrival: ArrivalNotice | null;
  arrivals?: ArrivalNotice[];
};

type UploadLocationPayload = {
  accuracyM: number;
  displayLat: number;
  displayLng: number;
  locationSource: "browser_gps";
};

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while sending the photo.";
}

function getUploadContentType(file: File) {
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return file.type === "image/heif" ? "image/heic" : file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "heic" || extension === "heif") {
    return "image/heic";
  }

  return null;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(2));
}

async function getBrowserLocationPayload(): Promise<UploadLocationPayload | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          accuracyM: Math.min(
            100_000,
            Math.max(1, Math.round(position.coords.accuracy || 50_000)),
          ),
          displayLat: roundCoordinate(position.coords.latitude),
          displayLng: roundCoordinate(position.coords.longitude),
          locationSource: "browser_gps",
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: 4500,
      },
    );
  });
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

export function PhotoUploadPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const cameraInputId = useId();
  const libraryInputId = useId();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [arrival, setArrival] = useState<ArrivalNotice | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setIsSignedIn(Boolean(data.session));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsSignedIn(Boolean(session));

        if (session) {
          setMessage("");
          setMessageTone("info");
        }
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function setPanelMessage(nextMessage: string, tone: MessageTone = "info") {
    setMessage(nextMessage);
    setMessageTone(tone);
  }

  function requireSignIn() {
    if (!isSignedIn) {
      setPanelMessage(
        "Please log in with Google or Phantom before sending a photo.",
        "auth",
      );
      return false;
    }

    if (!supabase) {
      setPanelMessage(
        "Login configuration is missing. Please try again after Supabase is configured.",
        "error",
      );
      return false;
    }

    return true;
  }

  function acceptFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!getUploadContentType(file)) {
      setPanelMessage("Please choose a JPEG, PNG, WebP, or HEIC image.", "error");
      return;
    }

    setArrival(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPanelMessage("Photo ready. Press Send photo to exchange it.", "info");
  }

  function handlePickerClick(event: MouseEvent<HTMLInputElement>) {
    if (!requireSignIn()) {
      event.preventDefault();
      return;
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!requireSignIn()) {
      return;
    }

    acceptFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function sendPhoto() {
    const client = supabase;

    if (!selectedFile) {
      setPanelMessage("Choose a photo first.", "error");
      return;
    }

    if (!requireSignIn() || !client) {
      return;
    }

    setIsSending(true);
    setArrival(null);
    setPanelMessage("Sending your photo...", "info");

    try {
      const { data, error: sessionError } = await client.auth.getSession();
      const token = data.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Please log in again before sending a photo.");
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
      };
      const contentType = getUploadContentType(selectedFile);

      if (!contentType) {
        throw new Error("Please choose a JPEG, PNG, WebP, or HEIC image.");
      }

      setPanelMessage("Finding the approximate city...", "info");

      const locationPayload = await getBrowserLocationPayload();

      const signedUploadResponse = await fetch("/api/uploads/signed-url", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentType,
          byteSize: selectedFile.size,
          ...(locationPayload ?? {}),
        }),
      });
      const signedUpload = await readJsonResponse<SignedUploadResponse>(
        signedUploadResponse,
      );

      const { error: uploadError } = await client.storage
        .from(signedUpload.bucket)
        .uploadToSignedUrl(
          signedUpload.path,
          signedUpload.token,
          selectedFile,
          {
            contentType,
          },
        );

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const completeResponse = await fetch("/api/photos/complete", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoId: signedUpload.photoId,
        }),
      });
      const completed = await readJsonResponse<CompleteUploadResponse>(
        completeResponse,
      );

      setSelectedFile(null);
      setPreviewUrl("");
      setArrival(completed.arrival);

      if (completed.arrival) {
        const arrivalCount = completed.arrivals?.length ?? 1;
        const place = [completed.arrival.city, completed.arrival.country]
          .filter(Boolean)
          .join(", ");

        setPanelMessage(
          arrivalCount > 1
            ? `Photo sent. ${arrivalCount} new photos arrived.`
            : place
            ? `Photo sent. A new photo from ${place} arrived.`
            : "Photo sent. A new photo arrived.",
          "success",
        );
      } else {
        setPanelMessage(
          "Photo sent. A new photo will arrive as soon as the exchange queue has one.",
          "success",
        );
      }
    } catch (error) {
      setPanelMessage(getErrorMessage(error), "error");
    } finally {
      setIsSending(false);
    }
  }

  const messageClassName =
    {
      auth: "bg-[#171717] text-white",
      error: "bg-[#ffe8df] text-[#8f2f16]",
      info: "bg-[#e2f4ee] text-[#0d6b4f]",
      success: "bg-[#e2f4ee] text-[#0d6b4f]",
    }[messageTone] ?? "bg-[#e2f4ee] text-[#0d6b4f]";

  return (
    <section className="rounded-lg border border-[#d8d0c2] bg-[#fffaf1] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#776e62]">Exchange</p>
          <h2 className="text-2xl font-semibold">Send one moment</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#776e62]">
            Your photo opens the next arrival. The app keeps the exchange
            anonymous, strips metadata, and shows city-level location only.
          </p>
        </div>
        {isSignedIn ? (
          <ImagePlus size={24} strokeWidth={1.8} />
        ) : (
          <Lock size={24} strokeWidth={1.8} />
        )}
      </div>

      <div
        className={[
          "relative flex min-h-72 flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed bg-white p-4 text-center transition",
          isDragging
            ? "border-[#0d6b4f] ring-4 ring-[#a8d8c1]/40"
            : "border-[#b9ad9b]",
        ].join(" ")}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <>
            <div
              aria-label={selectedFile?.name ?? "Selected upload"}
              className="absolute inset-0 size-full bg-cover bg-center"
              style={{ backgroundImage: `url(${previewUrl})` }}
            />
            <div className="absolute inset-0 bg-[#171717]/35" />
            <div className="relative z-10 w-full max-w-sm rounded-lg bg-white/95 p-4 text-left shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {selectedFile?.name}
                  </p>
                  <p className="mt-1 text-xs text-[#776e62]">
                    {selectedFile ? formatBytes(selectedFile.size) : ""}
                  </p>
                </div>
                <button
                  aria-label="Remove selected photo"
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#d8d0c2] text-[#171717]"
                  disabled={isSending}
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl("");
                    setPanelMessage("");
                  }}
                  type="button"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
              <button
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#171717] bg-[#171717] px-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSending}
                onClick={sendPhoto}
                type="button"
              >
                <UploadCloud size={17} strokeWidth={2} />
                {isSending ? "Sending..." : "Send photo"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex min-h-60 w-full flex-col items-center justify-center gap-4 rounded-lg text-center">
            <span className="grid size-14 place-items-center rounded-lg bg-[#e2f4ee] text-[#0d6b4f]">
              <UploadCloud size={28} strokeWidth={1.8} />
            </span>
            <span className="max-w-[18rem] text-lg font-semibold">
              Drop a current photo here
            </span>
            <span className="max-w-[20rem] text-sm leading-6 text-[#776e62]">
              Drag an image into this box, choose one from your library, or
              take a new photo now.
            </span>
            <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                className="relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold text-[#171717] transition hover:border-[#171717]"
                htmlFor={libraryInputId}
              >
                <input
                  id={libraryInputId}
                  className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onClick={handlePickerClick}
                  onChange={handleFileChange}
                />
                <ImagePlus size={17} strokeWidth={2} />
                Choose photo
              </label>
              <label
                className="relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-[#171717] bg-[#171717] px-3 text-sm font-semibold text-white transition"
                htmlFor={cameraInputId}
              >
                <input
                  id={cameraInputId}
                  className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onClick={handlePickerClick}
                  onChange={handleFileChange}
                />
                <Camera size={17} strokeWidth={2} />
                Take photo
              </label>
            </div>
          </div>
        )}
      </div>

      {message ? (
        <p
          aria-live="polite"
          className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${messageClassName}`}
        >
          {message}
        </p>
      ) : (
        <p className="mt-3 rounded-lg bg-[#171717] px-3 py-2 text-sm font-medium text-white">
          Extra arrivals unlock only after your own photo lands.
        </p>
      )}

      {arrival ? (
        <div
          aria-live="polite"
          className="mt-3 flex items-center gap-3 rounded-lg border border-[#d8d0c2] bg-white p-3"
        >
          {arrival.thumbnailUrl ? (
            <div
              aria-label={`Arrival from ${arrival.city}, ${arrival.country}`}
              className="size-16 rounded-lg bg-cover bg-center"
              role="img"
              style={{ backgroundImage: `url(${arrival.thumbnailUrl})` }}
            />
          ) : (
            <div className="grid size-16 place-items-center rounded-lg bg-[#e2f4ee] text-[#0d6b4f]">
              <ImagePlus size={24} strokeWidth={1.8} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold">A new photo arrived</p>
            <p className="truncate text-xs text-[#776e62]">
              {arrival.city}, {arrival.country}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
