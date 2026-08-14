# Redesign Home Page (/) as a Category Directory

## Goal
Replace the current city/ZIP-based home page with a clean, professional **category directory** landing. Visitors see the two live categories (Food & Dining, Beauty & Grooming), pick one to enter its hub, and a fast-sliding strip of real advertiser thumbnails runs above the cards. The global streaming music player (already mounted in `__root.tsx`) stays so visitors can listen while browsing. This implements the approved "Premium directory grid" (v1) design direction.

Locked design tokens (from the preference round):
- Palette: navy `#0F2A4A` / `#153a66`, gold `#D4A24C` / `#F4C430`
- Typography: **Sora** (headings) + **Manrope** (body) — applied on the home page only
- Layout: hero + card grid

## What changes

### 1. `src/routes/index.tsx` — full rewrite of the page body
- **Loader**: drop `getActiveCities`, `getCityBySlug`, and the default-city `getActiveAds` calls. Replace with two `ensureQueryData` calls to `getAdsByCategory` — one for `food` industries, one for `beauty` industries (both via `DIRECTORY_CATEGORIES[...].industries`), with `seed_key` of the category slug.
- **Component** renders (top to bottom):
  1. `<BizNavbar />` (existing sticky nav — keeps consistent site chrome + Submit Ad link).
  2. **Hero header** (navy band, centered): brand line, a Sora headline (e.g. "Find Your Vibe" with gold accent on one word), one-line value prop ("Curated business directories with music streaming."), and a gold "Submit Your Ad" CTA linking to `/pricing`.
  3. **Fast-sliding advertiser marquee**: a horizontally auto-scrolling strip (CSS `@keyframes` translateX, ~20s loop, pause on hover) of small rounded thumbnail tiles (~64px). Source images = real category ads (from the two `getAdsByCategory` queries) **plus** the `showcaseAds` placeholders from `DIRECTORY_CATEGORY_UI` for food and beauty so the strip is never empty. Edge fade gradients on left/right. Each tile is non-interactive (decorative).
  4. **Category card grid** (3 columns desktop / 1 column mobile):
     - **Food & Dining** card → links to `/food`, `target="_blank" rel="noopener noreferrer"`. Background = `DIRECTORY_CATEGORY_UI.food.heroImage` with a navy gradient overlay; Sora title + hover-reveal tagline; lifts on hover with gold border.
     - **Beauty & Grooming** card → `/beauty`, same treatment, `beauty` hero image.
     - **More categories coming soon** tile: dashed border, muted, with a pinging gold dot.
  5. **CTA area**: gold "Submit Your Ad" (→ `/pricing`) + outline "Advertise" (→ `/submit`) buttons.
  6. `<BizFooter />`.
- **Head metadata**: update `title`/`description`/`og` to describe the category directory ("Browse Get Biz Music business categories — Food & Dining, Beauty & Grooming — with music streaming."). Keep existing `og:image` (absolute URL) and canonical. No change to `og:type`/twitter card.

### 2. `src/routes/__root.tsx` — add Sora + Manrope fonts
- Append `Sora:wght@600;700;800` and `Manrope:wght@400;500;600;700` to the existing Google Fonts `<link>` stylesheet URL (keep Fraunces + Inter so other pages are unaffected). No `@import` in `styles.css`.
- The home page applies the fonts via local Tailwind arbitrary classes (`font-['Sora']`, `font-['Manrope']`) — no global CSS token change required.

## What stays unchanged
- `/food` and `/beauty` hub pages, `CategoryHubPage`, `AdSlider`, `GlobalMiniPlayer`, `BizHero`, all category/directory routes, all admin/city/activate routes.
- The global music player mounting in `__root.tsx`.
- `getAdsByCategory` and `DIRECTORY_CATEGORY_UI` APIs (used as-is).

## Out of scope (intentional)
- No new categories invented — only the two existing ones plus the "coming soon" tile.
- City/ZIP picker removed from the home page (it remains available on city pages). Per the strategy pivot, the home is category-first.
- Fonts change is home-page-scoped only; other routes keep Fraunces + Inter.

## Verification
- `bunx tsgo` typecheck passes.
- Visit `/` in the preview: hero shows, marquee scrolls advertiser thumbnails, two category cards link to `/food` and `/beauty` in a new tab, "coming soon" tile renders, music player still visible at bottom, Submit CTA works.
- Mobile viewport: single-column grid, no horizontal overflow (existing `overflow-x: clip` global rule covers it).
