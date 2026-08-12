# /activate: Artwork Choice + Pay Later (Bill Me)

Two additions to the activation page: let the business choose which ad artwork to use, and let them activate now and be billed later.

## 1. Artwork choice

After the proof review step, a new block:

```text
WHICH AD IMAGE SHOULD WE USE?
(•) Use the ad we designed for you   [ shows your proof thumbnail ]
( ) I already have my own ad image   [ upload file ]
( ) I'll send my ad image later      [ we email you an upload link ]
```

- Own image: single upload (JPG/PNG/WEBP, max ~10 MB) stored privately. Your original proof stays on the record — both images are visible in admin and you pick which one goes live.
- Send later: nothing to upload now; after checkout they get an email with a private upload link, and the code is flagged "artwork pending" in admin.

## 2. Pay Later (Bill Me)

A fourth payment option alongside Card, Zelle, Venmo, available on every activation code:

```text
HOW WOULD YOU LIKE TO PAY?
[ Card ]  [ Zelle ]  [ Venmo ]  [ Pay Later — Bill Me ]

Pay Later: we publish your ad now and bill you. Payment due within 7 days.
```

Choosing it finishes checkout immediately — no payment collected — and marks the order **billed / unpaid** with a due date 7 days out.

### Emails

A new **invoice** email (separate from the paid receipt):

- Subject line along the lines of "Thank you for your order — your invoice from GetBizMusic"
- "Thank you for your order. You have been billed. Please pay at your earliest convenience."
- Amount due, activation code, invoice/memo number, due date (7 days)
- Pay-now options right in the email: a Pay Now button (card/debit/credit), plus Zelle details with QR code and the Venmo handle @RTPosadas
- Paying customers keep the existing receipt email, unchanged

`processing@getbizmusic.com` gets an internal notice marked BILLED — UNPAID, including whether artwork is owed.

## 3. Admin

The Activation Codes table gains:

- Status values: Billed (unpaid) and Overdue once past the due date
- Artwork column: Our design / Customer uploaded / Awaiting customer upload, with both images viewable and a "use this one" pick
- Row action: Mark Paid (records how they eventually paid) and Resend invoice

## Technical notes

- Migration on `activation_codes`: `artwork_choice` ('ours' | 'customer' | 'later'), `customer_image_path`, `chosen_image` ('ours' | 'customer'), `due_at`, `upload_token` (uuid), plus new status values `billed` and `awaiting_artwork`. Grants unchanged (admin-only RLS; public access stays through server functions).
- Customer uploads go to the existing private `ad-uploads` bucket through a server function that returns a signed upload URL, keyed by the activation code — no public write policy.
- `submitActivation` gains `paymentMethod: 'bill_later'` and artwork fields. Bill-later path skips Stripe, sets status `billed`, `due_at = now + 7 days`, generates an invoice number, and enqueues the new emails. Zod schema and the field-label error map extended accordingly.
- New `payActivationInvoice` server function creates a Stripe embedded checkout for an already-billed code so the emailed Pay Now link works; reuses the existing `/activate/return` confirmation path and `markActivationPaidInternal`.
- New templates `activation-invoice` (customer) and reuse of `paid-order-notification` with a BILLED label; registered in `src/lib/email-templates/registry.ts`.
- Late-artwork upload uses a token link `/activate/artwork?token=...` backed by a public server function that validates the token and accepts one image.
