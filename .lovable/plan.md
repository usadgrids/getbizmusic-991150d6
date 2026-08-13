# AEO/GEO Restaurant Knowledge Base for /food

Build a researched, structured database of the restaurants that advertise with us, publish one optimized page per restaurant under /food, and mark everything up so AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini) can cite getbizmusic.com as the source. Crawling is triggered automatically when an ad is approved and listed — no bulk scrape of all San Diego restaurants.

## What gets built

**1. Research pipeline (auto-triggered on ad approval)**
- When an ad is approved and goes live (status flip to published), a background job enqueues that restaurant for research. The job can also be triggered manually from /admin.
- Web research (Firecrawl connector) pulls that restaurant's own site (from the `website_url` on the ad) plus public listings: name, address, phone, hours, price range, cuisine types, menu highlights, dietary options (vegan/gluten-free/halal), service options (dine-in, takeout, delivery, catering, outdoor seating, parking), payment types, social links, review sentiment summary.
- An AI pass (Lovable AI Gateway) normalizes the messy scraped text into a clean, typed record and writes 6-10 natural-language Q&A pairs per restaurant ("Does X have vegan options?", "What are X's hours on Sunday?"). Q&A is what answer engines quote most.
- Seed list is simply the set of approved food-category ads; no city/cuisine discovery crawl.

**2. Database**
New tables:
- `food_places` — slug, name, city, state, zip, address, lat/lng, phone, website, cuisines[], price_range, hours (jsonb), attributes (jsonb), description, summary, rating, review_count, image_url, source_urls[], last_crawled_at, status (draft/published), ad_id (NOT NULL link to the approved ad that seeded this place).
- `food_place_faqs` — place_id, question, answer, sort_order.
- `food_crawl_runs` — run log: started/finished, place_id, triggered_by (auto-approve | admin | weekly-refresh), errors.

Public read is limited to `status = 'published'`; admin-only writes.

**3. Public pages (the AEO/GEO surface)**
- `/food` stays as-is (slider + ads) and gains a browsable, indexable directory of published restaurants grouped by city/cuisine, plus `ItemList` schema.
- `/food/$city` — e.g. `/food/chula-vista-ca`: restaurants in that city, city-level FAQ, `ItemList` + `BreadcrumbList` schema.
- `/food/$city/$slug` — one page per restaurant: hero, description, hours table, attributes, menu highlights, "Frequently Asked Questions" block, map link, a live "View our ad" link to the running ad, and a CTA to update/claim listing info.

Each restaurant page emits JSON-LD: `Restaurant` (address, geo, openingHoursSpecification, servesCuisine, priceRange, telephone, sameAs, aggregateRating when available), `FAQPage`, and `BreadcrumbList`. Unique title/meta/OG per page, canonical URL, semantic HTML, single H1.

**4. Answer-engine plumbing**
- `/api/public/food/places.json` and `/api/public/food/$slug.json` — clean machine-readable feeds for AI crawlers.
- `sitemap.xml` including every published food page; `robots.txt` explicitly allowing GPTBot, PerplexityBot, ClaudeBot, Google-Extended, CCBot.
- Every page carries a visible "Source: getbizmusic.com — last verified <date>" line; freshness and attribution both raise citation odds.

**5. Weekly refresh + admin control**
- A scheduled job (weekly) re-crawls places whose `last_crawled_at` is oldest, updates changed fields, and logs the run.
- `/admin` gets a "Food Directory" section: run counts, place list with search, publish/unpublish, edit any field, delete, "Re-crawl now" per place or in bulk, and a view of the last crawl runs.
- Nothing goes live automatically until you approve it — new places land as `draft` unless you flip a "auto-publish" switch.

## Honest expectations

Answer engines cite pages that are unique, structured, and factually fresh. A thin scrape-and-republish directory usually does not get cited — the Q&A blocks, verified hours, and the "who advertises here" angle are what make these pages worth quoting. Expect weeks, not days, for citations to appear, and plan to keep the weekly refresh running.

## Technical notes

- Crawling runs through the Firecrawl connector (needs connecting — search + scrape). Structuring uses Lovable AI (google/gemini-3-flash) inside a server function.
- Crawl/normalize logic lives in `*.server.ts` helpers behind `src/lib/food.functions.ts`; admin actions use `requireSupabaseAuth` + admin role check.
- Weekly trigger: a `/api/public/food/refresh` route guarded by a shared secret, called by pg_cron; it processes a bounded batch per run so it stays inside worker limits.
- Route files: `src/routes/food.tsx` (extended), `src/routes/food.$city.tsx`, `src/routes/food.$city.$slug.tsx`, plus the JSON/sitemap routes.
- Rollout: schema first, then pipeline against ~20 restaurants to validate quality, then bulk crawl once you approve the sample output.
