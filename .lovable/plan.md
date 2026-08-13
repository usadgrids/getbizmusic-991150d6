# AEO/GEO Knowledge Base for /beauty (and /food)

Short answer: yes. We can research each salon, barbershop, or nail spa you approve, store a clean structured record in our database, and publish a per-business page marked up so AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini) can quote getbizmusic.com.

Important: the database tables for this already exist from the earlier /food plan, but the pipeline and pages were never built. So this build covers both categories at once with one shared engine, rather than duplicating anything.

## What gets built

**1. One shared "places" engine (not food-only)**
- Add a `category` field (`food` | `beauty`) to the existing place tables so both directories share one pipeline, one admin screen, and one set of page templates.
- Research runs only for businesses you approve — no bulk scraping.

**2. Research pipeline**
- Trigger: an ad flips to published in a beauty/food category, or you press "Research now" in /admin.
- Firecrawl scrapes the business's own site plus public listings.
- A Lovable AI pass normalizes messy text into a typed record: name, address, phone, hours, price range, services offered, specialties (balayage, fades, gel/dip, lash extensions, kids' cuts), booking link, walk-in vs appointment, parking, payment types, languages spoken, social links.
- Same pass writes 6-10 natural-language Q&A pairs per business ("Does X do walk-in haircuts on Sunday?", "How much is a gel manicure at X?"). Q&A is what answer engines quote most.

**3. Public pages**
- `/beauty` and `/food` keep their slider and activation bar, and gain an indexable directory of published businesses.
- `/beauty/$slug` (and `/food/$slug`) — one page per business: hero, description, services, hours table, attributes, FAQ block, map link, live "view our ad" link, and a "claim/update this listing" CTA.
- JSON-LD per page: `HealthAndBeautyBusiness` / `HairSalon` / `NailSalon` / `BarberShop` (or `Restaurant` for food), plus `FAQPage` and `BreadcrumbList`. Unique title/meta/OG, canonical, single H1.
- Visible "Source: getbizmusic.com — last verified <date>" line; freshness raises citation odds.

**4. Answer-engine plumbing**
- `/api/public/directory/places.json` and `/api/public/directory/$slug.json` machine-readable feeds.
- `sitemap.xml` listing every published page; `robots.txt` explicitly allowing GPTBot, PerplexityBot, ClaudeBot, Google-Extended, CCBot.

**5. Admin control**
- A "Directory" section in /admin: filter by category, search, publish/unpublish, edit any field, edit the Q&A, delete, "Re-crawl now" per business or in bulk, and the last crawl runs with errors.
- New places land as drafts unless you flip auto-publish on.
- A weekly refresh job re-crawls the stalest records so hours and prices stay accurate.

## Honest expectations

Thin scraped directories don't get cited. What earns citations is the Q&A block, verified hours/prices, and the "these businesses advertise here" angle. Expect weeks, not days, and the weekly refresh has to keep running.

## Technical notes

- Requires connecting the Firecrawl connector (search + scrape). Structuring uses Lovable AI (google/gemini-3-flash).
- Crawl/normalize logic in `*.server.ts` behind `src/lib/directory.functions.ts`; admin actions use `requireSupabaseAuth` plus an admin role check.
- Migration: add `category` to `food_places` / `food_crawl_runs`, backfill to `food`, plus public-read policies scoped to `status = 'published'`.
- Weekly trigger: `/api/public/directory/refresh` guarded by a shared secret, called by pg_cron, bounded batch per run.
- Rollout: schema + admin first, then run the pipeline on 3-5 approved beauty businesses so you can judge output quality before we open it up.
