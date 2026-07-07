## Goal

Prepare BizMusic for multi-state expansion where two cities can share a name (e.g., Bonita, CA vs Bonita, TX), and make the admin panel easier to scan/sort by separating City and State.

## What the codebase already supports

- `cities` table already has `name`, `state`, and a unique `slug`. Routing uses `/$city` by slug, so same-name cities can already coexist as long as their slugs differ.
- The real risk is slug collisions and human ambiguity in the admin picker/list where we currently show `"Name, ST"` in one column.

## Plan

### 1. Slug convention for same-name cities (data hygiene)

- Standardize slugs as `name-state` (lowercased, e.g. `bonita-ca`) going forward.
- Add a DB uniqueness guarantee on `(lower(name), lower(state))` in `cities` so two rows can't represent the same real city, while `slug` stays globally unique.
- Existing single-name slugs (e.g. `bonita`) keep working — no URL breakage. New cities in other states get `-state` suffix.
- Add a small helper used by the admin "Create city" flow (if/when added) that auto-suggests `name-state` slug.

### 2. Admin panel: split City and State columns

In `src/routes/admin.tsx` Active Ads table:

- Replace the single "City" column with two columns: **City** and **State**.
- Both column headers become sortable (click to toggle asc/desc). Add sorting for Business, Ad Number, Type, Status, Expires while we're in there — same lightweight client-side sort.
- Search box also matches state (so "TX" narrows results).

### 3. Admin "Display in cities" picker (manual submission)

- Group the city checkboxes by **State**, with the state name as a subheading.
- Each checkbox label shows `City` with the state implied by its group, plus a small `ST` badge to keep it unambiguous when scanning.
- Add a quick filter input above the grid.

### 4. Public city label consistency

- Where we already render `"Name, ST"` (city hero, picker on `/`), keep as-is. No public URL changes.

## Technical notes

- Migration: add `CREATE UNIQUE INDEX cities_name_state_uniq ON public.cities (lower(name), lower(state));`. No data backfill needed unless duplicates already exist (we'll check first and only migrate if clean).
- Admin sort: local `useState` for `{key, dir}`, pure sort over `filteredLiveAds`. No server changes.
- `getActiveCities` already returns `state`; no server changes needed for the picker grouping.
- No changes to routes, RLS, or `ads`/`ad_submissions` schemas.

## Out of scope

- Renaming existing slugs or redirects.
- A full "create/edit city" admin UI (can be a follow-up).
