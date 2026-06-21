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

## Photo Flow

1. Client requests `POST /api/uploads/signed-url` with image metadata and city/country display fields.
2. API creates a `photos` row and returns a Supabase signed upload URL.
3. Client uploads the original image directly to private Storage.
4. Client calls `POST /api/photos/complete`.
5. API downloads the private original, strips metadata, resizes to 1600px max, writes WebP output, and marks the photo `ready`.
6. A future worker matches ready photos to receivers and creates `photo_matches` rows.

## Location Policy

The product should show city and country, not exact user location. If browser GPS is used, the server should round coordinates or discard them after resolving a city.

Recommended display:

```txt
From Seoul, South Korea
From Reykjavik, Iceland
```

Avoid exact pins for end users.

## Token Flow

`POST /api/where/spend` returns a quote for a utility key:

```txt
60% burn
30% marketing treasury
10% rewards
```

The next implementation step is to create and verify Solana token transfer transactions before granting entitlements.

## Scaling Notes

- Do not proxy image downloads through the app server unless required for moderation.
- Prefer private bucket signed URLs for delivery.
- Use thumbnails for inbox grids.
- Expire free-user photos after 30 to 90 days.
- Keep long-term storage for saved collections or paid utilities.
