# Add "Play Video" hover overlay to AdSlider

Bring the centered YouTube hover behavior from the ad profile page (`/ad/2921`) into every `AdSlider` slide (all city pages and related-ads sliders), gated on the ad having a `youtube_url`.

## Behavior

- Top-right controls on the slide, right-to-left order: `Timer` · `Website` · `Play Video` (Play Video appears only when `ad.youtube_url` is present).
- Hovering (desktop) or tapping (mobile/tablet/touch) the "Play Video" chip:
  - Pauses the slide rotation (timer freezes and resumes where it left off — the slider already supports this via `paused` + `resumeRemainingRef`).
  - Pauses the background music mini-player (`MINIPLAYER_PAUSE_EVENT`).
  - Mounts a centered muted-off YouTube iframe over the ad image (same visual as `YoutubeHoverOverlay`: centered card, 16:9, gold ring, ~6% padding).
- Moving the mouse away from the chip / video area (or tapping outside on touch):
  - Unmounts the iframe.
  - Resumes the background music (`MINIPLAYER_PLAY_EVENT`) — only if music was playing before, so we don't force-start music that the user had paused.
  - Resumes the slide rotation from the remaining time.
- User can also click the YouTube iframe's built-in pause control while it's playing (native YouTube controls are already enabled).
- The chip stays visible whenever a slide has a `youtube_url` (not tied to the existing hover-reveal of the Search bar) so users see the affordance without having to hover the image first.
- Never render the chip / overlay when `parseYoutubeId(ad.youtube_url)` returns null.

## Files

### `src/components/biz/AdSlider.tsx` (edit)

1. Import `parseYoutubeId` from `YoutubeHoverOverlay` and reuse its iframe rendering shape (either import the component or inline the same centered iframe markup — inline is simpler since we need it to coexist with the existing slider chrome and control pause state from the parent).
2. Add local state `videoActive: boolean` and a ref for the deactivate timeout.
3. Add `wasMusicPlayingRef` — snapshot `musicPlaying` on activate; on deactivate only dispatch `MINIPLAYER_PLAY_EVENT` if it was true.
4. On `activate`: `setPaused(true)`, `setVideoActive(true)`, dispatch `MINIPLAYER_PAUSE_EVENT`. On `deactivate` (short 120ms debounce like the existing overlay): `setVideoActive(false)`, `setPaused(false)`, conditionally resume music.
5. Reset `videoActive` to false whenever `idx` changes (new slide → new video context).
6. In the top-right control cluster, render a new `<button>` "Play Video" (Play icon + label, same pill styling as the Website link) before the Website link, only when `parseYoutubeId(current?.youtube_url)` is truthy. Wire `onMouseEnter`/`onFocus`/`onTouchStart` → activate; `onMouseLeave`/`onBlur` → deactivate.
7. Render the centered iframe overlay (z-index above image, below the top-right chips and search UI) when `videoActive && videoId`. Use the same URL shape as `YoutubeHoverOverlay`: `https://www.youtube-nocookie.com/embed/{id}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1&loop=1&playlist={id}`. Include `key={nonce}` so re-hovering restarts the video.
8. Add `onMouseLeave` on the iframe wrapper too, so moving from chip → over the video keeps it active and moving away from either dismisses it.

## Technical notes

- `PublicAd` already includes `youtube_url` (confirmed in `src/lib/ads.functions.ts` line 17 and the `getActiveAds` select) — no server changes needed.
- The slider's existing `paused` state already halts rotation and preserves remaining time via `resumeRemainingRef`, so video hover reuses that plumbing.
- Music resume is conditional to respect the user's existing play/pause choice (matches the intent: "music player will play again" implies only when it was playing).
- No changes to `/ad/$adNumber` — the standalone profile page keeps its current `YoutubeHoverOverlay` behavior on the main image.  
  
DO NOT CHANGE ANYTHING ELSE