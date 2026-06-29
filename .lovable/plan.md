## Changes

### 1. Pricing → $12/year intro ($1/month equivalent)
Update both ad plans to $12 with the intro-offer messaging. Keep the two plan tiers and rotation timings intact (not asked to change). Add resubscribe + "prices may change" note.

- `src/lib/biz-utils.ts`: change `image_5.price` and `slider_10.price` both to `12`. (Plan keys stay the same to avoid touching the DB enum and ads pipeline.)
- `src/components/biz/PricingBanner.tsx`:
  - Section subtitle becomes the intro-offer line: "Really Special Introductory Limited Time Offer — $1/month, billed $12/year. Option to resubscribe at the end of your annual term. Prices may change."
  - Both price cards show `$12 / year` with small caption "$1/month — intro offer".
  - CTA buttons read "Get Started — $12" and "Get Featured — $12".
- `src/components/biz/BizHero.tsx`: replace "$5" / "From $5" copy in the H1 and CTA with $12 intro phrasing ("A full year for just $12 — about $1/month. Limited-time intro offer.") CTA button: "Submit Your Ad — $12/yr".
- `src/routes/index.tsx` meta: update title/description from "$5" to "$12/yr intro".
- `src/routes/submit.tsx`:
  - Plan picker cards: show `$12 / year` with "$1/month intro" caption.
  - Submit button label: `Submit Ad — $12`.
  - Confirmation page line: `$12 for 1 year`.
  - Meta description: update "$5 or $10" → "$12/year intro".
- `src/routes/admin.tsx` line 232 + 308: update the `$5` / `$10` labels to `$12`.

### 2. Rebrand → "BizSpot Directory - National City"
Replace every visible "BizSpot Directory" string with "BizSpot Directory - National City":
- `src/components/biz/BizNavbar.tsx`
- `src/components/biz/BizFooter.tsx`
- `src/routes/__root.tsx` (title, og:title, twitter:title, og:site_name if present)
- `src/routes/submit.tsx` (title + og:title)
- `src/routes/admin.tsx` (title)
- `src/routes/index.tsx` (title)

### 3. Eligibility notice in header
Add a prominent notice strip in `BizHero.tsx` (just under the existing gold "NATIONWIDE USA BUSINESS ADVERTISING" badge, above the H1):

> **Now Open to New National City Businesses Only** — established between January 1, 2026 and December 31, 2026.

Styled as a contrasting pill/banner using existing palette (`#D4A24C` border on dark background) so it reads as an important eligibility callout without altering layout structure.

### Out of scope (not touching)
- Database `ad_type` enum and existing ads/submissions records.
- Ad slider sizing, ad images, slider behavior, music player.
- "Nationwide USA Business Advertising" badge text and other copy already approved earlier.
- Rotation seconds (still 5s / 10s) — only the dollar amount changes per user instruction.
