## Goal
On custom ad landing pages (e.g. `/ad/2921`), reposition the playlist-crawling marquee so it sits visually below the fixed MiniPlayer music player and directly above the "Submit Your Own National City Business Ad" CTA.

## Current state
- `src/routes/ad.$adNumber.tsx` renders `<PlaylistMarquee />` in a `mt-6` block between the ad business-info row and the "See more ads" slider.
- The "Submit Your Own National City Business Ad" CTA lives at the bottom of the "See more ads" section.
- `<MiniPlayer />` is rendered last as the fixed floating player.

## Change
1. Remove the existing `<div className="mt-6"><PlaylistMarquee /></div>` block from between the ad info and the slider.
2. Insert `<PlaylistMarquee />` directly above the CTA button inside the "See more ads" section, with appropriate vertical spacing (`mt-6` / `mb-4`) so it clearly sits above the CTA and below the preceding slider content.
3. Verify JSX tag balance and spacing remains consistent.

## Files touched
- `src/routes/ad.$adNumber.tsx`

## Verification
- Run `bunx tsgo --noEmit` to confirm no TypeScript errors.
- Check the preview of an ad page to ensure the marquee appears above the Submit CTA and no longer appears between the ad details and the slider.