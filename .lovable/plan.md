
## Goal

After payment, the submit form lets the buyer choose any US city + state via a searchable dropdown. On admin approval, if that city doesn't exist yet, it's created automatically and the ad appears there. Same city+state reuses the existing page.

## Changes

### 1. Bundled US cities dataset
- Add `simple-maps`-style US cities JSON (~30k rows: `city`, `state`, `state_code`) as a lazy-loaded asset under `src/data/us-cities.json`.
- New helper `src/lib/us-cities.ts`:
  - `searchCities(query, limit=20)` — case-insensitive prefix/substring match on "City, ST".
  - `slugifyCity(name, stateCode)` → e.g. `austin-tx`.
  - `normalizeKey(name, stateCode)` → lowercase key for duplicate matching.

### 2. Submit form (`src/routes/submit.tsx`)
- Replace any current city selector with a **Combobox** (shadcn `Command` + `Popover`) that filters the bundled dataset as the user types.
- Required field. Stores `{ cityName, stateCode }` on the submission payload.
- Keep the "I'm not ready" reminder flow untouched.

### 3. Submission storage (`ad_submissions`)
- Migration: add nullable `requested_city_name text`, `requested_state_code text` (2-char). No `city_id` requirement at submission time — buyer's chosen city may not exist yet.
- `submitAd` server fn: validate the pair against the bundled dataset (server re-check) and persist to those columns.

### 4. Admin approval (`approveSubmission` in `src/lib/ads.functions.ts`)
- On approve, resolve target city:
  1. Look up `cities` by normalized `(lower(name), state_code)`.
  2. If found → use its `id`.
  3. If not → insert a new `cities` row: `name`, `state`, `slug` (from `slugifyCity`; on slug collision append `-2`, `-3`), `is_active=true`, `sort_order=999`, `hero_tagline=null`, `hero_background_url=null`. Grant defaults already cover it.
- Attach the ad to the resolved `city_id` as today. Edit re-approvals keep their existing `city_id` unless the buyer changed it.
- Rejections do NOT create a city (matches user's answer).

### 5. City page defaults
- `src/routes/$city.index.tsx` / hero component: when `hero_tagline` / `hero_background_url` are null, fall back to a default tagline ("Local businesses in {City}, {ST}") and a default hero image already in `src/assets/`. No visual regression for polished cities.

### 6. Admin queue UI (`src/routes/admin.tsx`)
- Show the buyer's requested "City, ST" on each pending row so admin sees where the ad will land.
- If the city is brand-new, show a small "Will create new city page" badge.

## Technical notes

- Dataset: use a public-domain US cities list (e.g. SimpleMaps free tier or `cities.json`), imported dynamically inside the Combobox so it doesn't bloat the initial bundle.
- Duplicate matching key: `lower(trim(name)) || '|' || upper(state_code)`. Add a partial unique index on `cities(lower(name), state_code)` to prevent races.
- Slug generation runs server-side in `approveSubmission`; retries on unique-violation with numeric suffix.
- `getActiveCities` already filters `is_active=true`; new auto-created cities show up on the home city list immediately after approval. If you prefer they stay hidden from the homepage until an admin adds a hero, we can default `is_active=false` — say the word and I'll flip it.

## Out of scope

- No changes to payment flow, email templates, or edit-ad flow.
- No admin UI for editing city hero image in this pass (existing DB fields already support it; can be a follow-up).
