
## Goal

1. Massively expand the industry/category list on the ad submission form so it covers the full range of small businesses (car dealers, accountants, convenience stores, life insurance agents, business opportunities, and many more).
2. Add three explicitly religious categories: **Churches, Religious Services, Ministries**.
3. When the ad slider lands on an ad in one of those three religious categories, automatically swap the background music to a Christian YouTube playlist. Swap back to the regular playlist for any other category.

## How fast can the swap happen?

The MiniPlayer uses a single persistent YouTube IFrame player. Swapping playlists calls `player.loadPlaylist({ list: <new-id> })`:

- No page reload — the iframe stays mounted.
- Music from the new playlist typically begins in **~300–800 ms** (a bit longer on cold/mobile connections, roughly up to ~1 s).
- The old track cuts out the instant we call `loadPlaylist`, so the silence gap is sub-second in the common case.

Fast enough to feel intentional on 7–10 s ad rotations, but not frame-perfect. To avoid whiplash we only swap when the *mood class* actually changes (religious ↔ secular), not on every slide.

## 1. Expanded category list

Edit `src/lib/biz-utils.ts` and replace `INDUSTRIES` with a grouped, comprehensive list. Values are stable slugs (used in DB, search, filters); labels are what users see.

Proposed set (grouped for readability; single flat array in code):

- **Food & Hospitality**: restaurant, cafe_coffee, bakery, food_truck, catering, bar_nightlife, hotel_lodging
- **Retail & Shopping**: retail, convenience_store, grocery, liquor_store, boutique_apparel, jewelry, florist, gift_shop, thrift_secondhand, farmers_market
- **Automotive**: auto_repair, auto_dealer, auto_body, tires_wheels, car_wash, towing, motorcycle_powersports, rv_boat
- **Home & Trades**: home_services_general, plumbing, electrical, hvac, roofing, landscaping_lawn, pest_control, cleaning, moving_storage, handyman, painting, flooring, pool_spa, solar, locksmith
- **Professional Services**: legal, accounting_tax, financial_advisor, insurance_general, life_insurance, health_insurance, auto_insurance, mortgage_lending, real_estate_agent, real_estate_broker, property_management, notary, marketing_agency, web_design_it, business_consulting, business_opportunities, franchise_opportunity, staffing_recruiting, printing_signs
- **Health & Wellness**: healthcare_general, dental, chiropractic, optometry, physical_therapy, mental_health_counseling, medical_spa, veterinary, pharmacy, urgent_care, fitness_gym, personal_trainer, yoga_pilates, nutrition
- **Beauty & Personal Care**: salon_hair, barbershop, nail_salon, spa_massage, tattoo_piercing, lash_brow, esthetician
- **Family, Pets & Education**: childcare_daycare, tutoring, music_lessons, dance_school, martial_arts, private_school, pet_grooming, pet_boarding, dog_training
- **Events & Creative**: photographer, videographer, event_planner, dj_entertainment, wedding_services, party_rentals
- **Community & Nonprofit**: church, religious_services, ministry, nonprofit, community_org
- **Other**: transportation_rideshare, delivery_courier, security_services, funeral_services, agriculture, other

Also export a small helper `RELIGIOUS_INDUSTRY_VALUES = ["church", "religious_services", "ministry"] as const` and a `isReligiousIndustry(value: string): boolean` so the slider and any future analytics share one source of truth.

**Compatibility note:** existing rows in the DB already have values like `restaurant`, `legal`, `salon`, `auto`, `healthcare`, `realestate`, `retail`, `services`, `other`. Keep those literal values in the list (as legacy-compatible entries or by mapping their labels onto the new richer ones) so existing ads still resolve to a human label in `AdSlider`'s `industryLabel()` lookup. Concretely: keep `auto`, `salon`, `healthcare`, `realestate`, `services` as aliases pointing at sensible labels, and add the new granular slugs alongside them. No DB migration needed — `industry` is free-text.

## 2. Two music playlists

In `src/components/biz/MiniPlayer.tsx`:

- Keep `PLAYLIST_ID` as the default (secular) playlist.
- Add `CHRISTIAN_PLAYLIST_ID` (you'll supply the YouTube playlist ID — the part after `list=` in the playlist URL; placeholder until then).
- Add a new event constant `MINIPLAYER_SET_PLAYLIST_EVENT = "miniplayer:set-playlist"` with payload `{ mood: "secular" | "religious" }`.
- Track the currently loaded mood in a ref. On event:
  - If the mood matches the current mood → no-op (do NOT interrupt playback).
  - If it changes → call `player.loadPlaylist({ listType: "playlist", list: <chosenId>, index: randomIndex })`, preserve mute/volume, and re-publish the playlist via `MINIPLAYER_PLAYLIST_EVENT` so the marquee updates.
  - If the user has manually paused music, update the queued playlist but do NOT call `playVideo()` — respect their pause.

## 3. AdSlider: emit mood on ad change

In `src/components/biz/AdSlider.tsx`:

- Import `isReligiousIndustry` and `MINIPLAYER_SET_PLAYLIST_EVENT`.
- Add a `lastMoodRef` and an effect keyed on `current?.id`:
  - Compute `mood = isReligiousIndustry(current.industry) ? "religious" : "secular"`.
  - If `mood !== lastMoodRef.current`, dispatch `new CustomEvent(MINIPLAYER_SET_PLAYLIST_EVENT, { detail: { mood } })` and update the ref.
- No visual change to the slider itself.

## 4. Surfaces that consume the category list (auto-updated)

The following already read from `INDUSTRIES` and will pick up the new entries with no code change:

- Submit form (industry dropdown).
- Admin / edit-ad screens.
- `AdSlider` search suggestions and label rendering.

Double-check `src/routes/submit.tsx`, `src/routes/edit-ad.tsx`, and `src/routes/admin.tsx` after the change to confirm the dropdown renders the fuller list cleanly (may want to visually group with `<optgroup>` — optional polish).

## 5. Non-goals (out of scope this turn)

- No per-ad music override (only category drives it).
- No crossfade — the YT IFrame API doesn't expose one from a single player.
- No pricing changes for church/ministry ads — they use existing ad plans.
- No DB migration.

## Technical notes

Files touched:
- `src/lib/biz-utils.ts` — expanded `INDUSTRIES`, add `RELIGIOUS_INDUSTRY_VALUES`, `isReligiousIndustry`.
- `src/components/biz/MiniPlayer.tsx` — second playlist ID, `MINIPLAYER_SET_PLAYLIST_EVENT`, mood-aware `loadPlaylist` handler.
- `src/components/biz/AdSlider.tsx` — dispatch mood on current-ad change.

Need from you:
- The **YouTube playlist ID** for the Christian music playlist (the value after `list=` in the URL). Until you provide it, I'll wire in a clearly-marked placeholder constant so the code compiles and the swap logic can be tested with a temporary playlist.
