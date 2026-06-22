"use client";

import { Camera, Copy, Download, Share2, X } from "lucide-react";
import { useMemo, useState } from "react";

const SITE_URL = "https://playwhere.xyz/";
const INSTAGRAM_CREATE_URL = "https://www.instagram.com/create/select/";

type ShareArrivalPhotoProps = {
  city: string;
  country: string;
  image: string;
  matchId?: string;
  photoId?: string;
  starterPhotoId?: string | null;
  sourceType?: "photo" | "starter";
  variant?: "image" | "icon";
};

function filenameForArrival(city: string, country: string) {
  return `${city}-${country}-somewhere`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function convertBlobToJpegFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();

      element.addEventListener("load", () => resolve(element), { once: true });
      element.addEventListener(
        "error",
        () => reject(new Error("Could not prepare the image.")),
        { once: true },
      );
      element.src = url;
    });
    const canvas = document.createElement("canvas");
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not prepare the image.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (nextBlob) {
            resolve(nextBlob);
          } else {
            reject(new Error("Could not prepare the image."));
          }
        },
        "image/jpeg",
        0.92,
      );
    });

    return new File([jpegBlob], `${filename}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function imageFileFromUrl(
  image: string,
  filename: string,
  format: "jpeg" | "original" = "original",
) {
  const response = await fetch(image);

  if (!response.ok) {
    throw new Error("Could not load the image for sharing.");
  }

  const blob = await response.blob();

  if (format === "jpeg") {
    try {
      return await convertBlobToJpegFile(blob, filename);
    } catch {
      return new File([blob], `${filename}.webp`, { type: blob.type });
    }
  }

  const extension = blob.type.includes("webp")
    ? "webp"
    : blob.type.includes("png")
      ? "png"
      : "jpg";

  return new File([blob], `${filename}.${extension}`, { type: blob.type });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getOrigin() {
  return typeof window === "undefined"
    ? "https://playwhere.xyz"
    : window.location.origin;
}

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${getOrigin()}${value.startsWith("/") ? "" : "/"}${value}`;
}

function isMobileBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function ShareArrivalPhoto({
  city,
  country,
  image,
  matchId,
  photoId,
  starterPhotoId,
  sourceType = "photo",
  variant = "image",
}: ShareArrivalPhotoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const caption = useMemo(
    () =>
      `I received a moment from ${city}, ${country} on SomeWhere. Send one photo, receive somewhere. $WHERE ${SITE_URL}`,
    [city, country],
  );
  const xCaption = useMemo(
    () =>
      `I received a moment from ${city}, ${country} on SomeWhere. Send one photo, receive somewhere. $WHERE ${SITE_URL}`,
    [city, country],
  );
  const shareUrl = useMemo(
    () =>
      matchId
        ? new URL(`/share/${matchId}`, SITE_URL).toString()
        : absoluteUrl(image),
    [image, matchId],
  );

  const xShareUrl = useMemo(() => {
    const params = new URLSearchParams({
      text: xCaption,
      url: shareUrl,
    });

    return `https://x.com/intent/post?${params.toString()}`;
  }, [shareUrl, xCaption]);

  async function copyShareText() {
    await navigator.clipboard.writeText(caption);
    await recordShareEvent("copy_link");
    setStatus("Share text copied.");
  }

  async function recordShareEvent(
    target: "copy_link" | "instagram" | "save" | "x",
  ) {
    await fetch("/api/share/events", {
      body: JSON.stringify({
        matchId,
        photoId: sourceType === "starter" ? undefined : photoId,
        starterPhotoId: sourceType === "starter" ? starterPhotoId ?? photoId : null,
        shareUrl,
        target,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }).catch(() => null);
  }

  async function openXShare() {
    setStatus(null);

    if (isMobileBrowser() && navigator.share) {
      try {
        await navigator.share({
          text: xCaption,
          title: `${city}, ${country} on SomeWhere`,
          url: shareUrl,
        });
        await recordShareEvent("x");
        setStatus("Share sheet opened. Choose X if it is installed.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setStatus("Share canceled.");
          return;
        }
      }
    }

    window.open(xShareUrl, "_blank", "noopener,noreferrer");
    await recordShareEvent("x");
    setStatus("X compose opened with the photo card link.");
  }

  async function openInstagramShare() {
    setStatus(null);
    const copyText = navigator.clipboard.writeText(caption).catch(() => null);

    window.open(INSTAGRAM_CREATE_URL, "_blank", "noopener,noreferrer");

    try {
      const file = await imageFileFromUrl(
        image,
        filenameForArrival(city, country),
        "jpeg",
      );
      downloadFile(file);
      await copyText;
      await recordShareEvent("instagram");
      setStatus(
        "Instagram create opened. A JPG copy was downloaded and the share text was copied.",
      );
    } catch (error) {
      await copyText;
      await recordShareEvent("instagram");
      setStatus(
        error instanceof Error
          ? `${error.message} Instagram opened and the share text was copied.`
          : "Instagram opened and the share text was copied.",
      );
    }
  }

  const openShare = () => {
    setStatus(null);
    setIsOpen(true);
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          aria-label={`Share photo from ${city}, ${country}`}
          className="grid size-8 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-[#5f574f] transition hover:border-[#0d6b4f] hover:text-[#0d6b4f]"
          onClick={openShare}
          title="Share"
          type="button"
        >
          <Share2 size={14} strokeWidth={2} />
        </button>
      ) : (
        <button
          aria-label={`Open share options for ${city}, ${country}`}
          className="block w-full overflow-hidden text-left"
          onClick={openShare}
          type="button"
        >
          <span
            aria-hidden="true"
            className="block aspect-[4/5] bg-cover bg-center transition duration-200 hover:scale-[1.015]"
            style={{ backgroundImage: `url(${image})` }}
          />
        </button>
      )}

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/70 p-4"
          onClick={() => setIsOpen(false)}
          role="dialog"
        >
          <div
            className="w-full max-w-lg rounded-lg border border-[#d8d0c2] bg-[#f7f3ec] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#776e62]">
                  Share arrival
                </p>
                <h2 className="text-2xl font-semibold">
                  {city}, {country}
                </h2>
              </div>
              <button
                aria-label="Close share"
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-[#171717]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div
              aria-label={`${city}, ${country}`}
              className="aspect-[4/5] max-h-[56vh] w-full rounded-lg bg-cover bg-center"
              style={{ backgroundImage: `url(${image})` }}
            />

            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm leading-6 text-[#5f574f]">
              {caption}
            </p>

            {status ? (
              <p className="mt-3 rounded-lg bg-[#e4f3eb] px-3 py-2 text-xs font-semibold text-[#0d6b4f]">
                {status}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171717] px-3 text-sm font-semibold text-white"
                onClick={openXShare}
                type="button"
              >
                X
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
                onClick={openInstagramShare}
                type="button"
              >
                <Camera size={16} strokeWidth={2} />
                Instagram
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
                onClick={copyShareText}
                type="button"
              >
                <Copy size={16} strokeWidth={2} />
                Copy text
              </button>
              <a
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
                download={`${filenameForArrival(city, country)}.webp`}
                href={image}
                onClick={() => {
                  recordShareEvent("save").catch(() => null);
                }}
              >
                <Download size={16} strokeWidth={2} />
                Save
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
