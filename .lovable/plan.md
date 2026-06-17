## Recommended ad dimensions

For a single hero/slider ad slot that has to work on phone, tablet and desktop, the industry sweet spot is **one master image at 1456 × 816 (16:9)** displayed responsively. This is what YouTube, Vimeo, Stripe, Linear and most modern SaaS landing pages use for hero banners — it reads as a "premium billboard" on desktop and still looks generous (not letterboxed) on mobile.

### Why 16:9 over the other contenders
- **1200 × 628 (1.91:1, Facebook/OG)** — fine, but a touch too short; loses vertical impact on desktop hero.
- **970 × 250 (IAB Billboard)** — too thin on mobile, becomes a sliver.
- **1:1 square** — wastes desktop width, eats too much fold on mobile.
- **16:9 (1456 × 816)** — fills width edge-to-edge on every device, keeps the headline overlay readable, and matches the OG/Twitter card image so the same asset doubles as the share image.

### Responsive display rules (applied to the slider container)

| Viewport | Container width | Aspect ratio | Effective rendered size |
|---|---|---|---|
| Mobile < 640 px | 100% of viewport, edge-to-edge | 16 / 9 | ~360 × 203 up to ~640 × 360 |
| Tablet 640–1023 px | 100% inside page padding | 16 / 9 | up to ~960 × 540 |
| Desktop ≥ 1024 px | capped at 1200 px (current `max-w-6xl`) | 16 / 9 | up to 1152 × 648 |

One ad image, one aspect ratio, one CSS rule — no per-breakpoint crops, no second asset to manage. The text overlay (business name + tagline + Visit pill) stays anchored to the bottom gradient so it reads at every size.

### Featured-business thumbnail grid (the smaller cards under the hero)
Keep those at **1:1 square** thumbnails — square grids tile cleanly at 1/2/3/4 columns across breakpoints and don't fight the hero's 16:9 visual rhythm.

## What I'll change

1. **AdSlider.tsx** — switch the hero container from the current `aspect-[345/315]` + `max-w-[345px]` cap back to full-width with `aspect-[16/9]`, so the ad expands to the full content column on every device instead of being pinned to a 345 px box.
2. **FeaturedBusinesses.tsx** — confirm/lock thumbnails to `aspect-square` with `object-cover`.
3. **Regenerate the 8 placeholder ad images** at 16:9 (1456 × 816) so they fill the new container cleanly, with composition framed for a bottom-aligned text overlay (key subject in upper-left two-thirds, lower band kept visually quiet for the dark gradient). Replace each existing `.asset.json` pointer in place so no DB rows have to change. Businesses regenerated: Apex Auto, Bella Boutique, Greenleaf Landscaping, Hartwell Law, Roasted (coffee), Summit Fitness, Sunrise Bakery, Tony's Pizzeria.
4. **OG image** — point `og:image` / `twitter:image` at the current featured ad so the same 16:9 asset doubles as the share card (free SEO win since the dimensions already match).

## Notes / open question

- The hydration warning shown in the runtime errors is unrelated to ad sizing — I'll leave it alone in this pass unless you want it folded in.
- If you'd rather lean even more aggressive on desktop real estate (true "billboard hero" that breaks out of the 1200 px column to span the full viewport), say the word and I'll widen the hero section to `w-screen` while keeping the rest of the page in `max-w-6xl`.
