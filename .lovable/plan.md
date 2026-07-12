## Goal

Add a **free ad tier for religious categories** (Churches, Religious Services, Ministries) that skips Stripe checkout, gets a **12-second rotation (a $48/yr value, offered free)** to compensate viewers/advertisers for the Christian playlist swap, and collects ministry-specific intake fields. Existing prev/next slider controls already let viewers scrub back to a religious ad — the mood-swap effect will re-fire automatically.

---

## 1. Pricing page — category gate + free-religious panel

Edit `src/routes/pricing.tsx`:

- Add an **Industry / Category** dropdown (from `INDUSTRIES`) at the top of the pricing card, required before anything else activates.
- When the selection is in `RELIGIOUS_INDUSTRY_VALUES` (church, religious_services, ministry):
  - **Hide** the $24 / $48 tiles, rep-code field, and Stripe pay button.
  - **Show** a "Church & Ministry Free Spot" panel:
    > As a novelty gesture to the faith community, Get Biz Music gives churches, religious services, and ministries a **FREE 12-second ad rotation for one year — a $48 value** — the same premium duration as our Featured Slider Ad. This compensates viewers (and you) for the brief background-music swap to Christian music while your ad is on screen. Subject to the same content review as paid ads.
  - Show a strikethrough badge: `$48/year value — FREE`.
  - Keep the terms + novelty-consent checkboxes (swap the no-refund copy for novelty/no-guaranteed-results consent since $0 doesn't need a refund clause).
  - Button: **"Continue to Free Ministry Ad Submission"** → calls new server fn, then `navigate({ to: "/submit", search: { token } })`.
- Non-religious selection: page behaves exactly as today.

## 2. Free-token server function

New export in `src/lib/payments.functions.ts` — `createFreeReligiousSubmission`:

- Input: `{ industry, customerEmail, agreedTerms, agreedNovelty }`; validate industry ∈ `RELIGIOUS_INDUSTRY_VALUES` and both booleans true.
- Insert into `ad_payments`: `plan: "slider_10"` (the 12s value tier — see §4 note), `amount_cents: 0`, `status: "paid"`, `paid_at: now()`, consent columns filled, `rep_id/rep_code` null, `stripe_session_id: "free-religious-<uuid>"` synthetic.
- Return `{ token }`.

Extend `getPaymentByToken` to derive and return `freeReligious: amount_cents === 0` so the submit page knows to render the ministry section.

## 3. Submit form — ministry fields

Edit `src/routes/submit.tsx`. When `verify.freeReligious === true`, render an extra **"Ministry Information"** section above the standard fields (all required):

- Church / Ministry Name → mirrored into `business_name`
- Church / Ministry Address (single field)
- Name of Pastor / Leader → mirrored into `contact_name`
- Phone Number → mirrored into `phone`
- Attestation block, all three checkboxes required:
  - `[ ] We are a non-profit 501(c)(3) organization.`
  - Radio: `( ) We DO have an IRS non-profit number: [___]` vs `( ) We DO NOT have an IRS non-profit number.`
  - `[ ] I attest we are an independent religious ministry operating in good faith.`
  - `[ ] I understand this free ad is a novelty community gesture with no guaranteed views or business results, subject to the same content-review policy as paid ads.`

Standard image upload + "I'm not ready — email me my submission link" escape hatch stay unchanged. The existing `submit-reminder` email already advertises the $49.95 Pro Ad Design offer, so religious submitters see the same offer if they defer.

Ministry attestation payload is included in the **admin notification email** (no DB migration this turn). Ask us later if you want it persisted to a new `ministry_info jsonb` column.

## 4. Ad slider — 12-second religious duration + scrub-back music swap

- `ads.functions.ts` (submission → live ad flow): when the source `ad_payments` row is free-religious, persist the resulting ad with `duration_seconds: 12` and `ad_type: "slider_10"` so `resolveDuration()` in `AdSlider` naturally yields 12s. (Alternatively add `AD_PLANS.religious_free = { seconds: 12, price: 0, label: "Church / Ministry Free Spot" }` — but reusing `slider_10` avoids UI-label churn everywhere. **Chosen: reuse `slider_10`, persist `duration_seconds = 12` explicitly.**)
- `AdSlider.tsx` — no logic change needed for scrub-back:
  - Prev/next arrows already exist (line 520, `setIdx((i - 1 + n) % n)`).
  - The mood-swap `useEffect` shipped last turn is keyed on `current?.id` / `current?.industry` and fires whenever mood transitions — so clicking back to a religious ad re-fires the Christian playlist swap, and forward again to a secular ad restores the regular playlist. This works with mouse click, keyboard, and any touch-swipe wiring already in place.
  - Verify after build: click the left arrow while on a secular ad following a religious one; confirm music swaps back to Christian in ~300–800 ms.

## 5. Files touched

- `src/routes/pricing.tsx` — industry dropdown gate, religious free-panel branch, free-submission handoff.
- `src/lib/payments.functions.ts` — `createFreeReligiousSubmission`; `freeReligious` flag on `getPaymentByToken`.
- `src/routes/submit.tsx` — conditional ministry section, mirror-into-standard-fields on submit, attach ministry payload to admin notification.
- `src/lib/ads.functions.ts` — accept ministry info; force `duration_seconds: 12` and `ad_type: "slider_10"` for free-religious submissions; forward ministry payload to admin email.

## 6. Non-goals

- No DB migration (ministry attestation lives in the admin email + client-side enforcement).
- No new email templates — reminder already advertises $49.95 design.
- No new pricing tier row in `AD_PLANS` — free religious reuses `slider_10` at `$0` in the DB row; the pricing-page copy displays the "$48 value — FREE" framing.
- No changes to the mood-swap event contract shipped last turn.
