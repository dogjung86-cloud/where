"use client";

import { Camera, Copy, Download, Share2, X } from "lucide-react";
import { useMemo, useState } from "react";

type ShareArrivalPhotoProps = {
  city: string;
  country: string;
  image: string;
  variant?: "image" | "icon";
};

function filenameForArrival(city: string, country: string) {
  return `${city}-${country}-somewhere`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function imageFileFromUrl(image: string, filename: string) {
  const response = await fetch(image);

  if (!response.ok) {
    throw new Error("Could not load the image for sharing.");
  }

  const blob = await response.blob();
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

export function ShareArrivalPhoto({
  city,
  country,
  image,
  variant = "image",
}: ShareArrivalPhotoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const caption = useMemo(
    () =>
      `I received a moment from ${city}, ${country} on SomeWhere. Send one photo, receive somewhere. $WHERE`,
    [city, country],
  );

  const xShareUrl = useMemo(() => {
    const url =
      typeof window === "undefined" ? "https://somewherewall.com" : window.location.origin;

    return `https://x.com/intent/post?text=${encodeURIComponent(
      `${caption}\n${url}`,
    )}`;
  }, [caption]);

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setStatus("Caption copied.");
  }

  async function sharePhotoWithFallback(target: "Instagram" | "X") {
    setStatus(null);

    try {
      const file = await imageFileFromUrl(
        image,
        filenameForArrival(city, country),
      );
      const sharePayload = {
        files: [file],
        text: caption,
        title: "SomeWhere arrival",
      };

      if (navigator.canShare?.(sharePayload)) {
        await navigator.share(sharePayload);
        setStatus(`Shared with photo. Choose ${target} from the share sheet.`);
        return;
      }

      await copyCaption();
      downloadFile(file);
      window.open(
        target === "X" ? xShareUrl : "https://www.instagram.com/",
        "_blank",
        "noopener,noreferrer",
      );
      setStatus(
        `${target} web cannot attach a photo automatically here. Caption copied and photo downloaded.`,
      );
    } catch (error) {
      await copyCaption();
      window.open(
        target === "X" ? xShareUrl : "https://www.instagram.com/",
        "_blank",
        "noopener,noreferrer",
      );
      setStatus(
        error instanceof Error
          ? `${error.message} Caption copied instead.`
          : "Caption copied instead.",
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
                onClick={() => sharePhotoWithFallback("X")}
                type="button"
              >
                X
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
                onClick={() => sharePhotoWithFallback("Instagram")}
                type="button"
              >
                <Camera size={16} strokeWidth={2} />
                Instagram
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
                onClick={copyCaption}
                type="button"
              >
                <Copy size={16} strokeWidth={2} />
                Copy
              </button>
              <a
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
                download={`${filenameForArrival(city, country)}.webp`}
                href={image}
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
