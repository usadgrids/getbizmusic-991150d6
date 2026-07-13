
# Add Zelle payment option to ad checkout (synced with card pricing + rep codes + design upsell)

Add a "Pay with Zelle" alternative on the ad checkout that mirrors the Stripe flow's pricing rules exactly, applies rep-code discounts the same way, and follows up with a Pro Ad Design upsell email if the buyer isn't ready to submit. Zelle sends to **619-707-0467**. Buyer gets their submission link immediately; admin reconciles later in `/admin`.

## Pricing rules (must match card checkout)

Single source of truth is `AD_PLANS` in `src/lib/biz-utils.ts`. Zelle uses the same values — no hardcoding.

| Plan | Rotation | Full price | With rep code (50% off) |
|---|---|---|---|
| Standard Image Ad (`image_5`) | 7 seconds | **$24** | **$12** |
| Featured Slider Ad (`slider_10`) | 10 seconds | **$48** | **$24** |

Note: `src/components/biz/PricingBanner.tsx` currently displays $12 / $24 — that's the outdated banner. During this work I'll verify `AD_PLANS` shows $24 / $48 (matching Stripe checkout) and, if the banner is stale, update the banner numbers to match. No business-logic change beyond that display sync.

Rep-code logic: reuse the existing server-side validation in `createAdCheckout` (looks up `ad_reps` by normalized code, applies 50% off, records `rep_id / rep_code / commission_percent / commission_cents / discount_cents`). Zelle path calls the same helper.

## User-facing flow

`/pricing` → pick plan → two options:
- **Pay with Card (Stripe)** — unchanged
- **Pay with Zelle** — new

Zelle form collects:
- Business Owner Name *
- Business Name *
- Email *
- Phone *
- **Rep code (optional)** — same field as Stripe; live-shows discounted total when valid
- Terms + no-refund checkboxes (same disclosures as Stripe)

On submit:
1. Order created: `payment_method='zelle'`, `status='awaiting_zelle'`, `amount_cents` = discounted total, all rep fields populated.
2. Submission token issued immediately (auto-issue, per your earlier choice).
3. Confirmation screen shows:
   - Plan + exact amount due (e.g. "$24.00" or "$12.00 with rep code REP123")
   - "Send via Zelle to **619-707-0467**"
   - Memo: short order code (last 8 of session id)
   - **Submit Your Ad** button (uses token now)
   - Note: "Your ad goes live after we confirm your Zelle payment (usually within 24 hrs)."
4. `zelle-instructions` email sent immediately with same info.

## Design upsell email (if buyer doesn't submit)

Reuse the existing `submit-reminder` scheduling mechanism (already wired for Stripe orders) and add an upsell block:
- **New template `zelle-submit-reminder`** (or extend existing submit reminder) sent 24 hrs after order if `token_used=false`:
  - Reminder to submit their ad
  - **Upsell**: "Not ready? Let us design it for you — **Pro Ad Design $49.95**" with CTA link to `/design?token=<their-token>`
  - Reuses `DESIGN_PRICE_CENTS` from `src/lib/design.functions.ts` as the source of truth (no hardcoded $49.95 in the template — pulled from the constant so future price changes flow through).

## Admin flow (`/admin`)

- Zelle orders show `Zelle · Awaiting` badge and display owner name / business name / phone in the row detail.
- Rep code / discount shown same as Stripe orders.
- **Mark Zelle Paid** button on `awaiting_zelle` rows → flips to `paid`, fires the same `payment-receipt` + `paid-order-notification` (to `processing@getbizmusic.com`) emails already used for Stripe.
- **Cancel Zelle Order** button → sets `status='cancelled'`, `token_used=true` (invalidates submission).

## Data model

Migration adds to `ad_payments`:
- `payment_method text not null default 'stripe'` (`'stripe' | 'zelle'`)
- `owner_name text`, `business_name text`, `phone text` (nullable; Zelle only for now)
- Index on `(payment_method, status)`

Status `'awaiting_zelle'` is a new string value; the column is free-text today, so no enum change. Existing `rep_id / rep_code / commission_cents / discount_cents / commission_percent` columns are reused unchanged.

`stripe_session_id` gets a synthetic value `zelle-<uuid>` (same pattern as `free-religious-<uuid>`) so the unique constraint holds and Stripe code paths ignore it.

## Files to add / edit

**New**
- `supabase/migrations/<ts>_zelle_payment.sql`
- `src/lib/email-templates/zelle-instructions.tsx` — amount, Zelle #, memo, submit link
- `src/lib/email-templates/zelle-submit-reminder.tsx` — 24hr reminder + $49.95 design upsell (price from `DESIGN_PRICE_CENTS`)
- `src/components/biz/ZelleCheckoutForm.tsx`
- `src/components/biz/ZelleInstructions.tsx`

**Edit**
- `src/lib/email-templates/registry.ts` — register both new templates
- `src/lib/payments.functions.ts` — add:
  - `createZelleAdOrder` — validates fields, applies rep-code discount via the same helper `createAdCheckout` uses, inserts row, enqueues `zelle-instructions`, schedules `zelle-submit-reminder` (24hr)
  - `markZelleOrderPaid` — admin-gated (`has_role admin`), flips status, enqueues receipt + processing notification
  - `cancelZelleOrder` — admin-gated, invalidates token
- `src/routes/pricing.tsx` — Card/Zelle tabs; render `ZelleCheckoutForm` under Zelle; on success render `ZelleInstructions`
- `src/components/biz/PricingBanner.tsx` — sync displayed prices to $24 / $48 if `AD_PLANS` confirms those are current
- `src/routes/admin.tsx` — payment-method badge/column, Mark Paid + Cancel buttons for Zelle orders
- `src/lib/mcp/tools/get-pricing.ts` — note Zelle as alternate payment method

**Not touched**: `createAdCheckout` (Stripe), design checkout, free-religious flow, webhook.

## Test plan (preview)

1. `/pricing` → pick Featured Slider → **Pay with Zelle** tab.
2. Fill fields, enter valid rep code → total shows $24 (50% of $48). Submit.
3. Confirmation screen: shows $24, `619-707-0467`, memo code, Submit CTA.
4. `zelle-instructions` email received with matching details.
5. `/admin` shows the row with `Zelle · Awaiting` + rep code + discount.
6. Don't submit — wait to confirm the 24hr reminder email includes the **$49.95 Pro Design** upsell (or trigger the queue manually to verify template).
7. In `/admin`, click **Mark Zelle Paid** → receipt + processing emails send, status = paid.
8. Repeat without rep code → $48 charged.
9. Repeat with Standard Image → $24 (no rep) / $12 (with rep).
10. Confirm Stripe card checkout still works unchanged (`4242 4242 4242 4242`).
