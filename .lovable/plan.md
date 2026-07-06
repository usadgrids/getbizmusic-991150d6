
## The simple idea

One app, one admin, one database. City lives in the URL. The homepage at `www.getbizmusic.com/` is a **directory of active cities** users can click into. Each city page reuses the same template with the city name dynamically injected into the hero and everywhere else.

```text
getbizmusic.com/                → homepage: grid of ALL active cities
getbizmusic.com/national-city   → hero: "Get Biz Music National City, CA"
getbizmusic.com/bonita          → hero: "Get Biz Music Bonita, CA"
getbizmusic.com/mira-mesa       → hero: "Get Biz Music Mira Mesa, CA"
getbizmusic.com/admin           → one admin for all cities
```

Push an update once → every city updates instantly. Add a city = add one row → it appears on the homepage grid and gets its own branded page immediately.

---

## The `/` homepage (city directory)

The root page becomes a **city browser** — not a single city's page:

- Header/hero: "Get Biz Music — Find local business ads in your city"
- Big search box: "Search your city…" (filters the grid as you type)
- Grid of every active city as clickable cards:
  - City name, state, ad count (e.g. "Bonita, CA · 42 ads")
  - Optional small thumbnail
  - Click → `/bonita`
- Grouped by state, or shown as a flat searchable grid — whichever you prefer
- Footer CTA: "Don't see your city? [Request it]" (writes to `city_requests` table)

Reads from the `cities` table where `is_active = true`.

---

## Dynamic city hero (per city page)

Today `BizHero` has "Get Biz Music National City, CA" hard-coded in the graphic. We change it to:

- **Shared background/graphic style** stays the same across all cities
- **"Get Biz Music" wordmark** + **"{City}, {State}"** rendered as real styled text on top, matching your current fonts/colors/effects so it still looks like one branded piece
- Text pulled from the `cities` row matched to the URL slug

Result:
- `/national-city` → hero reads "Get Biz Music National City, CA"
- `/bonita` → hero reads "Get Biz Music Bonita, CA"
- `/mira-mesa` → hero reads "Get Biz Music Mira Mesa, CA"

Zero manual work per city. Google also indexes the city name as real text (great SEO).

Every other "National City" reference — navbar, "See more ads in {city}", Submit CTA ("Submit Your Own {City} Business Ad"), playlist marquee label, page title, meta description, OG tags — all pull from the same city row.

---

## What we'll build

### 1. `cities` table
Columns: `slug` (`bonita`), `name` (`Bonita`), `state` (`CA`), `lat`, `lng`, `timezone`, `is_active`, `sort_order`, optional `hero_tagline` / `hero_background_url` overrides.

### 2. `city_id` on existing tables
Added to `ads`, `ad_submissions`, `ad_payments`. Existing rows backfilled to National City.

### 3. `city_requests` table
For the "Request your city" footer form: `city_name`, `state`, `email`, `created_at`. Admin sees requests to decide which to activate next.

### 4. Route structure
```text
/                    → city directory (grid of active cities + search + "request city")
/$city               → city home (today's homepage template, dynamic branding)
/$city/ad/$adNumber  → ad detail
/$city/submit        → submit form (pre-fills city)
/admin               → unchanged, with Cities manager + city filter
```

Root layout resolves `$city` slug → city row once; child routes read it from route context. Unknown slug → `notFound()`.

### 5. Admin gains
- **Cities** section: add / edit / activate / deactivate / reorder cities
- **City Requests** section: see what users are asking for; one click to create + activate
- City dropdown filter on ads, submissions, payments

### 6. Per-city SEO automatically
Each `/$city` page auto-generates its own `<title>`, meta description, and OG tags from the city row. Sitemap `/sitemap.xml` generated from active cities so Google discovers new ones automatically.

---

## How new cities launch

- **One at a time (default):** `/admin` → Cities → "Add city" → slug + name + state → save. Instantly live at `/that-slug` AND appears on the homepage grid.
- **Bulk later (optional):** import US cities dataset (~30k rows) with `is_active=false`. Flip cities on as you're ready. Inactive slugs show "coming soon — be the first to advertise" and still capture submissions.

---

## How updates propagate

Nothing to propagate. It's one app. Edit a component once → Publish → every city serves the new version on the next request.

---

## Migration plan (in order)

1. Create `cities` + `city_requests` tables; seed National City, Bonita, Mira Mesa
2. Add `city_id` to `ads` / `ad_submissions` / `ad_payments`; backfill to National City
3. Build new `/` homepage: city grid + search + request form
4. Move current city page under `/$city` with root loader that resolves the city
5. Refactor `BizHero` to take `{cityName, state}` and render as styled text over the shared background
6. Replace every hard-coded "National City" with the current city name (hero, CTAs, marquee, SEO, admin labels)
7. Update all queries to filter by current city
8. Add Cities + City Requests management to `/admin`; add city filter to admin lists
9. Tag Stripe payments with `city_id`
10. Generate `/sitemap.xml` from active cities
11. (Later) bulk-seed US cities + coming-soon page

---

## What you get

- **Homepage becomes a real directory** — visitors landing on `getbizmusic.com` see every city and pick theirs
- **One codebase, one admin, one database** — updates apply everywhere instantly
- **Branded hero per city with zero manual work** — text overlay reads the city row
- **New city live in ~10 seconds** — and immediately visible on the homepage
- **Real per-city SEO** — Google sees `/bonita` as its own indexed page
- **Scales to thousands** — DB doesn't care if it's 3 cities or 30,000
- **User-driven growth** — the "request your city" form tells you where to expand next

Approve and I'll start with step 1 (the `cities` + `city_requests` tables and seed).
