# Auto-post manual GetBizMusic ads to WINWINCAST

When you add an advertiser manually in `/admin`, the ad is also published on WINWINCAST as a curated link — automatically, with the link URL, image, business name, and description. Later edits and deletions keep the two in sync.

No form merging is needed. The two forms collect different things (GetBizMusic: image, city, plan, contact info; WINWINCAST: URL, title, description, category, country). GetBizMusic already holds everything WINWINCAST needs, so we map fields instead of syncing forms.

## Field mapping

| WINWINCAST | Comes from GetBizMusic |
|---|---|
| url | `https://getbizmusic.com/ad/{ad_number}` (the ad page) |
| title | Business name |
| description | Tagline (falls back to a short "Now streaming in {city}" line) |
| image_url | `https://getbizmusic.com/api/public/ad-image/{ad_number}` |
| category | Always **Local Business** (new category) |
| country | United States |
| added_by | `getbizmusic_sync` |
| status | Approved (skips the safety review pipeline) |

## Scope

- Only ads created through **Manual Ad Submission** in `/admin` auto-post. Paid/customer submissions do not.
- Editing a manual ad in `/admin` updates the WINWINCAST link.
- Deleting or expiring a manual ad removes the WINWINCAST link.
- If a manual ad is published to several cities, one WINWINCAST link is posted per ad number (one per city page created), matching the ad pages that exist.

## How it works (technical)

Two pieces, in two projects.

**A. WINWINCAST (separate project — must be built there)**
1. Add `local_business` ("Local Business") to `CATEGORIES` in `src/lib/links-shared.ts`, with a tag color.
2. New server route `src/routes/api/public/ingest/getbizmusic.ts` accepting POST/PATCH/DELETE, authenticated with a shared bearer secret (`GETBIZMUSIC_SYNC_SECRET`), validated with Zod.
   - Upsert on `external_ref` (new nullable text column + unique index on `links`) so repeat posts update rather than duplicate.
   - Writes with `supabaseAdmin` after verifying the secret; status `approved`, `added_by: 'getbizmusic_sync'`, no metadata fetch (we supply title/description/image directly).
   - DELETE removes the row by `external_ref`.

**B. GetBizMusic (this project)**
1. Add secret `WINWINCAST_SYNC_SECRET` (same value as above) plus a `WINWINCAST_INGEST_URL` constant.
2. New server-only helper `src/lib/winwincast-sync.server.ts` with `pushAd`, `updateAd`, `removeAd` — plain `fetch` to the ingest route with the bearer secret. Failures are logged and never block the admin action.
3. Call it from the existing admin server functions in `src/lib/ads.functions.ts`:
   - `createManualSubmission` → `pushAd` after the ad row is created (only when the submission is admin-manual and auto-approved).
   - Admin ad update → `updateAd`.
   - Admin ad delete → `removeAd`.
4. Track sync state on `ads`: new nullable `winwincast_synced_at` timestamp so `/admin` can show a small "On WINWINCAST" badge on the Currently Running row.

## Notes

- I can only edit this project directly. Part A must be applied in the WINWINCAST project — I'll give you the exact files and code to paste there (or you can run it as a prompt in that project), and the GetBizMusic side will be ready and waiting for it.
- The shared secret is stored as a secret in both projects, never in code.
