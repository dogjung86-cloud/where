import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPublicAppUrl,
  getPublicShareArrival,
} from "@/lib/photos/public-share";

type SharePageProps = {
  params: Promise<{
    matchId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { matchId } = await params;
  const arrival = await getPublicShareArrival(matchId);

  if (!arrival) {
    return {
      title: "SomeWhere arrival",
      description: "A shared photo arrival from SomeWhere.",
    };
  }

  const title = `${arrival.city}, ${arrival.country} on SomeWhere`;
  const description =
    "I received this moment on SomeWhere. Send one photo, receive somewhere.";

  return {
    title,
    description,
    metadataBase: new URL(getPublicAppUrl()),
    openGraph: {
      title,
      description,
      images: [
        {
          url: arrival.imageUrl,
          width: 1200,
          height: 1500,
          alt: title,
        },
      ],
      type: "article",
      url: arrival.shareUrl,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [arrival.imageUrl],
    },
  };
}

export default async function ShareArrivalPage({ params }: SharePageProps) {
  const { matchId } = await params;
  const arrival = await getPublicShareArrival(matchId);

  if (!arrival) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-4 py-8 text-[#171717]">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div>
          <p className="text-sm font-medium text-[#776e62]">
            SomeWhere arrival
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            {arrival.city}, {arrival.country}
          </h1>
        </div>

        <Image
          alt={`Arrival from ${arrival.city}, ${arrival.country}`}
          className="max-h-[72vh] w-full rounded-lg border border-[#d8d0c2] object-contain"
          height={1500}
          src={arrival.imageUrl}
          unoptimized
          width={1200}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d8d0c2] bg-white px-4 py-3">
          <p className="text-sm text-[#5f574f]">
            Send one photo, receive somewhere. Powered by $WHERE.
          </p>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#171717] px-4 text-sm font-semibold text-white"
            href="/"
          >
            Open SomeWhere
          </Link>
        </div>
      </section>
    </main>
  );
}
