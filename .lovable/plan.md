
## 1. Checkout disclosure UI (`src/routes/pricing.tsx`)

- Above the "Pay & Continue" button, add a bordered, warm-tinted callout box (soft `#D4A24C`/cream background, brand navy border, `Info` icon) containing the exact copy provided ("A FEW THINGS TO KNOW BEFORE YOU GRAB YOUR SPOT! 🎶" through the § 1723 paragraph). Preserve paragraph breaks and emojis; use existing serif/sans stack for consistency.
- Below the disclosure, render two separate `<Checkbox>` (shadcn) + `<Label>` rows with independent React state:
  - `agreedTerms` → "Got it — I understand this is a fun novelty ad spot with no guaranteed views, plays, or business results."
  - `agreedNoRefund` → "I understand and I'm good with the no-refund policy — once I purchase, it's final."
- Disable the "Pay $X & Continue" button unless `email valid && agreedTerms && agreedNoRefund`. Keep the greyed style via `disabled:opacity-60`.
- Pass consent fields into `createAdCheckout` (see §3).

## 2. Database changes (migration)

New columns on `ad_payments` (the existing "orders" table for ad purchases):
- `agreed_terms boolean not null default false`
- `agreed_no_refund boolean not null default false`
- `agreed_at timestamptz`
- `disclosure_version text`
- `ip_address text`

Add a CHECK constraint enforcing both booleans true when `status = 'paid'` is not viable (webhook races), so instead enforce at insert time: `CHECK (agreed_terms = true AND agreed_no_refund = true)` on the row — the server function is the only writer of new consent rows, so this guarantees no unconsented order is ever recorded.

New table `dispute_evidence_log`:
- `id uuid pk`, `dispute_id text unique not null`, `charge_id text`, `stripe_session_id text`, `ad_payment_id uuid references ad_payments(id)`, `evidence_text text not null`, `evidence_json jsonb`, `status text not null default 'pending_review'` (`pending_review` | `submitted` | `skipped`), `submitted_at timestamptz`, `created_at`/`updated_at timestamptz`.
- RLS: only `admin` role (via `has_role`) can select/update; service_role full access. GRANT to `authenticated` + `service_role`.

## 3. Server-function updates (`src/lib/payments.functions.ts`)

- Extend `createAdCheckout` input validator with `agreedTerms: z.literal(true)`, `agreedNoRefund: z.literal(true)`, `disclosureVersion: z.string()` (default `"v1"`). Reject with clear error if either is false — backend enforcement.
- Capture client IP from `getRequest()` headers (`x-forwarded-for` first hop).
- Compute `agreedAt = new Date().toISOString()`.
- Insert a `pending` row into `ad_payments` (via `supabaseAdmin`) BEFORE creating the Stripe session so consent is persisted regardless of payment outcome — columns: `stripe_session_id` (filled after create via update), `customer_email`, `plan`, `amount_cents`, `status: 'pending'`, `environment`, `agreed_terms: true`, `agreed_no_refund: true`, `agreed_at`, `disclosure_version`, `ip_address`. Then create the Stripe session and `update` with `stripe_session_id`.
  - Existing webhook `upsert` on `stripe_session_id` continues to flip status to `paid`; adjust webhook to preserve consent columns on update (don't overwrite).
- Add Stripe session metadata:
  ```
  agreed_terms: "true",
  agreed_no_refund: "true",
  agreed_at,
  disclosure_version: "v1",
  disclosure_text: "Novelty 1-year ad display, no performance guarantee, no refunds per CA Civil Code 1723. Buyer confirmed via checkbox before payment."
  ```
- On the PaymentIntent (one-off) add `payment_intent_data.statement_descriptor_suffix: "WINALL MEDIA AD"` (≤22 chars, alphanum + spaces). For subscription mode, set `subscription_data.description` accordingly (statement descriptor via invoice not available per-session — document limitation).
- Ensure `receipt_email` is set on `payment_intent_data` so Stripe sends the automatic receipt. Post-purchase confirmation email including the friendly disclosure recap is sent from the existing webhook path (add a new template `ad-purchase-confirmation.tsx` triggered from `handleWebhookCharge` in `src/routes/api/public/payments/webhook.ts`).

## 4. Dispute webhook & evidence drafting

Update `src/routes/api/public/payments/webhook.ts`:
- Handle `charge.dispute.created`: look up matching `ad_payments` row by `charge.payment_intent` → session → row. Draft an evidence packet string that includes:
  - Disclosure text (v1 canonical), `agreed_at`, both checkbox confirmations
  - Stripe receipt URL from the charge
  - Reference to the confirmation email (`ad-purchase-confirmation` message id if logged)
  - Order details: plan label, seconds, price, purchase date, ad content summary if a submission is linked
- Insert into `dispute_evidence_log` with `status = 'pending_review'`. Never call Stripe's dispute update endpoint here.
- Also handle `charge.dispute.updated`/`closed` to keep the row current (optional metadata only; still no auto-submit).

## 5. Admin disputes page (`src/routes/admin.disputes.tsx`)

- New route under existing admin auth pattern (reuse `amIAdmin` gate).
- Server functions in `src/lib/disputes.functions.ts`:
  - `listPendingDisputes` (admin-only) — returns rows joined with `ad_payments`.
  - `updateEvidenceDraft({ id, evidenceText })` — edits draft.
  - `submitDisputeEvidence({ id })` — the ONLY path that calls `stripe.disputes.update(disputeId, { evidence: { uncategorized_text: evidenceText }, submit: true })`, then sets `status='submitted'`, `submitted_at=now()`.
- UI: list cards showing dispute id, amount, reason, order summary, editable `<Textarea>` prefilled with draft, "Save draft" and "Submit to Stripe" buttons (with confirm dialog).
- Add nav link from `/admin` to `/admin/disputes`.

## 6. Types & wiring

- After the migration runs, regenerated `types.ts` will expose new columns/table — updated code in payments/webhook/admin picks it up.
- Add `admin/disputes` to `routeTree.gen.ts` via file convention (auto).

## 7. Out of scope

- No changes to unrelated pages, no restyle of the rest of the pricing page.
- Manual admin-created ads (`createManualSubmission`) don't create `ad_payments` rows and are unaffected.
- Statement descriptor for subscription renewals cannot be per-session; documented, not blocked.

### Technical notes

- Backend consent validation: `z.literal(true)` in the server function makes it impossible to POST an order without both flags true — matches the frontend disable.
- IP capture uses `getRequest().headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null`. Stored best-effort.
- Webhook: existing `upsert` on `stripe_session_id` must switch to `update` (row is pre-inserted in step 3) or use `onConflict` with `ignoreDuplicates: false` while excluding consent columns from the update set.
- Dispute submission uses Stripe SDK `stripe.disputes.update(id, { evidence: {...}, submit: true })` — evidence packet placed in `uncategorized_text` (plus `receipt` / `customer_communication` URLs if we have them).
