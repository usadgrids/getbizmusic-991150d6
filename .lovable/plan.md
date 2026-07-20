
## Goal

When a visitor lands on `/`, they immediately see and hear the Get Biz Music experience (ad slider + music mini-player) using **San Diego, CA** as the default city — instead of the current cities directory. A city switcher lives below the experience so they can jump to another active city or request a new one if theirs isn't live.

## Behavior

1. `/` loads the San Diego ad slider (`AdSlider`) and `MiniPlayer` immediately — same components as `/san-diego-ca`, with the yellow city banner reading "San Diego, CA".
2. Below the ad slider, a **"Not in San Diego? Pick your city"** section renders:
   - The existing ZIP search input.
   - The active-cities grid (filtered by ZIP or free-text search, cities with `ad_count > 0` only).
   - If the visitor's ZIP maps to a city that isn't live yet, the existing `RequestCityForm` shows (current behavior preserved).
3. Existing `/san-diego-ca` route continues to work unchanged (still linkable, still has its own SEO metadata).
4. Home page SEO metadata stays generic ("Get Biz Music — Local Business Ads in Your City") so `/` doesn't compete with the San Diego city page.

## Layout

```text
[ BizHero — "SAN DIEGO, CA" yellow band + flyer ]
[ AdSlider — featured San Diego ads ]
[ Submit Your Ad spotlight (existing city-page CTA, worded for San Diego) ]
------------------------------------------------------
[ "Not in San Diego? Explore other cities" heading ]
[ ZIP / city search input ]
[ City grid  OR  RequestCityForm (when ZIP has no active city) ]
------------------------------------------------------
[ BizFooter ]
[ MiniPlayer (sticky) ]
```

## Files touched

- `src/routes/index.tsx` — rewrite `Index`:
  - Loader also calls `getCityBySlug({ slug: "san-diego-ca" })` and `getActiveAds({ city_slug: "san-diego-ca" })` (in addition to `getActiveCities`).
  - Render `BizHero` + `AdSlider` + Submit CTA block at the top (mirroring `$city.index.tsx`).
  - Move the current ZIP search + city grid + `RequestCityForm` into a "Explore other cities" section below.
  - Add `<MiniPlayer />` at the bottom so music autoplay UX matches city pages.
  - Keep existing `head()` metadata (generic home-page copy). Do not copy the San Diego title/description.
- No changes to `$city.tsx`, `$city.index.tsx`, `BizHero`, `AdSlider`, `MiniPlayer`, or any server functions.

## Edge cases

- If San Diego has zero active ads at load time, the ad slider renders empty state as it does on the city page; the switcher below still works.
- If the San Diego city row is missing/inactive in the DB, the loader falls back to the current cities-only home page (no crash).
- Fallback keeps the request-city flow intact for ZIPs outside our active cities.

