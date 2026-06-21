# Somewhere

Somewhere is a random world photo exchange powered by `$WHERE`.

Users send one current photo, receive moments from other cities, and can use `$WHERE` to unlock extra arrivals, rerolls, and collection utilities.

## Stack

- Next.js app and API routes
- Railway deployment
- Supabase Postgres, Auth, and private Storage
- Solana wallet/token integration layer
- Sharp image normalization for EXIF stripping and WebP output

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

1. Create a Supabase project.
2. Create a private Storage bucket named `photos`.
3. Run `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL editor.
4. Copy project URL, anon key, and service role key into `.env.local`.

The API uses the service role key only on the server to create signed upload URLs and process private photos.

## Railway Setup

Add these environment variables to the Railway service:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PHOTO_BUCKET=photos
SOLANA_RPC_URL=
WHERE_TOKEN_MINT=
WHERE_BURN_WALLET=
WHERE_TREASURY_WALLET=
WHERE_REWARDS_WALLET=
```

Railway uses `railway.json` and starts the app with `npm run start`. The healthcheck is `/api/health`.

## MVP API

- `GET /api/health`
- `POST /api/uploads/signed-url`
- `POST /api/photos/complete`
- `POST /api/where/spend`

Authenticated API calls expect:

```http
Authorization: Bearer <supabase_user_jwt>
```

## Product Rules

- Store city/country display data, not precise public GPS.
- Strip EXIF before delivery.
- Serve private images by signed URL only.
- Start `$WHERE` spend split at 60% burn, 30% treasury, 10% rewards.
