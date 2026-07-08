
## Goal

Introduce Ad Reps who earn commission when buyers use their unique code. Raise base prices, and give buyers 50% off when they enter a valid rep code (on /pricing and passed to Stripe).

## Pricing changes

- Standard Image Ad: **$12 → $24**
- Featured Slider Ad: **$24 → $48**
- Valid rep code → **50% off** ($12 or $24)

## New: Ad Reps

Admin-only management in /admin (new "Ad Reps" tab). Fields per rep:
- First Name, Last Name, Phone, Email
- Rep Code (unique, uppercase, auto-suggested from name, editable)
- Commission % (default 20%, editable per rep)
- Active toggle

Admin also sees, per rep: total sales attributed, total commission earned, list of attributed paid orders.

## Buyer flow

**/pricing page**
- New "Have a rep code? (optional)" input under the email field.
- Live validate (debounced) via a public server fn: returns `{ valid, halfOff }` — never exposes rep PII.
- When valid: show strikethrough base price + discounted price, "50% off applied — code REPXYZ".
- CTA amount and Stripe session reflect discounted amount.

**Stripe checkout**
- When a valid rep code is present, the server function builds the session with `price_data` for the discounted amount (product name unchanged) instead of the fixed price. This makes the discount work "on the Stripe checkout page" as well since the total shown is already the discounted total.
- `allow_promotion_codes` stays off (we manage discounts ourselves; avoids creating Stripe coupons per rep).
- Rep attribution and commission are stamped into session metadata + `ad_payments`.

## Data model (migration)

New table `public.ad_reps`:
- first_name, last_name, phone, email, code (unique, upper), commission_percent (numeric 5,2 default 20), active (bool default true), created_by (uuid), created_at, updated_at
- Grants for `authenticated` + `service_role`; RLS: admins (via `has_role`) can select/insert/update/delete; no anon access.
- Trigger to upper-case `code` and update `updated_at`.

Extend `public.ad_payments`:
- `rep_id uuid null references ad_reps(id) on delete set null`
- `rep_code text null`
- `discount_cents int not null default 0`
- `commission_cents int not null default 0`
- `commission_percent numeric(5,2) null`

Read view (or just query) for admin earnings summary per rep.

## Server functions

`src/lib/reps.functions.ts` (all admin-gated by `has_role`):
- `listReps` — reps + aggregated paid sales, discount total, commission total.
- `createRep` / `updateRep` / `deleteRep`.
- `listRepOrders({ repId })` — paid `ad_payments` rows attributed to the rep.

Public:
- `validateRepCode({ code })` → `{ valid: boolean, discountPercent?: 50 }` (no rep identity leaked).

Modify `createAdCheckout` in `src/lib/payments.functions.ts`:
- Accept optional `repCode`.
- Server-side re-validates code against `ad_reps` (active only). If invalid, ignore silently and charge full.
- Compute `unit_amount = base * (halfOff ? 0.5 : 1)`; build session with `line_items:[{ price_data:{ currency:'usd', product_data:{ name: product.name }, unit_amount }, quantity:1 }]`.
- Insert `ad_payments` with `rep_id`, `rep_code`, `discount_cents`, `commission_percent`, `commission_cents = round(unit_amount * commission_percent/100)`.

Webhook (`api/public/payments/webhook.ts`) — no logic change beyond flipping status to `paid`; commission already stamped at session creation.

## UI

**/admin** — add "Ad Reps" tab alongside existing tabs:
- Table: Name · Code · Commission % · Sales · Discounts given · Commission earned · Active · Actions (Edit / Delete)
- "Add Rep" dialog with the fields above; code auto-suggested (`FIRSTLAST` uppercased, ensure unique) but editable.
- Expand row → list attributed paid orders (date, plan, gross, discount, commission).

**/pricing** — rep code field + live-validated pill; discounted price display; updated CTA label.

## Price catalog

Update `AD_PLANS` in `src/lib/biz-utils.ts` to `{ image_5: { price: 24 }, slider_10: { price: 48 } }`. Update any hard-coded copy referencing "$12/$24" (pricing head/meta, footer, email templates that mention amounts) to the new base amounts. Amount charged is still authoritative from the created session.

## Out of scope

- Rep login / self-serve portal (admin-only for now).
- Payouts to reps (tracking only; you settle out of band).
- Stripe-native promotion codes / coupons.

## Files touched

- `supabase/migrations/*` — new migration for `ad_reps` and `ad_payments` columns.
- `src/lib/biz-utils.ts` — new base prices.
- `src/lib/payments.functions.ts` — rep code handling + dynamic price_data + commission stamping.
- `src/lib/reps.functions.ts` — new.
- `src/routes/pricing.tsx` — rep code UI + discounted price.
- `src/routes/admin.tsx` — new Ad Reps tab + dialogs.
- Minor copy fixes wherever "$12/$24" is hardcoded.
