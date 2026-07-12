import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Music } from "lucide-react";
import { PlaylistMarquee } from "./PlaylistMarquee";
import {
  MINIPLAYER_ACTIVITY_EVENT,
  MINIPLAYER_NEXT_EVENT,
  MINIPLAYER_PAUSE_EVENT,
  MINIPLAYER_PLAY_MOOD_EVENT,
  MINIPLAYER_PREV_EVENT,
  MINIPLAYER_SET_PLAYLIST_EVENT,
  MINIPLAYER_TRACK_EVENT,
  type MiniPlayerActivity,
  type MiniPlayerTrack,
} from "./MiniPlayer";

/**
 * Inline Christian music player shown on religious ad detail pages.
 * Backed by the single global MiniPlayer iframe — clicking Play here forces
 * the Christian playlist. Clicking Play in the AdSlider (secular) swaps back.
 */
export function ChristianMusicPanel({ businessName }: { businessName: string }) {
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<MiniPlayerTrack | null>(null);
  const [isReligiousActive, setIsReligiousActive] = useState(true);
  const primedRef = useRef(false);

  // On mount, ask the global player to load the Christian playlist so this
  // panel's marquee shows Christian songs and Tap-to-Play defaults to Christian.
  useEffect(() => {
    if (primedRef.current) return;
    primedRef.current = true;
    try {
      window.dispatchEvent(
        new CustomEvent(MINIPLAYER_SET_PLAYLIST_EVENT, {
          detail: { mood: "religious", force: true },
        }),
      );
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const onActivity = (e: Event) => {
      const detail = (e as CustomEvent<MiniPlayerActivity>).detail;
      setPlaying(Boolean(detail?.playing));
    };
    const onTrack = (e: Event) => {
      const detail = (e as CustomEvent<MiniPlayerTrack>).detail;
      setTrack(detail ?? null);
    };
    const onSet = (e: Event) => {
      const detail = (e as CustomEvent<{ mood: "secular" | "religious" }>).detail;
      if (detail?.mood) setIsReligiousActive(detail.mood === "religious");
    };
    window.addEventListener(MINIPLAYER_ACTIVITY_EVENT, onActivity);
    window.addEventListener(MINIPLAYER_TRACK_EVENT, onTrack);
    window.addEventListener(MINIPLAYER_SET_PLAYLIST_EVENT, onSet);
    return () => {
      window.removeEventListener(MINIPLAYER_ACTIVITY_EVENT, onActivity);
      window.removeEventListener(MINIPLAYER_TRACK_EVENT, onTrack);
      window.removeEventListener(MINIPLAYER_SET_PLAYLIST_EVENT, onSet);
    };
  }, []);

  const dispatch = (event: string) => {
    try {
      window.dispatchEvent(new CustomEvent(event));
    } catch {
      /* noop */
    }
  };

  const ensureReligious = () => {
    try {
      window.dispatchEvent(
        new CustomEvent(MINIPLAYER_SET_PLAYLIST_EVENT, {
          detail: { mood: "religious", force: true },
        }),
      );
    } catch {
      /* noop */
    }
  };

  const handlePlayPause = () => {
    if (playing && isReligiousActive) {
      dispatch(MINIPLAYER_PAUSE_EVENT);
    } else {
      window.dispatchEvent(
        new CustomEvent(MINIPLAYER_PLAY_MOOD_EVENT, {
          detail: { mood: "religious", index: 0 },
        }),
      );
    }
  };

  const handlePrev = () => {
    ensureReligious();
    dispatch(MINIPLAYER_PREV_EVENT);
  };

  const handleNext = () => {
    ensureReligious();
    dispatch(MINIPLAYER_NEXT_EVENT);
  };

  const showingActive = playing && isReligiousActive;

  return (
    <section
      aria-label="Christian music player"
      className="mt-6 rounded-2xl border-2 border-[#D4A24C] bg-white shadow-lg overflow-hidden"
    >
      <div className="flex items-center gap-2 bg-[#0F2A4A] px-4 py-2 text-[#D4A24C]">
        <Music size={18} />
        <h3 className="font-serif text-base sm:text-lg font-bold">
          Christian Music Player
        </h3>
        <span className="ml-auto text-[11px] font-medium uppercase tracking-wider opacity-80">
          For {businessName}
        </span>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Christian song"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0F2A4A]/10 text-[#0F2A4A] hover:bg-[#0F2A4A]/20"
          >
            <SkipBack size={16} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={handlePlayPause}
            aria-label={showingActive ? "Pause Christian music" : "Play Christian music"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0F2A4A] text-[#D4A24C] shadow hover:bg-[#0F2A4A]/90"
          >
            {showingActive ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Christian song"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0F2A4A]/10 text-[#0F2A4A] hover:bg-[#0F2A4A]/20"
          >
            <SkipForward size={16} fill="currentColor" />
          </button>

          <div className="ml-2 min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-[#0F2A4A]/60">
              {showingActive ? "Now playing" : "Christian playlist"}
            </div>
            <div className="truncate text-sm font-semibold text-[#0F2A4A]">
              {isReligiousActive && track?.title
                ? track.title
                : "Tap play to start Christian music"}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wider text-[#0F2A4A]/60">
            Browse songs · click any title to play
          </div>
          <PlaylistMarquee mood="religious" />
        </div>
      </div>
    </section>
  );
}
