# One Master Template for Knowledge Graph Pages

## Short answer to your question

No — you never create thousands of page files. Even today, `/food/casa-del-sol` is not a file on disk; it is one dynamic route that reads the listing from the database at request time. Thousands of advertisers = thousands of URLs, but still one template.

The real duplication right now is per **category**: `/food` and `/beauty` each have their own hub file, and `/food/$slug` and `/beauty/$slug` each have their own listing file. Add "auto" or "fitness" tomorrow and that's four more files. That is what this plan removes.

Recommendation: **keep the current URL shape** (`/food/casa-del-sol`, `/beauty/glow-nails`) — it is the best for SEO and answer engines, nothing already indexed breaks — but serve every category from a single master template, and make categories a config entry instead of a set of files.

## What gets built

**1. One master listing template**
A single dynamic route handles every advertiser page for every category. It looks up the category from the URL, loads the listing from the database, and renders the existing `DirectoryPlaceView` with its JSON-LD schema, FAQs, hours, and metadata. `/food/$slug` and `/beauty/$slug` stop being separate files.

**2. One master category hub template**
A single hub route renders `/food`, `/beauty`, and any future category. Title, description, hero image, intro copy, industry list, and showcase ads all come from a category config record rather than hand-written page code.

**3. Category registry**
Categories are defined in one place (extending the existing `directory-categories.ts` config): slug, display title, noun, industry list, schema.org type, hero asset, hub copy. Adding a category = adding one entry. The activation pages (`/food/activate`, `/beauty/activate`) collapse into the same pattern.

**4. Unknown categories 404 cleanly**
Only slugs present in the registry resolve; anything else returns a proper not-found page so crawlers don't index junk URLs.

**5. Sitemap stays automatic**
`sitemap.xml` continues to enumerate every published listing across all categories from the database, so each new advertiser URL is discoverable the moment it is published.

## Technical notes

- New files: `src/routes/$category.tsx` style dynamic hub + `$category_.$slug.tsx` listing template, guarded by a registry lookup in `beforeLoad` so they never shadow real routes (`/admin`, `/pricing`, `/submit`, `/ad`, `/activate`, city routes).
  - Given the site already uses top-level `/$city` routing, the guard order and the city-vs-category precedence must be explicit: category slugs are checked first against the registry, then fall through to city resolution.
- Deleted: `food.tsx`, `beauty.tsx`, `food_.$slug.tsx`, `beauty_.$slug.tsx`, `food_.activate.tsx`, `beauty_.activate.tsx` — their content moves into the templates and the registry.
- `directory.functions.ts` category validation changes from a hard-coded `z.enum(["food","beauty"])` to a registry-derived check, so new categories work without touching server code.
- `food_places.category` stays a text column; no migration required.
- URLs, canonicals, and existing metadata behavior are preserved exactly.

## Result

Adding a new Knowledge Graph category becomes a one-entry config change. Adding a new advertiser stays fully automatic — approve the ad, research runs, the listing publishes, and its unique URL is live on the shared template with no page creation at all.
