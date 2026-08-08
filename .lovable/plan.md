# One Checkout: Ad Spot + Optional $49.95 Pro Design

Field agents show sample ads, then email the business a link. The business should be able to pay for their ad spot **and** the professional ad design in a single checkout, with no artwork needed up front.

## What changes for the customer

On the pricing/checkout page, under the plan choice, they see one clear option:

```text
YOUR AD ARTWORK
( ) I already have a professionally designed ad image
    Our site only accepts professional-grade ad images. We review every
    upload and accept it at our discretion.

( ) I want GetBizMusic to design my ad  ................  + $49.95
    No artwork needed now. After checkout we email you a short design
    form to collect your logo, colors, and details. Delivered in 72 hrs,
    unlimited revisions until you approve.
```

An always-visible order summary shows the math:

```text
Featured Slider Ad (10s rotation)      $48.00
Rep code LOVEE — 50% off                -$24.00
Pro Ad Design (one-time)                $49.95
-----------------------------------------------
Total due today                         $73.95
```

Rules confirmed:
- The rep code 50% discount applies to the **ad spot only**. Design stays $49.95.
- With design selected, they are told plainly: no image upload required, the design form arrives by email.

## Agent-shareable pre-filled link

The agent emails a link like:

`getbizmusic.com/pricing?rep=LOVEE&plan=slider_10&design=1&city=national-city-ca`

Opening it pre-selects the plan, applies and locks in the rep code (shown as "Rep discount applied"), pre-ticks the design add-on, and pre-sets the city. The business only enters their email and pays. Every parameter stays editable.

## After payment

- One Stripe receipt listing both line items.
- Confirmation email adapts to the choice:
  - **Own artwork** — link to the upload/submit form, with the professional-grade standard restated.
  - **Design add-on** — link to the design intake form instead of the upload form, plus a note that our team builds the ad.
- The submit page, when the token belongs to a design order, hides the image upload entirely and collects business details + design notes.
- Admin sees the order in both places: the ad order in Currently Running/Submissions, and a linked row in Custom Design Orders so the design team knows to start.
- The processing@getbizmusic.com notification states clearly whether design work is owed.

## Zelle path

The same add-on works for Zelle: the quoted amount and memo code include the $49.95 when selected, and the Zelle instructions email says the design form follows once payment is confirmed.

## Technical notes

- `createAdCheckout` gains a `designAddon: boolean` input. When true it adds a second Stripe line item (`Get Biz Music Pro Ad Design`, $4,995) to the same session; rep discount applies only to the ad line. Metadata carries `design_addon=true`.
- The payments webhook, on seeing `design_addon`, additionally inserts a `design_orders` row linked to the ad payment (new nullable `ad_payment_id` column on `design_orders`) with status `paid`, and enqueues `design-intake-link` instead of the plain upload prompt.
- `createZelleAdOrder` accepts the same flag and adds $49.95 to the quoted total.
- `/pricing` gains `design`, `plan`, `rep`, `city` search params via the existing zod `validateSearch`, plus an order-summary component driven by `AD_PLANS` and `DESIGN_PRICE_CENTS` (no hardcoded prices).
- `/submit` reads a `designPending` flag from the token lookup and swaps the upload block for design-detail fields.
- Standalone `/design` purchase page stays as-is for customers who only want design work.
