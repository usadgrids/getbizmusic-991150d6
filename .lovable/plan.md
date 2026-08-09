# Activation Code Ad Proof & Checkout (/activate)

A private, code-gated page where a business reviews the ad you already designed for them, confirms or requests corrections, verifies their contact details, and pays — by card, Zelle, or Venmo.

## Customer flow

1. They open `getbizmusic.com/activate` (or a direct link with the code baked in, e.g. `/activate?code=AMLEGAL49`).
2. They type the activation code. Wrong or already-used codes get a clear message; no details are ever revealed for an invalid code.
3. The proof page loads:

```text
YOUR AD PROOF — CODE AMLEGAL49

[ ad image preview, tap to enlarge ]

Business:   A&M Legal Services
Category:   Legal Services
Tagline:    Serving San Diego families since 1998
City:       San Diego, CA
Rotation:   10 seconds (Featured Slider)
Website:    amlegal.com     Video: (YouTube link)

Does everything look correct?
( ) Yes — everything is correct
( ) I'd like some changes

[ corrections / recommendations box — appears when "changes" is picked ]
```

4. Contact fields, pre-filled from what you entered in admin, all editable: business name, business address, support email, support voice number, support text/SMS number.
5. One consolidated tick box for the novelty + legal terms (same wording used on `/submit`), required before paying.
6. Amount due is shown exactly as you set it on the code — plan, any discount you applied, and the total. The customer does not pick a plan.
7. Payment choice: card (embedded Stripe checkout), Zelle, or Venmo. Zelle and Venmo show the QR/handle plus a memo code and are marked pending until you confirm receipt in admin.
8. If they asked for changes, they can still pay — the corrections ride along with the order and are flagged for your design team.

## After payment

- Receipt email: "We're working on your GetBizMusic.com ad to perfection — please allow a few days. You'll get another email the moment your ad is live."
- If corrections were submitted, the email acknowledges them and says the revised proof comes first.
- `processing@getbizmusic.com` gets the internal notification, including whether corrections are owed and which payment method was used.
- The code is marked used so the link can't be paid twice; reopening it shows the current status instead of the form.

## Admin side

New "Activation Codes" section in `/admin`:

- Create a code: code text (auto-uppercased, unique), ad image upload, business name, category, tagline, city, website, YouTube URL, rotation plan, price in dollars, plus pre-filled contact fields (address, email, voice, SMS).
- Table of all codes with status: Unused / Viewed / Corrections requested / Paid (pending Zelle-Venmo) / Paid / Deactivated.
- Row actions: copy share link, view the customer's confirmation and any correction notes, mark a Zelle/Venmo payment received, deactivate, delete (with confirm).
- Once the ad goes live you approve it through the existing Currently Running flow, which sends the existing "your ad is live" email.

## Recommendations worth deciding on

- **Zelle/Venmo are manual.** Neither has a usable payment API here, so those orders sit as "payment pending" until you confirm — same pattern already used for Zelle on `/pricing`. Card is the only instantly-verified path.
- **Code format.** Suggest keeping them short and business-tied (AMLEGAL49) but adding a 4-character random suffix on the share link so a guessed code can't open someone else's proof. The typed code stays the friendly one.
- **Expiry.** Optional "valid until" date per code so old proofs stop working; defaults to no expiry if you leave it blank.

## Technical notes

- New table `activation_codes`: code (unique, uppercased via trigger), image_path, business/category/tagline/city_id/website/youtube, plan, price_cents, prefilled contact fields, status, confirmed_correct, correction_notes, customer-edited contact snapshot, payment method/session, paid_at, expires_at, timestamps. Admin-only RLS; public reads go through a server function that looks up by code and returns only proof-safe fields.
- Ad image stored in the existing private `ad-uploads` bucket; the proof page gets a short-lived signed URL from the server function.
- `/activate` is a public SSR route with `noindex`; server fns `lookupActivationCode`, `submitActivationConfirmation`, and payment starters reuse `createAdCheckout`-style logic with `price_data` for the admin-set amount instead of `AD_PLANS` pricing.
- Card path uses embedded Stripe checkout returning to `/activate/return`; the payments webhook marks the code paid, creates the `ad_submissions`/`ads` draft record so it appears in Currently Running, and enqueues the emails.
- Zelle/Venmo reuse the existing `createZelleAdOrder` pattern (pending payment row + instructions email + admin confirm), extended with a `payment_method` value for Venmo.
- Two new email templates: `activation-receipt` (customer) and reuse of `paid-order-notification` (internal) with correction details added.
