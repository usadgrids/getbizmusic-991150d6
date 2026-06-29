## Changes to `src/components/biz/AdSlider.tsx`

1. **Per-ad duration**: Replace the single auto-advance interval with a per-slide timeout that reads a `durationSec` value from each ad (default 7s for Standard, 10s for Featured). For the current mock data, alternate/assign durations so we can visibly demo both 7s and 10s timing.
2. **Remove navigation arrows**: Delete the Prev/Next chevron buttons and their handlers (`handlePrev`, `handleNext`) and the related `showFullAd` reveal-on-click logic tied to arrows.
3. **Remove swipe gestures**: Remove any `onTouchStart` / `onTouchMove` / `onTouchEnd` swipe handlers and associated state.
4. **Keep**: music player controls (SkipBack / Pause / SkipForward), waveform, marquee, click-image-to-open-website, and hover-to-reveal full ad behavior.

## Data

The slide duration is driven from the ad record (`duration_sec` column on `ads`, falling back to 7). No DB migration needed right now — defaulting in the component is enough for the mock-up. We can wire the real column when paid submissions begin.

## Out of scope

No changes to pricing copy, hero, music player UI, or submission flow.