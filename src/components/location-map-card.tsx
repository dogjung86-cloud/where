"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";

type LocationMapCardProps = {
  city: string;
  country: string;
  detailMap: string;
  map: string;
  region: string;
};

export function LocationMapCard({
  city,
  country,
  detailMap,
  map,
  region,
}: LocationMapCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        aria-label={`Open approximate map for ${city}, ${country}`}
        className="mt-3 w-full overflow-hidden rounded-lg border border-[#d8d0c2] bg-white/75 p-2 transition hover:border-[#8ea393] focus:outline-none focus:ring-2 focus:ring-[#0d6b4f]/30"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span
          className="mx-auto block size-24 overflow-hidden rounded-full border border-[#c6d3c6] bg-cover bg-center"
          style={{ backgroundImage: `url(${map})` }}
        />
      </button>

      {isOpen ? (
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/70 p-4"
          onClick={() => setIsOpen(false)}
          role="dialog"
        >
          <div
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[#d8d0c2] bg-[#f7f3ec] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#776e62]">
                  Approximate location
                </p>
                <h2 className="text-2xl font-semibold" id={titleId}>
                  {country}
                </h2>
                <p className="mt-1 text-sm text-[#5f574f]">
                  {city} - {region}
                </p>
              </div>
              <button
                aria-label="Close map"
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-[#171717] transition hover:border-[#171717]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div
              aria-label={`Detailed approximate map for ${city}, ${country}`}
              className="relative mx-auto aspect-square w-full max-w-[30rem] overflow-hidden rounded-full border border-[#c6d3c6] bg-cover bg-center"
              style={{ backgroundImage: `url(${detailMap})` }}
            />

            <div className="mt-4 rounded-lg border border-[#d8d0c2] bg-white p-3 text-center">
              <p className="text-sm font-semibold text-[#171717]">
                {city}, {country}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#776e62]">
                Exact GPS is hidden. The red point marks the approximate city
                area.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
