import { createClient } from "@supabase/supabase-js";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR = path.join(process.cwd(), ".starter-source");
const OUTPUT_DIR = path.join(process.cwd(), ".starter-output");
const PHOTO_BUCKET = process.env.SUPABASE_PHOTO_BUCKET || "photos";

const STARTER_CITIES = [
  ["Seoul", "South Korea", "KR", "Seoul", 37.57, 126.98],
  ["Tokyo", "Japan", "JP", "Kanto", 35.68, 139.76],
  ["Osaka", "Japan", "JP", "Kansai", 34.69, 135.5],
  ["Taipei", "Taiwan", "TW", "Taipei", 25.04, 121.56],
  ["Hong Kong", "Hong Kong", "HK", "Hong Kong", 22.32, 114.17],
  ["Bangkok", "Thailand", "TH", "Bangkok", 13.76, 100.5],
  ["Singapore", "Singapore", "SG", "Central", 1.35, 103.82],
  ["Hanoi", "Vietnam", "VN", "Red River Delta", 21.03, 105.85],
  ["Ho Chi Minh City", "Vietnam", "VN", "Southeast", 10.78, 106.7],
  ["Manila", "Philippines", "PH", "Metro Manila", 14.6, 120.98],
  ["Jakarta", "Indonesia", "ID", "Java", -6.21, 106.85],
  ["Bali", "Indonesia", "ID", "Bali", -8.65, 115.22],
  ["Kuala Lumpur", "Malaysia", "MY", "Selangor", 3.14, 101.69],
  ["Delhi", "India", "IN", "Delhi", 28.61, 77.21],
  ["Mumbai", "India", "IN", "Maharashtra", 19.08, 72.88],
  ["Bengaluru", "India", "IN", "Karnataka", 12.97, 77.59],
  ["Kathmandu", "Nepal", "NP", "Bagmati", 27.71, 85.32],
  ["Dubai", "United Arab Emirates", "AE", "Dubai", 25.2, 55.27],
  ["Istanbul", "Turkey", "TR", "Marmara", 41.01, 28.97],
  ["Tel Aviv", "Israel", "IL", "Central Coast", 32.08, 34.78],
  ["Cairo", "Egypt", "EG", "Cairo", 30.04, 31.24],
  ["Casablanca", "Morocco", "MA", "Casablanca", 33.57, -7.59],
  ["Nairobi", "Kenya", "KE", "Nairobi", -1.29, 36.82],
  ["Cape Town", "South Africa", "ZA", "Western Cape", -33.92, 18.42],
  ["Lagos", "Nigeria", "NG", "Lagos", 6.52, 3.38],
  ["Accra", "Ghana", "GH", "Greater Accra", 5.56, -0.2],
  ["London", "United Kingdom", "GB", "England", 51.51, -0.13],
  ["Manchester", "United Kingdom", "GB", "England", 53.48, -2.24],
  ["Dublin", "Ireland", "IE", "Leinster", 53.35, -6.26],
  ["Paris", "France", "FR", "Ile-de-France", 48.86, 2.35],
  ["Lyon", "France", "FR", "Auvergne-Rhone-Alpes", 45.76, 4.84],
  ["Madrid", "Spain", "ES", "Community of Madrid", 40.42, -3.7],
  ["Barcelona", "Spain", "ES", "Catalonia", 41.39, 2.17],
  ["Lisbon", "Portugal", "PT", "Lisbon", 38.72, -9.14],
  ["Porto", "Portugal", "PT", "Porto", 41.15, -8.61],
  ["Rome", "Italy", "IT", "Lazio", 41.9, 12.5],
  ["Milan", "Italy", "IT", "Lombardy", 45.46, 9.19],
  ["Naples", "Italy", "IT", "Campania", 40.85, 14.27],
  ["Berlin", "Germany", "DE", "Berlin", 52.52, 13.4],
  ["Munich", "Germany", "DE", "Bavaria", 48.14, 11.58],
  ["Hamburg", "Germany", "DE", "Hamburg", 53.55, 9.99],
  ["Amsterdam", "Netherlands", "NL", "North Holland", 52.37, 4.9],
  ["Rotterdam", "Netherlands", "NL", "South Holland", 51.92, 4.48],
  ["Brussels", "Belgium", "BE", "Brussels", 50.85, 4.35],
  ["Zurich", "Switzerland", "CH", "Zurich", 47.38, 8.54],
  ["Vienna", "Austria", "AT", "Vienna", 48.21, 16.37],
  ["Prague", "Czech Republic", "CZ", "Prague", 50.08, 14.44],
  ["Warsaw", "Poland", "PL", "Masovian", 52.23, 21.01],
  ["Krakow", "Poland", "PL", "Lesser Poland", 50.06, 19.94],
  ["Budapest", "Hungary", "HU", "Central Hungary", 47.5, 19.04],
  ["Copenhagen", "Denmark", "DK", "Capital", 55.68, 12.57],
  ["Stockholm", "Sweden", "SE", "Stockholm", 59.33, 18.07],
  ["Oslo", "Norway", "NO", "Oslo", 59.91, 10.75],
  ["Helsinki", "Finland", "FI", "Uusimaa", 60.17, 24.94],
  ["Reykjavik", "Iceland", "IS", "Capital Region", 64.15, -21.94],
  ["Athens", "Greece", "GR", "Attica", 37.98, 23.73],
  ["Bucharest", "Romania", "RO", "Bucharest", 44.43, 26.1],
  ["Sofia", "Bulgaria", "BG", "Sofia", 42.7, 23.32],
  ["Zagreb", "Croatia", "HR", "Zagreb", 45.81, 15.98],
  ["Belgrade", "Serbia", "RS", "Belgrade", 44.81, 20.46],
  ["New York", "United States", "US", "New York", 40.71, -74.01],
  ["Los Angeles", "United States", "US", "California", 34.05, -118.24],
  ["San Francisco", "United States", "US", "California", 37.77, -122.42],
  ["Portland", "United States", "US", "Oregon", 45.52, -122.68],
  ["Seattle", "United States", "US", "Washington", 47.61, -122.33],
  ["Chicago", "United States", "US", "Illinois", 41.88, -87.63],
  ["Austin", "United States", "US", "Texas", 30.27, -97.74],
  ["Miami", "United States", "US", "Florida", 25.76, -80.19],
  ["Boston", "United States", "US", "Massachusetts", 42.36, -71.06],
  ["Denver", "United States", "US", "Colorado", 39.74, -104.99],
  ["Toronto", "Canada", "CA", "Ontario", 43.65, -79.38],
  ["Montreal", "Canada", "CA", "Quebec", 45.5, -73.57],
  ["Vancouver", "Canada", "CA", "British Columbia", 49.28, -123.12],
  ["Mexico City", "Mexico", "MX", "CDMX", 19.43, -99.13],
  ["Guadalajara", "Mexico", "MX", "Jalisco", 20.67, -103.35],
  ["Havana", "Cuba", "CU", "Havana", 23.11, -82.37],
  ["San Juan", "Puerto Rico", "PR", "San Juan", 18.47, -66.11],
  ["Bogota", "Colombia", "CO", "Bogota", 4.71, -74.07],
  ["Medellin", "Colombia", "CO", "Antioquia", 6.25, -75.57],
  ["Lima", "Peru", "PE", "Lima", -12.05, -77.04],
  ["Quito", "Ecuador", "EC", "Pichincha", -0.18, -78.47],
  ["Santiago", "Chile", "CL", "Santiago", -33.45, -70.67],
  ["Buenos Aires", "Argentina", "AR", "Buenos Aires", -34.6, -58.38],
  ["Mendoza", "Argentina", "AR", "Mendoza", -32.89, -68.85],
  ["Montevideo", "Uruguay", "UY", "Montevideo", -34.9, -56.16],
  ["Sao Paulo", "Brazil", "BR", "Sao Paulo", -23.55, -46.63],
  ["Rio de Janeiro", "Brazil", "BR", "Rio de Janeiro", -22.91, -43.17],
  ["Salvador", "Brazil", "BR", "Bahia", -12.97, -38.5],
  ["Sydney", "Australia", "AU", "New South Wales", -33.87, 151.21],
  ["Melbourne", "Australia", "AU", "Victoria", -37.81, 144.96],
  ["Brisbane", "Australia", "AU", "Queensland", -27.47, 153.03],
  ["Auckland", "New Zealand", "NZ", "Auckland", -36.85, 174.76],
  ["Wellington", "New Zealand", "NZ", "Wellington", -41.29, 174.78],
  ["Honolulu", "United States", "US", "Hawaii", 21.31, -157.86],
  ["Suva", "Fiji", "FJ", "Central", -18.14, 178.44],
  ["Doha", "Qatar", "QA", "Doha", 25.29, 51.53],
  ["Riyadh", "Saudi Arabia", "SA", "Riyadh", 24.71, 46.68],
  ["Beirut", "Lebanon", "LB", "Beirut", 33.89, 35.5],
  ["Amman", "Jordan", "JO", "Amman", 31.95, 35.93],
  ["Tbilisi", "Georgia", "GE", "Tbilisi", 41.72, 44.79],
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function citySlug(city, country, index) {
  return `${String(index + 1).padStart(3, "0")}-${slugify(`${city}-${country}`)}`;
}

async function listSourceFiles() {
  try {
    return await readdir(SOURCE_DIR);
  } catch {
    return [];
  }
}

function findSourceFile(files, slug) {
  const match = files.find((file) => {
    const parsed = path.parse(file);
    return (
      parsed.name === slug &&
      [".jpg", ".jpeg", ".png", ".webp"].includes(parsed.ext.toLowerCase())
    );
  });

  return match ? path.join(SOURCE_DIR, match) : null;
}

async function prepareImage(sourcePath, slug) {
  const processed = await sharp(sourcePath, { failOn: "none" })
    .rotate()
    .resize({
      width: 900,
      height: 1125,
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ effort: 5, quality: 72 })
    .toBuffer();
  const thumbnail = await sharp(processed)
    .resize(400, 400, { fit: "cover" })
    .webp({ effort: 4, quality: 64 })
    .toBuffer();

  return {
    processed,
    processedPath: `starter/generated/${slug}.webp`,
    thumbnail,
    thumbnailPath: `starter/thumbs/${slug}.webp`,
  };
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function uploadStarterPhoto(supabase, starterCity, image) {
  const [city, country, countryCode, region, lat, lng] = starterCity;

  for (const [storagePath, buffer] of [
    [image.processedPath, image.processed],
    [image.thumbnailPath, image.thumbnail],
  ]) {
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, buffer, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: true,
      });

    if (error) {
      throw new Error(`${storagePath}: ${error.message}`);
    }
  }

  const { error } = await supabase.from("starter_photos").upsert(
    {
      active: true,
      city_name: city,
      country_code: countryCode,
      country_name: country,
      display_lat: lat,
      display_lng: lng,
      processed_path: image.processedPath,
      region_name: region,
      storage_bucket: PHOTO_BUCKET,
      thumbnail_path: image.thumbnailPath,
    },
    { onConflict: "processed_path" },
  );

  if (error) {
    throw new Error(`${city}: ${error.message}`);
  }
}

async function main() {
  const shouldUpload = process.argv.includes("--upload");
  const shouldStrict = process.argv.includes("--strict");
  const supabase = shouldUpload ? getSupabaseClient() : null;
  const sourceFiles = await listSourceFiles();
  const manifest = [];
  const missing = [];

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (let index = 0; index < STARTER_CITIES.length; index += 1) {
    const starterCity = STARTER_CITIES[index];
    const [city, country] = starterCity;
    const slug = citySlug(city, country, index);
    const sourcePath = findSourceFile(sourceFiles, slug);

    if (!sourcePath) {
      missing.push(slug);
      continue;
    }

    const image = await prepareImage(sourcePath, slug);
    await writeFile(path.join(OUTPUT_DIR, `${slug}.webp`), image.processed);
    await writeFile(path.join(OUTPUT_DIR, `${slug}-thumb.webp`), image.thumbnail);

    if (supabase) {
      await uploadStarterPhoto(supabase, starterCity, image);
    }

    manifest.push({
      city,
      country,
      processedPath: image.processedPath,
      sourcePath,
      thumbnailPath: image.thumbnailPath,
    });

    console.log(`${String(manifest.length).padStart(3, "0")} ${city}, ${country}`);
  }

  await writeFile(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify({ manifest, missing }, null, 2),
  );

  if (missing.length && shouldStrict) {
    throw new Error(
      `Missing ${missing.length} starter source images in ${SOURCE_DIR}: ${missing
        .slice(0, 8)
        .join(", ")}${missing.length > 8 ? ", ..." : ""}`,
    );
  }

  console.log(
    `${shouldUpload ? "Uploaded" : "Prepared"} ${manifest.length} starter photos. Missing ${missing.length}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
