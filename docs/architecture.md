# Architecture

## Services

```txt
Browser
  -> Next.js app on Railway
    -> Supabase Auth
    -> Supabase Postgres
    -> Supabase private Storage
    -> Solana RPC
```

Railway owns product logic. Supabase owns durable data and private media.

## Auth Flow

Google sign-in uses Supabase OAuth with the app callback at `/auth/callback`.
The callback exchanges the PKCE code in the browser and then syncs the
Supabase user into `public.profiles`.

Phantom sign-in uses Supabase Auth Web3/Solana. The wallet signs a short
Sign-In-With-Solana message, Supabase verifies the signature, returns a normal
Supabase session, and the app stores the verified wallet address on the profile
when it is present in the Supabase Auth identity metadata.

## Photo Flow

1. Client requests `POST /api/uploads/signed-url` with image metadata and city/country display fields.
2. API creates a `photos` row and returns a Supabase signed upload URL.
3. Client uploads the original image directly to private Storage.
4. Client calls `POST /api/photos/complete`.
5. API downloads the private original, strips metadata, writes a 1600px max WebP display image plus a 400px WebP thumbnail, and marks the photo `ready`.
6. The same completion request tries to claim one eligible `ready` photo from another sender, creates a `photo_matches` row, and returns a short-lived signed thumbnail URL for the arrival.
7. If the queue has no eligible photo, the sent photo remains `ready` until another receiver can claim it.

Before signed upload creation and upload completion, the API checks the
receiver's inbox usage. Free users start with a 10-arrival inbox limit; a
configured `$WHERE` token balance can raise that limit by tier. If the inbox is
full, the API returns an inbox-full message and the send flow stops.

Receivers can remove an arrival from their own inbox with
`DELETE /api/photos/arrival`. The UI asks for confirmation first, then the API
hard deletes the receiver's `photo_matches` row and expires that delivered photo
so it does not reappear in that receiver's storage. This does not delete the
sender's original photo or storage objects.

## Location Policy

The product should show city and country, not exact user location. If browser GPS is used, the server should round coordinates or discard them after resolving a city.

Recommended display:

```txt
From Seoul, South Korea
From Reykjavik, Iceland
```

Avoid exact pins for end users.

## Token Flow

`POST /api/where/spend` returns a quote for a utility key. If a Phantom wallet
address is supplied, the API creates a quote row and returns a serialized SPL
token transaction for the wallet to sign:

```txt
50% burn
50% marketing treasury
```

`PATCH /api/where/spend` verifies the on-chain transaction against the quoted
burn, treasury transfer, and memo before marking the spend
confirmed. `POST /api/photos/arrival/utility` then applies confirmed spends:
`Try another city` hides the target arrival and claims a different city;
`Uncollected city` claims a city not already present in the receiver's passport
when one is available.

## Safety Reports

Receivers can report an arrived photo for sexual content, abuse or exploitation,
graphic violence, spam, or other unsafe content. `POST /api/photos/report`
creates a moderation record, increments the photo report count, and marks the
photo as `reported`.

Upload and report IPs are stored as HMAC hashes, not raw IP strings. Moderators
can add a hash to `banned_ip_hashes` after review. Future uploads from the same
hashed IP are blocked before a signed upload URL is created. Avoid automatic
permanent bans from a single report because shared or rotating IPs can punish
unrelated users.

## Scaling Notes

- Do not proxy image downloads through the app server unless required for moderation.
- Prefer private bucket signed URLs for delivery.
- Use thumbnails for inbox grids.
- Expire free-user photos after 30 to 90 days.
- Keep long-term storage for saved collections or paid utilities.
