import { useEffect, useRef } from "react";
import { Pause, Play, SkipBack, SkipForward, Music } from "lucide-react";
import { PlaylistMarquee } from "./PlaylistMarquee";
import { useMiniPlayerController } from "@/hooks/useMiniPlayerController";

/**
 * Inline Christian music player shown on religious ad detail pages.
 * Backed by the single global MiniPlayer iframe — clicking Play here forces
 * the Christian playlist. Clicking Play in the AdSlider (secular) swaps back.
 */
export function ChristianMusicPanel({ businessName }: { businessName: string }) {
  const player = useMiniPlayerController("religious");
  const primedRef = useRef(false);

  // On mount, ask the global player to load the Christian playlist so this
  // panel's marquee shows Christian songs and Tap-to-Play defaults to Christian.
  useEffect(() => {
    if (primedRef.current) return;
    primedRef.current = true;
    player.setPlaylist("religious");
  }, [player]);

  const showingActive = player.playing && player.activeMood === "religious";

  const handlePlayPause = () => {
    if (showingActive) {
      player.pause();
    } else {
      player.playMood("religious", 0);
    }
  };

  const handlePrev = () => {
    if (player.activeMood !== "religious") {
      player.playMood("religious", 0);
      return;
    }
    player.prev();
  };

  const handleNext = () => {
    if (player.activeMood !== "religious") {
      player.playMood("religious", 0);
      return;
    }
    player.next();
  };

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
              {showingActive && player.track?.title
                ? player.track.title
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
