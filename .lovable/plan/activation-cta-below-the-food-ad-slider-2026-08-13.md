# Activation CTA below the /food ad slider

After a visitor enters a valid activation code on `/food` and their ad appears in the slider, show a clear call-to-action **below the ad slider** that links to the food-branded activation & checkout flow.

## What the visitor sees

1. Enters code → their ad proof is prepended to the slider (existing behavior, unchanged).
2. While their preview is active, a CTA panel appears **directly below the `AdSlider`**:
   - Heading: "That's your ad in the spotlight — ready to go live?"
   - Short line with the price (from `proof.priceNote`, e.g. "$49.95").
   - Primary gold button: **Review & Activate My Listing** → links to `/food/activate?code=XXXX` using the proof's `code`.
   - Secondary text: a reminder that the ad stays a private preview until payment + activation.
3. If the code is already paid/activated (`proof.paid` or `isLivePreview`), the panel instead says the listing is already live and links to the ad's unique URL if one exists (otherwise just confirms it's active), with no checkout button.

## Implementation

- Only `src/routes/food.tsx` changes (no new component, no schema/server-function changes).
- Render the CTA panel right after the `AdSlider` block, gated on `proofSlide` being non-null (so it only shows for the code-holder, never for general visitors).
- Use TanStack `<Link to="/food/activate" search={{ code: proof.code }}>` (typed, preserves preload) rather than interpolating the URL.
- Reuse the existing gold/navy styling tokens (`#D4A24C`, `#0F2A4A`) already used by the page so it matches the activation bar above.
- Keep the existing "Private preview — only you can see this ad" notice in place above the slider; the new CTA is the closing prompt below.
- Privacy invariant preserved: the preview slide and this CTA only exist in the code-holder's browser session; the public ad query (`getAdsByCategory`) already filters to `status = 'active'`, so nothing leaks.

## Technical notes

- `proof.code` is the normalized uppercased code returned by `lookupActivationCode`; pass it straight through as the `code` search param.
- `proof.priceNote` already carries the human-readable price (e.g. "$49.95"); fall back to formatting `proof.priceCents` if `priceNote` is null.
- No changes to `/food/activate`, the activation tables, or the payment flow.
