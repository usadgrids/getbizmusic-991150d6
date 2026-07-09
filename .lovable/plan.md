## Goal

When a user enters a valid US ZIP on the homepage that resolves to a real city but no active Get Biz Music city matches, show an inline "Request this city" form prefilled with the detected city/state so they can request coverage.

## Behavior

Homepage ZIP search has three states:

1. **ZIP matches an active city** — filter grid to that city (current behavior).
2. **Invalid / partial ZIP or text** — current behavior (no-match message).
3. **NEW: Valid 5-digit ZIP → real US city, but no active city match** — hide the city grid and render an inline request card in its place.

The card shows:

- Heading: "We're not in {City}, {ST} yet — Be the first Novelty Advertiser to request it in your zip code"
- Subtext explaining we'll email them when it launches
- Form fields:
  - City (prefilled from ZIP, editable, required)
  - State (prefilled, editable, required)
  - ZIP code (prefilled, editable, required)
  - Email (required)
  - Short message / note (optional textarea)
- Submit button → calls existing `submitCityRequest` server fn (extended to accept `zip` and `message`)
- Success state: replace form with a thank-you message

## Technical

- `**src/lib/cities.functions.ts**` — extend `submitCityRequest` input schema with `zip` (5-digit) and `message` (optional, max 500). Make `email` required. Insert those fields into `city_requests`.
- `**city_requests` table** — migration to add `zip text` and `message text` columns (both nullable for back-compat). Existing columns: `city_name`, `state`, `email`.
- `**src/routes/index.tsx**` — extend the ZIP effect: after `lookupZip` resolves, check whether any active city in `cities` matches. If none, set a `noMatchZip` state with `{ city, stateCode, zip }`. Render a new `<RequestCityForm />` inline in place of the empty grid.
- **New component** `src/components/biz/RequestCityForm.tsx` — controlled form with zod validation, calls `useServerFn(submitCityRequest)`, shows success state.

## Out of scope

- Notifying admins of new requests (already flows into `city_requests` table).
- Auto-launching cities.
- Non-US ZIPs.