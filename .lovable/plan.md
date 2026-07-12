## Goal
Update the "Submit Later Reminder" email with new pro-design CTA copy, and add a `/design` checkout page ($49.95) for done-for-you ad design, with a post-payment intake form and receipt email promising delivery within 72 hours.

## 1. Update reminder email template
`src/lib/email-templates/submit-reminder.tsx`
- Keep the existing "Not a designer?" DIY line.
- Below it, add a callout block:
  - Heading/lede: "Want it done right, guaranteed to pass compliance?"
  - Body: "Prefer to leave it to the pros? Our team will professionally design your BizSpot Music–compliant ad for just $49.95 — done for you, guaranteed to meet spec."
  - CTA button (gold): **Yes — Design My Ad for $49.95** linking to `https://www.getbizmusic.com/design?email={recipientEmail}`.
- Add `recipientEmail` to `Props` and `previewData` so the link is prefilled.

## 2. New `/design` route (checkout page)
`src/routes/design.tsx`
- Landing content: benefits (compliant spec, delivered within 72 hrs, one free revision), price $49.95, email field (prefilled from `?email=` query), agreement checkboxes (terms + no-refund, mirroring `submit` flow).
- On submit → call new server fn `createDesignCheckout` and mount Stripe embedded checkout (same pattern as ad checkout in `src/routes/submit.tsx`/`checkout.return.tsx`).
- `return_url` → `/design/return?session_id={CHECKOUT_SESSION_ID}`.
- SEO head(): title/description for the design service.

## 3. Checkout server function
`src/lib/design.functions.ts` — new file with `createDesignCheckout` (mirrors `createAdCheckout` in `src/lib/payments.functions.ts`):
- Inputs: `customerEmail`, `returnUrl`, `environment`, `agreedTerms`, `agreedNoRefund`.
- Uses Stripe `price_data` with `unit_amount: 4995`, product name "BizSpot Music Pro Ad Design".
- Persists a row in new table `design_orders` (pending → paid via webhook), with the same disclosure/consent fields.
- Returns `{ clientSecret }`.

Also add `lookupDesignBySession` (mirrors `lookupCheckoutBySession`) that flips the row to paid on Stripe confirmation and enqueues the receipt email as a fallback.

## 4. Database migration
New table `public.design_orders`:
- `id uuid pk`, `stripe_session_id text unique`, `customer_email text`, `amount_cents int`, `status text` (pending/paid/intake_submitted), `environment text`, consent fields (`agreed_terms`, `agreed_no_refund`, `agreed_at`, `disclosure_version`, `ip_address`), `intake jsonb` (business info + logo URL), `paid_at timestamptz`, `created_at`, `updated_at`.
- Enable RLS, grants to `authenticated` and `service_role`, policy allowing admins (via `has_role`) to select/update. No anon access; writes are done via service role in server fns and webhook.

## 5. Webhook
`src/routes/api/public/payments/webhook.ts` — extend the existing Stripe webhook to recognize design-order sessions (distinguished by metadata flag `order_type: "design"`), mark the `design_orders` row `paid`, and enqueue the `design-receipt` email (idempotency key `design-receipt-{sessionId}`).

## 6. Post-payment intake form
`src/routes/design.return.tsx` (file: `src/routes/design.return.tsx` → `/design/return`):
- Reads `session_id`, polls `lookupDesignBySession` until `paid`.
- Shows a simple form: business name, phone, website, services offered, tagline, color/style preferences, logo upload (Supabase Storage `ad-uploads` bucket under `design-intake/{orderId}/`), notes.
- Submit → new server fn `submitDesignIntake({ sessionId, intake })` writes into `design_orders.intake`, flips status to `intake_submitted`, and enqueues an internal notification to the admin address (reuse `enqueueTransactionalEmailInternal`).
- Confirmation state: "Thanks! Our team will send your initial ad for approval or revision within 72 hours."

## 7. Receipt email template
`src/lib/email-templates/design-receipt.tsx` — new template registered in `src/lib/email-templates/registry.ts` as `design-receipt`.
- Confirms payment ($49.95), order number (session id), and states: "You'll receive your initial ad design for approval or revision within 72 hours. One free revision is included."
- Links back to `/design/return?session_id=...` in case they closed the intake form.

## 8. Wire from other surfaces (light touch)
- No other UI changes requested; keep the existing DIY line in the email intact and only surface the pro-design CTA via the reminder email (and the direct `/design` URL for anyone who visits).

## Technical notes
- All new server fns use `createServerFn` from `@tanstack/react-start` and load `supabaseAdmin` inside handlers only.
- Stripe key/env selection uses existing `createStripeClient` / `StripeEnv` helpers.
- Reuse existing consent/disclosure constants (`DISCLOSURE_VERSION`, `DISCLOSURE_SUMMARY`).
- Uploads use the private `ad-uploads` bucket with a path prefix `design-intake/{orderId}/`; add an RLS policy on `storage.objects` allowing service-role writes and admin reads (client uploads via signed URL issued by a server fn keyed on `session_id`).
- Idempotency keys: `design-receipt-{sessionId}` for the receipt so webhook + return-page fallback don't double-send.
