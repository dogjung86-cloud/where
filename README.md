# SomeWhere

SomeWhere is a random world photo exchange powered by `$WHERE`.

Users send one current photo, receive moments from other cities, and can use `$WHERE` to unlock extra arrivals, try another city without sending again, and expand permanent vault storage.

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
5. Enable Google OAuth in Supabase Auth and add `/auth/callback` to the allowed redirect URLs.
6. Enable Supabase Auth Web3/Solana support for Phantom wallet sign-in.

The API uses the service role key only on the server to create signed upload URLs and process private photos.

## Railway Setup

Add these environment variables to the Railway service:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PHOTO_BUCKET=photos
IP_HASH_SECRET=
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=b5e995b9-0436-4ae6-b4d8-8f7fc4798f13
WHERE_TOKEN_MINT=FpVCcppMaLTMzcJPyhNGyKunch96vppavm6Lou3Epump
WHERE_BURN_WALLET=
WHERE_TREASURY_WALLET=9DpeHu3QSr3tkr4Mr6sLiriXKnUpDhgzh7tBg3FcZxBr
```

Railway uses `railway.json` and starts the app with `npm run start`. The healthcheck is `/api/health`.

## MVP API

- `GET /api/health`
- `POST /api/uploads/signed-url`
- `POST /api/photos/complete`
- `DELETE /api/photos/arrival`
- `POST /api/photos/arrival/utility`
- `GET /api/photos/inbox`
- `POST /api/photos/report`
- `POST /api/auth/profile`
- `POST /api/where/spend`

Authenticated API calls expect:

```http
Authorization: Bearer <supabase_user_jwt>
```

## Product Rules

- Store city/country display data, not precise public GPS.
- Strip EXIF before delivery.
- Store a 1600px display image and 400px thumbnail for each completed upload.
- After a completed upload, immediately try to deliver one eligible photo from another sender.
- Start users with a 10-arrival inbox limit; configured `$WHERE` holdings raise that limit by tier.
- Confirm before deleting an arrival, then hard delete the receiver's inbox record without deleting the sender's original photo.
- Price `Try another city` at 1,000 `$WHERE` and `Uncollected city` at 3,000 `$WHERE`.
- Use Phantom wallet popups for `$WHERE` utility payments once `WHERE_TOKEN_MINT` and treasury wallet are configured.
- Allow receivers to report sexual, abusive, graphic, spam, or other unsafe photos.
- Store hashed IP identifiers for moderation enforcement; do not expose raw IPs to users.
- Serve private images by signed URL only.
- Send `$WHERE` utility spend to the treasury wallet until burn routing is enabled.
- Use Google OAuth and Phantom wallet Web3 signatures as the MVP sign-in surfaces.
