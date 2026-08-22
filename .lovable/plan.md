# Pay-First Checkout on the Home Intake Form

Replace the "review first, pay later" ending of the Find & Claim form on `/` with a pay-first flow: terms acceptance, then a PAY NOW button that carries the entered details into `/quick-pay`.

## What changes on the form

1. Replace the "What Happens Next" gold box with a **Membership & Terms** box:
   - $49.95 one-time annual membership — no recurring charges, no auto-renew.
   - If you wish to renew, you'll get an email reminder 30 days before your annual expiration.
   - **No refunds:** once your business is optimized and published to AI answer engines, the service has been rendered and cannot be un-optimized.
   - Full AI Answer Engine optimization and publishing (normally $149.95) for $49.95/year. Pricing subject to change without notice.
2. Add a **required terms checkbox** using the existing shared checkout consent copy, with a link to the full Terms & Conditions page (`/terms/membership`) that opens in a new tab.
3. Replace the "Submit My Claim" button with **PAY NOW $49.95** (gold, same styling). It stays disabled until the terms box is ticked.

## What happens on click

- The claim is still saved first (same submission as today), so we keep the business record, audit/ad-design preferences and Priority Access Code.
- Instead of showing the "Thanks — we got your claim" screen, the visitor is sent straight to `/quick-pay` with their details pre-filled: business name, owner name, email, phone.
- If saving the claim fails, the user stays on the form with the existing error toast — no redirect.

## Terms & Conditions content

The no-refund clause already exists in the shared membership terms; it will be reworded to state explicitly that optimization cannot be reversed once rendered. That text is shared, so `/terms/membership`, checkout, and the PDF receipt all pick it up.

## Technical notes

- `src/components/biz/BusinessClaimSearch.tsx`: new `termsAccepted` state, revised gold box, renamed button, and a `navigate({ to: "/quick-pay", search: {...} })` after a successful claim.
- `src/routes/quick-pay.tsx`: extend `searchSchema` with optional `business`, `owner`, `email`, `phone`; seed the four `useState` initial values from those params so the form arrives pre-filled and the Pay Now button is immediately enabled.
- `src/lib/membership-terms.ts`: adjust the no-refund clause wording (service rendered / cannot be un-optimized).
- Reuse `MEMBERSHIP_CHECKBOX_TEXT` for the consent label rather than writing new copy.
