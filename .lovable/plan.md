## Answers to your questions

**1. Will it still share the current image ad?** Yes. Sharing works by posting the URL `/ad/{ad_number}` — social networks (Facebook, X, LinkedIn, WhatsApp) then scrape that page's og:image, which is the ad's image. As long as the moved share bar keeps receiving the *currently visible* ad's `ad_number`, it will still share that exact image ad.

**2. Can we pause the slider on share click and resume after?** Yes. `ShareBar` already fires `onOpen` when any button is clicked (we use it today to pause on hover). We can wire that to pause the slider, then auto-resume when the user returns to the tab (window `focus` event) — which covers both "shared successfully" and "cancelled the share dialog".

## Plan

**1. Add a new share row below the slider**

- In `src/components/biz/AdSlider.tsx`, render a new full-width bar directly below the slider card (still inside the slider component so it always has the current ad in scope).
- Layout: left side text "Share this ad image", right side the social icons (Facebook, X, LinkedIn, WhatsApp, Copy link, Native share).
- Styled to match the site (navy `#0F2A4A` text, gold `#D4A24C` accent, rounded card, sits above the MiniPlayer).
- Passes `adNumber`, `businessName`, `tagline` of the currently displayed ad so sharing always reflects what's on screen.

**2. Pause the slider when a share button is clicked, resume after**

- The existing overlay `ShareBar` calls `onOpen` — reuse it: `onOpen={() => setPaused(true)}`.
- Add a `window` `focus` listener while paused-by-share is active: when the user comes back to the tab (after sharing or cancelling), clear the pause and resume the rotation.
- Small safety net: also clear pause after ~30s in case the focus event never fires (e.g. native share sheet on some devices).

**3. Remove or keep the hover overlay share bar?**

- Recommend removing the hover-overlay share bar on the slide itself, since the new bar underneath is always visible and clearer. (Confirm below.)

**4. Works on desktop, tablet, and mobile**

- The new bar is responsive: label on the left, icons wrap to a second line under the label on narrow screens if needed.

## Technical notes

- Files touched: `src/components/biz/AdSlider.tsx` (add row + pause/resume logic), no change needed to `ShareBar.tsx` — it already supports being placed anywhere and calling `onOpen`.
- Sharing continues to work because it's URL-based (`/ad/{ad_number}`) — the target page owns the og:image, so scrapers pick up the correct ad image regardless of where the share button lives.

## One question before I build

Do you want me to **remove the hover-only share overlay** on the slide itself (since a persistent bar under the slider replaces it), or **keep both**?  
  
remove the hover only share overlay