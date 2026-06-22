import { NextResponse } from "next/server";
import sharp from "sharp";

import { getSupabaseConfig } from "@/lib/env";
import { getPublicShareArrival } from "@/lib/photos/public-share";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OgShareRouteProps = {
  params: Promise<{
    matchId: string;
  }>;
};

function safeFilename(city: string, country: string) {
  return `${city}-${country}-somewhere-og`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function createOgImage(input: Buffer) {
  const source = sharp(input, { failOn: "none" }).rotate();
  const background = await source
    .clone()
    .resize(1200, 630, { fit: "cover" })
    .blur(18)
    .modulate({ brightness: 0.72, saturation: 0.9 })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const foreground = await source
    .clone()
    .resize({
      width: 1100,
      height: 580,
      fit: "inside",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return sharp(background)
    .composite([
      {
        input: foreground.data,
        left: Math.round((1200 - foreground.info.width) / 2),
        top: Math.round((630 - foreground.info.height) / 2),
      },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

export async function GET(_request: Request, { params }: OgShareRouteProps) {
  const { matchId } = await params;
  const arrival = await getPublicShareArrival(matchId);

  if (!arrival) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = createServiceSupabaseClient();
  const { photoBucket } = getSupabaseConfig();
  const { data: imageFile, error } = await supabase.storage
    .from(photoBucket)
    .download(arrival.imagePath);

  if (error || !imageFile) {
    return new NextResponse("Image not found", { status: 404 });
  }

  const input = Buffer.from(await imageFile.arrayBuffer());
  const image = await createOgImage(input);

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Disposition": `inline; filename="${safeFilename(
        arrival.city,
        arrival.country,
      )}.jpg"`,
      "Content-Type": "image/jpeg",
    },
  });
}
