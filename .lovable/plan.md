# Activation code entry on /food

Let a business owner (e.g. Jax Chibugan) type the activation code from their flyer directly on the `/food` page, immediately see their own ad appear in the slider, and continue to checkout.

## What the visitor sees

1. `/food` looks the same as today: hero, showcase food ads, live advertiser ads.
2. Directly under the hero (above the slider) a compact gold-accented bar:

```text
Have an activation code from your GetBizMusic rep?
[ ENTER CODE          ]  [ View My Ad ]
```

3. Typing a valid code and pressing the button:
   - Looks the code up (same lookup already used by `/activate`).
   - Their proof image jumps to the FRONT of the slider rotation, labeled as their ad, with their business name and tagline.
   - A confirmation panel appears above the slider: "This is your ad, {Business Name}" plus the price, and a primary button **Review & Activate My Listing** that goes to `/food/activate?code=XXXX` where the existing review, corrections, artwork choice, and card / Zelle / Venmo / Bill-me-later checkout already live.
4. An invalid, expired, or deactivated code shows the same plain-language message the `/activate` page shows; no business details are revealed.
5. If the code is already paid, the panel says the listing is already active and links to their live ad instead of checkout.

## Extra convenience

- `/food?code=AMLEGAL49` auto-runs the lookup, so the flyer QR/link can drop them straight into the preview.
- The entered code is remembered for the session, so returning to `/food` keeps their ad pinned at the front until they finish checkout.

## Technical notes

- Only `src/routes/food.tsx` changes, plus one small component (`src/components/biz/ActivationCodeBar.tsx`) holding the input, lookup call, and result panel.
- Reuses `lookupActivationCode` from `src/lib/activation.functions.ts` via `useServerFn` — no new server functions, no schema change. The existing lookup already marks the code as "viewed" on first open, which is the desired behavior here too.
- The returned `ActivationProof` is mapped into the slider's `PublicAd` shape (`id: "activation-" + code`, `image_url` = signed proof URL, `ad_type` drives duration) and prepended to the showcase + live ads array.
- Route gets `validateSearch` for the optional `code` param; code persisted in `sessionStorage` under a single key.
- No change to `/food/activate`, the activation tables, or the payment flow.
