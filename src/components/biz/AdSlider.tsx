import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Clock,
  Search,
  X,
} from "lucide-react";
import { INDUSTRIES } from "@/lib/biz-utils";



import type { PublicAd } from "@/lib/ads.functions";
import { ShareBar } from "./ShareBar";
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

function SlideTimer({
  duration,
  remaining,
  accent,
}: {
  duration: number;
  remaining: number;
  accent: string;
}) {
  const progress = useMemo(
    () => (duration > 0 ? (remaining / duration) * 100 : 0),
    [duration, remaining],
  );
  return (
    <div
      className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-[#0F2A4A]/70 px-2.5 py-1 text-white text-xs font-bold backdrop-blur-sm shadow-md"
      aria-label={`Next ad in ${Math.ceil(remaining)} seconds`}
    >
      <Clock size={13} className="text-[#D4A24C]" />
      <span className="tabular-nums">{Math.ceil(remaining)}s</span>
      <div
        className="absolute bottom-0 left-1.5 right-1.5 h-0.5 rounded-full bg-white/30"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}


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
  const [hovered, setHovered] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const searchIdleTimerRef = useRef<number | null>(null);
  const current = ads[idx];
  const duration = current?.duration_seconds || 7;
  const [timeLeft, setTimeLeft] = useState(() => ads[0]?.duration_seconds || 7);

  const industryLabel = (value: string) =>
    INDUSTRIES.find((i) => i.value === value)?.label ?? value;

  const suggestions = useMemo(() => {
    const raw = searchQuery.trim();
    const q = raw.toLowerCase();
    if (!q) return [];
    const numericQ = raw.replace(/^#/, "").trim();
    return ads
      .filter((a) => {
        const label = industryLabel(a.industry).toLowerCase();
        const adNum = a.ad_number != null ? String(a.ad_number) : "";
        return (
          a.business_name.toLowerCase().includes(q) ||
          a.industry.toLowerCase().includes(q) ||
          label.includes(q) ||
          (a.tagline ?? "").toLowerCase().includes(q) ||
          (numericQ.length > 0 && adNum.includes(numericQ))
        );
      })
      .slice(0, 6);
  }, [searchQuery, ads]);

  const clearPeekTimer = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const clearSearchIdleTimer = () => {
    if (searchIdleTimerRef.current) {
      window.clearTimeout(searchIdleTimerRef.current);
      searchIdleTimerRef.current = null;
    }
  };

  const showSearchPeek = () => {
    if (searchOpen) return;
    setHovered(true);
    clearPeekTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      hideTimerRef.current = null;
    }, 2000);
  };

  const pickAd = (adId: string) => {
    const i = ads.findIndex((a) => a.id === adId);
    if (i >= 0) setIdx(i);
    setSearchQuery("");
    setSearchOpen(false);
    setHovered(false);
    clearPeekTimer();
    clearSearchIdleTimer();
  };

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    return () => {
      clearPeekTimer();
      clearSearchIdleTimer();
    };
  }, []);

  useEffect(() => {
    clearSearchIdleTimer();
    if (searchOpen && searchQuery.trim() === "") {
      searchIdleTimerRef.current = window.setTimeout(() => {
        setSearchOpen(false);
        setHovered(false);
        searchIdleTimerRef.current = null;
      }, 3000);
    }
    return () => clearSearchIdleTimer();
  }, [searchOpen, searchQuery]);



  // Reset the countdown whenever the slide (or its duration) changes
  useEffect(() => {
    setTimeLeft(duration);
  }, [duration, idx]);

  // Tick the countdown down (pauses with the music)
  useEffect(() => {
    if (paused || ads.length <= 1 || !current) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 0.1));
    }, 100);
    return () => window.clearInterval(id);
  }, [paused, ads.length, current, duration]);

  // Advance the slide when the countdown reaches zero
  useEffect(() => {
    if (paused || ads.length <= 1 || !current || timeLeft > 0) return;
    const id = window.setTimeout(() => {
      setIdx((i) => (i + 1) % ads.length);
    }, 0);
    return () => window.clearTimeout(id);
  }, [timeLeft, paused, ads.length, current]);

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
    <section id="ad-slideshow" className="my-8 min-w-0">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-3 gap-2 min-w-0">
        <div />
        <h2 className="font-serif text-xl text-[#0F2A4A] font-bold flex items-center gap-2 text-center justify-center min-w-0">
          {featured && <Sparkles size={18} className="text-[#D4A24C] shrink-0" />}
          <span className="min-w-0 break-words">{title}</span>
        </h2>
        {ads.length > 0 && (
          <div className="text-xs text-gray-500 justify-self-end text-right shrink-0">
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
            className="relative rounded-2xl overflow-hidden shadow-xl bg-white mx-auto w-full group max-w-full"
            style={{
              border: `3px solid ${accent}`,
              aspectRatio: "4 / 3",
              maxHeight: "min(90svh, 900px)",
              maxWidth: "min(100%, 1400px, calc(90svh * 4 / 3))",
            }}
            onMouseEnter={showSearchPeek}
            onMouseMove={showSearchPeek}
            onMouseLeave={() => {
              clearPeekTimer();
              setHovered(false);
              if (!searchQuery) setSearchOpen(false);
            }}

          >
            <div className="relative w-full h-full bg-gray-100">
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
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </a>
              ) : (
                <img
                  src={current.image_url}
                  alt={current.business_name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}
            </div>
            {ads.length > 0 && (
              <SlideTimer
                duration={duration}
                remaining={timeLeft}
                accent={accent}
              />
            )}

            {/* Share bar — bottom-left overlay, pauses slider on click */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full bg-[#0F2A4A]/70 px-2.5 py-1.5 backdrop-blur-sm shadow-md">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/90 pl-1">
                Share
              </span>
              <ShareBar
                adNumber={current.ad_number}
                businessName={current.business_name}
                tagline={current.tagline}
                onOpen={() => setPaused(true)}
                compact
              />
            </div>

            {/* Hover-revealed search bar (center) */}
            {(hovered || searchOpen) && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 flex justify-center px-4 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-md">
                  {!searchOpen ? (
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      className="mx-auto flex items-center gap-2 rounded-full bg-white/95 px-5 py-3 text-[#0F2A4A] font-semibold shadow-2xl ring-2 ring-[#D4A24C] hover:bg-white"
                    >
                      <Search size={18} />
                      Search businesses…
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-white/98 shadow-2xl ring-2 ring-[#D4A24C] overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
                        <Search size={16} className="text-[#0F2A4A]" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && suggestions[0]) {
                              pickAd(suggestions[0].id);
                            } else if (e.key === "Escape") {
                              setSearchQuery("");
                              setSearchOpen(false);
                            }
                          }}
                          placeholder="Search by Business Name, Category, or Ad # (e.g. 2911)"
                          className="flex-1 bg-transparent text-sm text-[#0F2A4A] placeholder-gray-400 outline-none py-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSearchOpen(false);
                            clearSearchIdleTimer();
                          }}
                          aria-label="Close search"
                          className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {searchQuery && (
                        <div className="max-h-64 overflow-y-auto">
                          {suggestions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              No matching businesses.
                            </div>
                          ) : (
                            suggestions.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => pickAd(s.id)}
                                className="w-full text-left px-4 py-2 text-sm text-[#0F2A4A] hover:bg-[#0F2A4A]/10 flex items-center justify-between gap-2"
                              >
                                <span className="truncate flex items-baseline gap-2 min-w-0">
                                  {s.ad_number != null && (
                                    <span className="text-xs font-mono text-gray-500 shrink-0">#{s.ad_number}</span>
                                  )}
                                  <span className="font-medium truncate">{s.business_name}</span>
                                  <span className="text-xs text-[#D4A24C] font-semibold shrink-0">
                                    = {industryLabel(s.industry)}
                                  </span>
                                </span>
                                <span className="text-xs text-gray-500 shrink-0">
                                  {s.duration_seconds ?? 7}s
                                </span>
                              </button>
                            ))

                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
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
