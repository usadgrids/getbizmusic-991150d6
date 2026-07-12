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
import { INDUSTRIES, AD_PLANS, type AdPlan } from "@/lib/biz-utils";



import type { PublicAd } from "@/lib/ads.functions";
import { ShareBar } from "./ShareBar";
import { PlaylistMarquee } from "./PlaylistMarquee";
import { MusicWaveform } from "./MusicWaveform";
import { parseYoutubeId } from "./YoutubeHoverOverlay";
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
      className="flex items-center gap-1.5 rounded-full bg-[#0F2A4A]/70 px-2.5 py-1 text-white text-xs font-bold backdrop-blur-sm shadow-md"
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

// Resolve the authoritative rotation seconds for an ad. Always prefer the
// server-supplied duration_seconds; if missing/invalid, fall back to the
// plan default. Never use a hard-coded generic number here — this is a
// legal/contractual guarantee to advertisers.
function resolveDuration(ad: PublicAd | undefined): number {
  if (!ad) return 0;
  const raw = Number(ad.duration_seconds);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return AD_PLANS[ad.ad_type as AdPlan]?.seconds ?? 0;
}

export function AdSlider({ ads, title, featured = false }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shareResumeTimerRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(0);
  const resumeRemainingRef = useRef<number | null>(null);
  const [videoActive, setVideoActive] = useState(false);
  const [videoNonce, setVideoNonce] = useState(0);
  const videoLeaveTimerRef = useRef<number | null>(null);
  const wasMusicPlayingRef = useRef(false);

  const handleShareOpen = () => {
    setPaused(true);
    if (typeof window === "undefined") return;
    if (shareResumeTimerRef.current) window.clearTimeout(shareResumeTimerRef.current);
    const resume = () => {
      setPaused(false);
      window.removeEventListener("focus", onFocus);
      if (shareResumeTimerRef.current) {
        window.clearTimeout(shareResumeTimerRef.current);
        shareResumeTimerRef.current = null;
      }
    };
    const onFocus = () => resume();
    window.addEventListener("focus", onFocus, { once: true });
    shareResumeTimerRef.current = window.setTimeout(resume, 30000);
  };
  const current = ads[idx];
  const duration = resolveDuration(current);
  const [timeLeft, setTimeLeft] = useState(() => resolveDuration(ads[0]));

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

  const pickAd = (adId: string) => {
    const i = ads.findIndex((a) => a.id === adId);
    if (i >= 0) setIdx(i);
    setSearchQuery("");
    setSearchFocused(false);
    searchInputRef.current?.blur();
  };


  // Track the latest displayed remaining time so pausing can resume from it.
  useEffect(() => {
    remainingRef.current = timeLeft;
  }, [timeLeft]);

  // When the ad changes, clear any saved resume time so the new ad starts fresh.
  useEffect(() => {
    resumeRemainingRef.current = null;
    // Also dismiss any active hover-video on slide change.
    if (videoLeaveTimerRef.current) {
      window.clearTimeout(videoLeaveTimerRef.current);
      videoLeaveTimerRef.current = null;
    }
    setVideoActive(false);
  }, [idx]);

  useEffect(() => {
    return () => {
      if (videoLeaveTimerRef.current) window.clearTimeout(videoLeaveTimerRef.current);
    };
  }, []);

  const currentVideoId = parseYoutubeId(current?.youtube_url);

  const activateVideo = () => {
    if (!currentVideoId) return;
    if (videoLeaveTimerRef.current) {
      window.clearTimeout(videoLeaveTimerRef.current);
      videoLeaveTimerRef.current = null;
    }
    setVideoActive((prev) => {
      if (!prev) {
        setVideoNonce((n) => n + 1);
        wasMusicPlayingRef.current = true;
        setPaused(true);
        try {
          window.dispatchEvent(new CustomEvent(MINIPLAYER_PAUSE_EVENT));
        } catch {
          /* noop */
        }
      }
      return true;
    });
  };

  const deactivateVideo = (immediate = false) => {
    if (videoLeaveTimerRef.current) {
      window.clearTimeout(videoLeaveTimerRef.current);
      videoLeaveTimerRef.current = null;
    }
    const run = () => {
      setVideoActive(false);
      setPaused(false);
      if (wasMusicPlayingRef.current) {
        try {
          window.dispatchEvent(new CustomEvent(MINIPLAYER_PLAY_EVENT));
        } catch {
          /* noop */
        }
      }
      wasMusicPlayingRef.current = false;
      videoLeaveTimerRef.current = null;
    };
    if (immediate) {
      run();
    } else {
      videoLeaveTimerRef.current = window.setTimeout(run, 60);
    }
  };

  // Deadline-based rotation: schedule advance at start + duration*1000. Also
  // recompute timeLeft from Date.now() each tick so background-tab throttling,
  // interval jitter, and float drift can NEVER make an ad run longer or
  // shorter than its contracted duration_seconds.
  useEffect(() => {
    if (!current || duration <= 0) return;
    if (paused || ads.length <= 1) {
      // While paused, keep remaining time visible without advancing.
      resumeRemainingRef.current = remainingRef.current > 0 ? remainingRef.current : duration;
      setTimeLeft((prev) => (prev > 0 ? prev : duration));
      return;
    }
    const initialRemaining = resumeRemainingRef.current != null && resumeRemainingRef.current > 0
      ? resumeRemainingRef.current
      : duration;
    resumeRemainingRef.current = null;
    const startedAt = Date.now();
    const deadline = startedAt + initialRemaining * 1000;
    setTimeLeft(initialRemaining);

    const advanceId = window.setTimeout(() => {
      setIdx((i) => (i + 1) % ads.length);
    }, initialRemaining * 1000);

    const tickId = window.setInterval(() => {
      const remaining = Math.max(0, (deadline - Date.now()) / 1000);
      setTimeLeft(remaining);
    }, 100);

    return () => {
      window.clearTimeout(advanceId);
      window.clearInterval(tickId);
    };
  }, [idx, duration, paused, ads.length, current]);

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
      <div className="relative mb-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
        <div className="hidden sm:block" />
        <h2 className="font-serif text-xl text-[#0F2A4A] font-bold flex items-center gap-2 text-center justify-center min-w-0 order-1">
          {featured && <Sparkles size={18} className="text-[#D4A24C] shrink-0" />}
          <span className="min-w-0 break-words">{title}</span>
        </h2>
        <div className="flex flex-col items-stretch sm:items-end gap-1 justify-self-stretch sm:justify-self-end min-w-0 order-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0F2A4A]/60"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) {
                  pickAd(suggestions[0].id);
                } else if (e.key === "Escape") {
                  setSearchQuery("");
                  searchInputRef.current?.blur();
                }
              }}
              placeholder="Search business, category, or ad #"
              aria-label="Search businesses"
              className="w-full rounded-full border border-[#0F2A4A]/20 bg-white pl-9 pr-9 py-2 text-sm text-[#0F2A4A] placeholder-gray-400 shadow-sm ring-[#D4A24C] focus:outline-none focus:ring-2"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {ads.length > 0 && (
            <span className="whitespace-nowrap text-xs text-gray-500 text-right">
              {idx + 1} / {ads.length} · {current?.duration_seconds ?? 0}s each
            </span>
          )}
        </div>
        {searchFocused && searchQuery.trim() !== "" && (
          <div className="absolute left-1/2 top-full z-40 mt-2 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2">
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-2 ring-[#D4A24C]">
              {suggestions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No matching businesses.</div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickAd(s.id)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-[#0F2A4A] hover:bg-[#0F2A4A]/10"
                    >
                      <span className="flex min-w-0 items-baseline gap-2 truncate">
                        {s.ad_number != null && (
                          <span className="shrink-0 font-mono text-xs text-gray-500">
                            #{s.ad_number}
                          </span>
                        )}
                        <span className="truncate font-medium">{s.business_name}</span>
                        <span className="shrink-0 text-xs font-semibold text-[#D4A24C]">
                          = {industryLabel(s.industry)}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-gray-500">
                        {s.duration_seconds ?? 7}s
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {ads.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
          No ads here yet. <span className="text-[#0F2A4A] font-medium">Be the first to advertise!</span>
        </div>
      ) : (
          <div
            className="mx-auto w-full"
            style={{
              maxWidth: "min(100%, 1400px, calc(90svh * 4 / 3))",
            }}
          >
          <div
            className="relative rounded-2xl overflow-hidden shadow-xl bg-white w-full group max-w-full"
            style={{
              border: `3px solid ${accent}`,
              aspectRatio: "4 / 3",
              maxHeight: "min(90svh, 900px)",
            }}

            onMouseLeave={() => {
              if (videoActive) deactivateVideo(true);
            }}

          >

            <div
              className="relative w-full h-full bg-gray-100"
            >
              <img
                src={current.image_url}
                alt={current.business_name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-contain"
              />
              {videoActive && currentVideoId && (
                <div
                  key={videoNonce}
                  className="absolute inset-0 z-10 flex items-center justify-center p-[6%]"
                  onMouseEnter={activateVideo}
                  onMouseLeave={() => deactivateVideo()}
                >
                  <div
                    className="overflow-hidden rounded-xl bg-black shadow-2xl ring-2 ring-[#D4A24C]"
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      aspectRatio: "16 / 9",
                    }}
                  >
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${currentVideoId}`}
                      title={`${current.business_name} video`}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="block h-full w-full border-0"
                    />
                  </div>
                </div>
              )}
            </div>
            {ads.length > 0 && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                {currentVideoId && (
                  <button
                    type="button"
                    onMouseEnter={activateVideo}
                    onMouseLeave={() => deactivateVideo()}
                    onFocus={activateVideo}
                    onBlur={() => deactivateVideo()}
                    onTouchStart={activateVideo}
                    onClick={() => (videoActive ? deactivateVideo() : activateVideo())}
                    aria-label={videoActive ? "Pause video" : "Play video"}
                    className="flex items-center gap-1 rounded-full bg-[#0F2A4A]/70 px-2.5 py-1 text-white text-xs font-bold backdrop-blur-sm shadow-md hover:text-[#D4A24C]"
                  >
                    {videoActive ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
                    {videoActive ? "Pause Video" : "Play Video"}
                  </button>
                )}
                {current?.website_url && (
                  <a
                    href={current.website_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="rounded-full bg-[#0F2A4A]/70 px-2.5 py-1 text-white text-xs font-bold backdrop-blur-sm shadow-md hover:text-[#D4A24C]"
                  >
                    Website
                  </a>
                )}
                <SlideTimer
                  duration={duration}
                  remaining={timeLeft}
                  accent={accent}
                />
              </div>
            )}

          </div>


          {/* Pause / Play ad controls — below the slider, above the share bar */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#0F2A4A]/15 bg-white px-3 py-2 shadow-sm">
            <div className="text-sm font-semibold text-[#0F2A4A]">
              {paused ? "Ad is paused" : "Ad is playing"}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setIdx((i) => (ads.length ? (i - 1 + ads.length) % ads.length : 0))
                }
                aria-label="Previous ad"
                className="flex items-center gap-2 rounded-full bg-[#0F2A4A] px-4 py-2 text-sm font-semibold text-[#D4A24C] hover:bg-[#0F2A4A]/90"
              >
                <SkipBack size={16} fill="currentColor" />
                Previous Ad
              </button>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play ad" : "Pause ad"}
                className="flex items-center gap-2 rounded-full bg-[#0F2A4A] px-4 py-2 text-sm font-semibold text-[#D4A24C] hover:bg-[#0F2A4A]/90"
              >
                {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} />}
                {paused ? "Play Ad" : "Pause Ad"}
              </button>
            </div>
          </div>

          {/* Share this ad image — persistent, pauses slider on click, resumes on tab return */}
          {current && current.ad_number != null && (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-[#0F2A4A]/15 bg-white px-3 py-2 shadow-sm">
              <div className="text-sm font-semibold text-[#0F2A4A]">
                Share this ad image
              </div>
              <ShareBar
                adNumber={current.ad_number}
                businessName={current.business_name}
                tagline={current.tagline}
                onOpen={handleShareOpen}
                compact
              />
            </div>
          )}

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
                className="flex items-center gap-2 rounded-full bg-[#0F2A4A] px-4 py-2 text-sm font-semibold text-[#D4A24C] hover:bg-[#0F2A4A]/90"
              >
                {musicPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                {musicPlaying ? "Pause Music" : "Play Music"}
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
        </div>
      )}
    </section>
  );
}
