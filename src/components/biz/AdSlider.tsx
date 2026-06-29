import { useEffect, useState } from "react";
import {
  Sparkles,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type { PublicAd } from "@/lib/ads.functions";
import { PlaylistMarquee } from "./PlaylistMarquee";
import { MusicWaveform } from "./MusicWaveform";
import {
  MINIPLAYER_PAUSE_EVENT,
  MINIPLAYER_PLAY_EVENT,
  MINIPLAYER_PREV_EVENT,
  MINIPLAYER_NEXT_EVENT,
  MINIPLAYER_ACTIVITY_EVENT,
  MINIPLAYER_TRACK_EVENT,
  type MiniPlayerActivity,
  type MiniPlayerTrack,
} from "./MiniPlayer";

interface Props {
  ads: PublicAd[];
  title: string;
  featured?: boolean;
}

export function AdSlider({ ads, title, featured = false }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const current = ads[idx];

  // Auto-advance using the per-ad duration (pauses with the music)
  useEffect(() => {
    if (paused || ads.length <= 1 || !current) return;
    const seconds = current.duration_seconds || 7;
    const id = window.setTimeout(() => {
      setIdx((i) => (i + 1) % ads.length);
    }, seconds * 1000);
    return () => window.clearTimeout(id);
  }, [idx, ads.length, current, paused]);

  // Listen to music player activity/track
  useEffect(() => {
    const onActivity = (e: Event) => {
      const detail = (e as CustomEvent<MiniPlayerActivity>).detail;
      setMusicPlaying(Boolean(detail?.playing));
    };
    const onTrack = (e: Event) => {
      const detail = (e as CustomEvent<MiniPlayerTrack>).detail;
      setTrackTitle(detail?.title ?? "");
    };
    window.addEventListener(MINIPLAYER_ACTIVITY_EVENT, onActivity);
    window.addEventListener(MINIPLAYER_TRACK_EVENT, onTrack);
    return () => {
      window.removeEventListener(MINIPLAYER_ACTIVITY_EVENT, onActivity);
      window.removeEventListener(MINIPLAYER_TRACK_EVENT, onTrack);
    };
  }, []);

  const accent = featured ? "#D4A24C" : "#0F2A4A";

  const dispatchMusic = (event: string) =>
    window.dispatchEvent(new CustomEvent(event));

  const fullAdVisible = isHovering;

  const togglePlayPause = () => {
    if (musicPlaying) {
      dispatchMusic(MINIPLAYER_PAUSE_EVENT);
      setPaused(true);
    } else {
      dispatchMusic(MINIPLAYER_PLAY_EVENT);
      setPaused(false);
    }
  };

  return (
    <section id="ad-slideshow" className="my-8">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="font-serif text-xl text-[#0F2A4A] font-bold flex items-center gap-2">
          {featured && <Sparkles size={18} className="text-[#D4A24C]" />}
          {title}
        </h2>
        {ads.length > 0 && (
          <div className="text-xs text-gray-500">
            {idx + 1} / {ads.length} · {current?.duration_seconds ?? 0}s each
          </div>
        )}
      </div>

      {ads.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
          No ads here yet. <span className="text-[#0F2A4A] font-medium">Be the first to advertise!</span>
        </div>
      ) : (
        <>
          <div
            className="relative rounded-2xl overflow-hidden shadow-xl bg-white mx-auto"
            style={{
              border: `3px solid ${accent}`,
              height: "min(calc(100svh - 320px), 56.25vw)",
              aspectRatio: "16 / 9",
              width: "auto",
              maxWidth: "100%",
            }}
          >
            <div
              className="relative w-full h-full bg-gray-100 group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              {current.website_url ? (
                <a
                  href={current.website_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={`Visit ${current.business_name}`}
                  className="absolute inset-0"
                >
                  <img
                    src={current.image_url}
                    alt={current.business_name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
                    style={{
                      transform: fullAdVisible ? "scale(1)" : "scale(1.52)",
                      transformOrigin: "top center",
                    }}
                  />
                </a>
              ) : (
                <img
                  src={current.image_url}
                  alt={current.business_name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
                  style={{
                    transform: fullAdVisible ? "scale(1)" : "scale(1.52)",
                    transformOrigin: "top center",
                  }}
                />
              )}
            </div>
          </div>

          {/* Music controls — drive the YouTube playlist while the slideshow runs */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#0F2A4A]/15 bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Music size={16} className="text-[#D4A24C] shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-gray-500">
                  Background music
                </div>
                <div className="text-xs font-medium text-[#0F2A4A] truncate max-w-[140px] sm:max-w-[260px]">
                  {trackTitle || (musicPlaying ? "Now playing…" : "Paused")}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center px-2">
              <MusicWaveform playing={musicPlaying} />
            </div>

            <div className="flex items-center justify-end gap-1 flex-1">
              <button
                type="button"
                onClick={() => dispatchMusic(MINIPLAYER_PREV_EVENT)}
                aria-label="Previous track"
                className="rounded-full p-2 text-[#0F2A4A] hover:bg-[#0F2A4A]/10"
              >
                <SkipBack size={16} />
              </button>
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={musicPlaying ? "Pause music" : "Play music"}
                className="rounded-full p-2 bg-[#0F2A4A] text-[#D4A24C] hover:bg-[#0F2A4A]/90"
              >
                {musicPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
              </button>
              <button
                type="button"
                onClick={() => dispatchMusic(MINIPLAYER_NEXT_EVENT)}
                aria-label="Next track"
                className="rounded-full p-2 text-[#0F2A4A] hover:bg-[#0F2A4A]/10"
              >
                <SkipForward size={16} />
              </button>
            </div>
          </div>
          {featured && <PlaylistMarquee />}
        </>
      )}
    </section>
  );
}
