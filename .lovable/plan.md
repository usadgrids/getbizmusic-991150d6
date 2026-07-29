## Goal

Replace the several inconsistent city-switch CTAs with a single reusable module: a modal city picker that works identically on every page, keeps the music playing (no navigation, no new tabs), and always offers the "be the first advertiser" path when no city page exists yet.

## The one module

New component `src/components/biz/CityPickerModal.tsx` — a dialog containing all city-switch logic:

1. **Search input** — accepts a 5-digit ZIP or a city name (same behavior currently living in `src/routes/index.tsx`: `lookupZip` / ZIP→city resolution, plus name/state text matching).
2. **Results** — active cities that have at least one running ad, each shown with state and ZIP list, linking to `/$city` in the same tab.
3. **No match / new city** — the "First Advertiser Opportunity" panel appears immediately under the search box: headline naming the resolved city and state, and a **Submit Ad** button going to `/pricing` with the city, state, and ZIP passed along so checkout and `/submit` prefill it. No separate "request a city" form in this path — paying creates the city page automatically, which is the behavior already wired through submission.
4. **Fallback** — if the text typed matches nothing and isn't a valid ZIP, show a short "enter a ZIP or city name" hint rather than a dead end.

A small `useCityPicker` trigger (or exported `<CityPickerButton>`) so any CTA can open it with one prop.

## Where it gets wired

| Location | Today | After |
|---|---|---|
| `src/routes/$city.index.tsx` — "Select Another City" | Link to `/` | Opens the modal |
| `src/routes/index.tsx` — "Not in San Diego? Pick your city" section | Inline bespoke search + first-advertiser panel | Section keeps its heading and search box, but rendered by the shared module so behavior matches |
| `src/components/biz/BizFooter.tsx` | No city switcher | Add a "Change city" link that opens the same modal |
| Ad detail page `src/routes/ad.$adNumber.tsx` | No switcher | Add the same trigger next to the existing spotlight CTA |

The home page keeps its full "Listen To Music & View Ads In These Cities" grid; only the search + first-advertiser logic is deduplicated into the module.

## Cleanups

- Delete the now-unused `src/components/biz/RequestCityForm.tsx` (nothing imports it), unless you want to keep a request form as a secondary option — say the word and I'll leave it as a "just notify me instead" link inside the modal.
- Remove the duplicated ZIP/filter state from `src/routes/index.tsx` once it consumes the module.

## Technical notes

- Modal built on the existing shadcn `Dialog`; no route change, so `MiniPlayer` never unmounts and audio continues.
- City list comes from the existing `getActiveCities` server function via the already-cached `["active-cities"]` query key — no new backend work, no schema change.
- ZIP lookups keep using the lazy `src/lib/us-zips.ts` dataset, so the dataset is only fetched when the modal opens.
- All navigation uses `<Link to="/$city" params={...}>` in the same tab (no `target="_blank"`), matching the recent change you asked for.
