## Plan: Make "Tap to Play Music" obvious when autoplay is blocked

### Problem
Browsers block autoplaying audio until the user interacts with the page. The current MiniPlayer already has a fallback state, but it is not prominent enough. We will add a clear, easy-to-see tap-to-play prompt that appears on first load and a persistent fallback control inside the MiniPlayer.

### What we will build

1. **Centered autoplay-unlock overlay (first-load only)**
   - A modal-style overlay that appears when the YouTube player reports that sound playback is blocked (i.e. `showPlayFallback` is true or the player is playing but muted).
   - Large, centered card with:
     - Headline: "Tap to Play Music"
     - One-line explanation: "Your browser requires a tap before music can start."
     - Big primary button: "Play Music"
   - Uses the existing navy/gold theme (`#0F2A4A`, `#D4A24C`) so it feels native.
   - Clicking the overlay button calls the existing `handleManualPlay()` resume path.
   - Auto-dismisses once music successfully starts.
   - Adds `aria-live="polite"` so screen readers announce it.

2. **Persistent fallback inside the MiniPlayer**
   - When the player is collapsed but autoplay is blocked, the collapsed MiniPlayer shows a "Tap to Play Music" badge instead of the tiny fallback button.
   - When expanded, the player shows a full-width "Tap to Play Music" button beneath the title/controls.

3. **No change to business logic**
   - We only change the presentation of the existing fallback state. No new server functions, no database changes, no storage changes.

### Files to edit

- `src/components/biz/MiniPlayer.tsx` — update the `showPlayFallback` UI for both collapsed and expanded states; add a new `TapToPlayOverlay` component inside the same file (or `src/components/biz/TapToPlayOverlay.tsx` if it grows).
- `src/styles.css` — if needed, add a subtle keyframe for the overlay entrance (fade + scale).
- `src/routes/index.tsx` — no changes required; the overlay is rendered by the existing `<MiniPlayer />`.

### Implementation details

- The overlay reads the same `showPlayFallback` state already computed by `MiniPlayer`.
- It will not show on SSR because the player only initializes on the client.
- It will hide once `playSucceededRef.current` becomes true and the player is unmuted.
- A z-index of `50` keeps it above the ad slider but below the existing `Toaster` (which is `z-index` from Sonner's default).
- The overlay includes a `pointer-events-auto` backdrop; clicking outside the card does nothing so users don't accidentally dismiss it.

### Acceptance criteria

- On first load in a browser that blocks autoplay, a large "Tap to Play Music" overlay is visible.
- Tapping the overlay starts the music and removes the overlay.
- The collapsed MiniPlayer also shows a "Tap to Play Music" prompt when playback is blocked.
- No prompt appears when music starts automatically (e.g., after user has already tapped).
- All existing music controls (Prev, Play/Pause, Next, waveform) continue to work.