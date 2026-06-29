import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Music, Play, Volume2 } from "lucide-react";

const PLAYLIST_ID = "PLp93JI5bGWYnVI3YlstpndURt44OgrIKj";
const PLAYER_ELEMENT_ID = "family-mini-player-iframe";
const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
const PLAYER_STATE_UNSTARTED = -1;
const PLAYER_STATE_ENDED = 0;
const PLAYER_STATE_PLAYING = 1;
const PLAYER_STATE_PAUSED = 2;
const PLAYER_STATE_CUED = 5;

export const MINIPLAYER_PAUSE_EVENT = "miniplayer:pause";
export const MINIPLAYER_PLAY_EVENT = "miniplayer:play";
export const MINIPLAYER_UNMUTE_EVENT = "miniplayer:unmute";
export const MINIPLAYER_PREV_EVENT = "miniplayer:prev";
export const MINIPLAYER_NEXT_EVENT = "miniplayer:next";
export const MINIPLAYER_TRACK_EVENT = "miniplayer:track";
export const MINIPLAYER_ACTIVITY_EVENT = "miniplayer:activity";
export const MINIPLAYER_VOLUME_EVENT = "miniplayer:volume";
export const MINIPLAYER_PLAY_INDEX_EVENT = "miniplayer:play-index";
export const MINIPLAYER_PLAYLIST_EVENT = "miniplayer:playlist";

export type MiniPlayerTrack = { title: string; author: string };
export type MiniPlayerActivity = {
  playing: boolean;
  ready?: boolean;
  source?: "player" | "user" | "fallback";
};

type YouTubeVideoData = {
  video_id?: string;
  title?: string;
  author?: string;
};

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  getVideoData: () => YouTubeVideoData;
  getPlaylist: () => string[] | undefined;
  loadPlaylist: (options: { listType: "playlist"; list: string; index?: number; startSeconds?: number }) => void;
  mute: () => void;
  nextVideo: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  playVideoAt: (index: number) => void;
  previousVideo: () => void;
  setLoop: (loopPlaylists: boolean) => void;
  setShuffle: (shufflePlaylist: boolean) => void;
  setVolume: (volume: number) => void;
  unMute: () => void;
};

type YouTubePlayerEvent = {
  data: number;
  target: YouTubePlayer;
};

type YouTubePlayerApi = {
  Player: new (
    elementId: string,
    config: {
      width: number | string;
      height: number | string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: YouTubePlayerEvent) => void;
        onStateChange?: (event: YouTubePlayerEvent) => void;
      };
    },
  ) => YouTubePlayer;
};

type WindowWithYT = Window & {
  YT?: YouTubePlayerApi;
  onYouTubeIframeAPIReady?: () => void;
};

const clampVolume = (value: number) => Math.max(0, Math.min(100, value));

function TapToPlayOverlay({
  visible,
  onTap,
}: {
  visible: boolean;
  onTap: () => void;
}) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F2A4A]/70 p-4 animate-in fade-in zoom-in-95 duration-300"
      aria-live="polite"
      role="dialog"
      aria-modal="true"
      aria-label="Tap to play music"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center border-2 border-[#D4A24C]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0F2A4A] text-[#D4A24C]">
          <Music size={28} />
        </div>
        <h2 className="mb-2 font-serif text-2xl font-bold text-[#0F2A4A]">
          Tap to Play Music
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          Your browser requires a tap before music can start.
        </p>
        <button
          type="button"
          onClick={onTap}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F2A4A] px-6 py-3 text-base font-semibold text-[#D4A24C] shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Play size={20} fill="currentColor" />
          Play Music
        </button>
      </div>
    </div>
  );
}

export function MiniPlayer() {
  const [collapsed, setCollapsed] = useState(false);
  const [showPlayFallback, setShowPlayFallback] = useState(false);
  const [size, setSize] = useState({ width: 200, height: 113 });

  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerReadyRef = useRef(false);
  const startedRef = useRef(false);
  const mutedFallbackRef = useRef(false);
  const randomIndexRef = useRef(1);
  const lastVideoIdRef = useRef<string | null>(null);
  const lastPlaybackTimeRef = useRef(0);
  const resumeFallbackRef = useRef<number | null>(null);
  const autoplayFallbackRef = useRef<number | null>(null);
  const trackRefreshTimeoutsRef = useRef<number[]>([]);
  const playSucceededRef = useRef(false);
  const pauseRequestedRef = useRef(false);
  const volumeRef = useRef(100);

  const clearResumeFallback = useCallback(() => {
    if (resumeFallbackRef.current) {
      window.clearTimeout(resumeFallbackRef.current);
      resumeFallbackRef.current = null;
    }
  }, []);

  const clearAutoplayFallback = useCallback(() => {
    if (autoplayFallbackRef.current) {
      window.clearTimeout(autoplayFallbackRef.current);
      autoplayFallbackRef.current = null;
    }
  }, []);

  const clearTrackRefreshTimeouts = useCallback(() => {
    trackRefreshTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    trackRefreshTimeoutsRef.current = [];
  }, []);

  const syncEmbeddedFrame = useCallback(() => {
    const iframe = playerHostRef.current?.querySelector("iframe");

    if (!(iframe instanceof HTMLIFrameElement)) return;

    iframe.className = "h-full w-full opacity-100";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.style.border = "0";
  }, []);

  const reportPlayback = useCallback(
    (playing: boolean, source: MiniPlayerActivity["source"] = "player") => {
      window.dispatchEvent(
        new CustomEvent<MiniPlayerActivity>(MINIPLAYER_ACTIVITY_EVENT, {
          detail: { playing, ready: startedRef.current || playing, source },
        }),
      );
    },
    [],
  );

  const syncTrackData = useCallback((player: YouTubePlayer | null = playerRef.current) => {
    if (!player) return;

    try {
      lastPlaybackTimeRef.current = Math.max(0, player.getCurrentTime() || 0);
    } catch {
      lastPlaybackTimeRef.current = 0;
    }

    try {
      const videoData = player.getVideoData();

      if (videoData?.video_id && videoData.video_id !== lastVideoIdRef.current) {
        lastVideoIdRef.current = videoData.video_id;
        window.dispatchEvent(
          new CustomEvent<MiniPlayerTrack>(MINIPLAYER_TRACK_EVENT, {
            detail: {
              title: videoData.title || "",
              author: videoData.author || "",
            },
          }),
        );
      }
    } catch {
      return;
    }
  }, []);

  const publishPlaylist = useCallback((player: YouTubePlayer | null = playerRef.current) => {
    if (!player) return;
    let attempts = 0;
    const tryPublish = () => {
      attempts += 1;
      let ids: string[] | undefined;
      try {
        ids = player.getPlaylist();
      } catch {
        ids = undefined;
      }
      if (ids && ids.length > 0) {
        window.dispatchEvent(
          new CustomEvent(MINIPLAYER_PLAYLIST_EVENT, { detail: { videoIds: ids } }),
        );
        return;
      }
      if (attempts < 12) window.setTimeout(tryPublish, 500);
    };
    tryPublish();
  }, []);

  const queueResumeFallback = useCallback(() => {
    clearResumeFallback();

    resumeFallbackRef.current = window.setTimeout(() => {
      if (!playSucceededRef.current && document.visibilityState === "visible") {
        setShowPlayFallback(true);
        reportPlayback(false, "fallback");
      }
    }, 1800);
  }, [clearResumeFallback, reportPlayback]);

  const startPlayback = useCallback(
    (withSound: boolean, forcePlaylistLoad: boolean) => {
      const player = playerRef.current;
      if (!player) return;

      playSucceededRef.current = false;
      pauseRequestedRef.current = false;
      mutedFallbackRef.current = !withSound;
      setShowPlayFallback(!withSound);

      try {
        player.setLoop(true);
        player.setShuffle(true);
      } catch {
        // Ignore player setup failures until the API is fully ready.
      }

      try {
        if (forcePlaylistLoad || !startedRef.current) {
          player.loadPlaylist({
            listType: "playlist",
            list: PLAYLIST_ID,
            index: randomIndexRef.current,
          });
        }

        if (withSound) {
          player.unMute();
          player.setVolume(clampVolume(volumeRef.current));
        } else {
          player.mute();
        }

        player.playVideo();
      } catch {
        if (withSound) {
          setShowPlayFallback(true);
          reportPlayback(false, "fallback");
        }
        return;
      }

      if (withSound) {
        queueResumeFallback();
      } else {
        reportPlayback(false, "fallback");
      }
    },
    [queueResumeFallback, reportPlayback],
  );

  const pauseCurrentTrack = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    clearAutoplayFallback();
    clearResumeFallback();
    syncTrackData(player);

    pauseRequestedRef.current = true;
    mutedFallbackRef.current = false;
    playSucceededRef.current = true;
    setShowPlayFallback(false);

    try {
      player.pauseVideo();
    } catch {
      // Ignore no-op pause failures.
    }

    reportPlayback(false, "user");
  }, [clearAutoplayFallback, clearResumeFallback, reportPlayback, syncTrackData]);

  const resumeCurrentTrack = useCallback(() => {
    const player = playerRef.current;

    if (!player || !playerReadyRef.current) {
      setShowPlayFallback(true);
      reportPlayback(false, "fallback");
      return;
    }

    clearAutoplayFallback();
    clearResumeFallback();

    pauseRequestedRef.current = false;
    mutedFallbackRef.current = false;
    playSucceededRef.current = false;
    setShowPlayFallback(false);

    try {
      player.unMute();
      player.setVolume(clampVolume(volumeRef.current));

      if (!startedRef.current) {
        player.loadPlaylist({
          listType: "playlist",
          list: PLAYLIST_ID,
          index: randomIndexRef.current,
        });
      }

      player.playVideo();
    } catch {
      setShowPlayFallback(true);
      reportPlayback(false, "fallback");
      return;
    }

    queueResumeFallback();
  }, [clearAutoplayFallback, clearResumeFallback, queueResumeFallback, reportPlayback]);

  const handleManualPlay = useCallback(() => {
    resumeCurrentTrack();
  }, [resumeCurrentTrack]);

  const scheduleTrackRefresh = useCallback(() => {
    clearTrackRefreshTimeouts();
    [250, 700, 1400, 2200].forEach((delay) => {
      const timeoutId = window.setTimeout(() => {
        syncEmbeddedFrame();
        syncTrackData();
      }, delay);

      trackRefreshTimeoutsRef.current.push(timeoutId);
    });
  }, [clearTrackRefreshTimeouts, syncEmbeddedFrame, syncTrackData]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    randomIndexRef.current = Math.floor(Math.random() * 12) + 1;

    let disposed = false;
    const win = window as WindowWithYT;

    const ensureYouTubeApi = () =>
      new Promise<void>((resolve) => {
        if (win.YT?.Player) {
          resolve();
          return;
        }

        const previousReady = win.onYouTubeIframeAPIReady;
        win.onYouTubeIframeAPIReady = () => {
          previousReady?.();
          resolve();
        };

        if (!document.querySelector(`script[src="${YOUTUBE_IFRAME_API_SRC}"]`)) {
          const script = document.createElement("script");
          script.src = YOUTUBE_IFRAME_API_SRC;
          script.async = true;
          document.head.appendChild(script);
        }
      });

    ensureYouTubeApi()
      .then(() => {
        if (disposed || !win.YT?.Player || playerRef.current) return;

        const player = new win.YT.Player(PLAYER_ELEMENT_ID, {
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            list: PLAYLIST_ID,
            listType: "playlist",
            loop: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (disposed) return;

              playerRef.current = event.target;
              playerReadyRef.current = true;
              syncEmbeddedFrame();
              syncTrackData(event.target);
              startPlayback(true, true);
              publishPlaylist(event.target);

              clearAutoplayFallback();
              autoplayFallbackRef.current = window.setTimeout(() => {
                if (disposed || startedRef.current) return;
                startPlayback(false, true);
              }, 1800);

              window.setTimeout(() => {
                syncEmbeddedFrame();
                syncTrackData(event.target);
              }, 300);
            },
            onStateChange: (event) => {
              if (disposed) return;

              syncEmbeddedFrame();
              syncTrackData(event.target);

              if (event.data === PLAYER_STATE_PLAYING) {
                clearAutoplayFallback();
                clearResumeFallback();
                startedRef.current = true;
                playSucceededRef.current = true;
                publishPlaylist(event.target);

                if (mutedFallbackRef.current) {
                  setShowPlayFallback(true);
                  reportPlayback(false, "fallback");
                  return;
                }

                pauseRequestedRef.current = false;
                setShowPlayFallback(false);
                reportPlayback(true);
                return;
              }

              if (event.data === PLAYER_STATE_PAUSED) {
                reportPlayback(false, pauseRequestedRef.current ? "user" : "player");

                if (pauseRequestedRef.current) {
                  setShowPlayFallback(true);
                }

                return;
              }

              if (
                event.data === PLAYER_STATE_UNSTARTED ||
                event.data === PLAYER_STATE_CUED ||
                event.data === PLAYER_STATE_ENDED
              ) {
                window.setTimeout(() => syncTrackData(event.target), 300);
              }
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (disposed) return;
        setShowPlayFallback(true);
        reportPlayback(false, "fallback");
      });

    return () => {
      disposed = true;
      clearAutoplayFallback();
      clearResumeFallback();
      clearTrackRefreshTimeouts();
      playerReadyRef.current = false;
      startedRef.current = false;
      mutedFallbackRef.current = false;

      try {
        playerRef.current?.destroy();
      } catch {
        // Ignore cleanup failures during unmount.
      }

      playerRef.current = null;
    };
  }, [
    clearAutoplayFallback,
    clearResumeFallback,
    clearTrackRefreshTimeouts,
    reportPlayback,
    startPlayback,
    syncEmbeddedFrame,
    syncTrackData,
    publishPlaylist,
  ]);

  useEffect(() => {
    const playbackPoll = window.setInterval(() => {
      if (document.visibilityState !== "visible" || !startedRef.current) return;

      syncEmbeddedFrame();
      syncTrackData();
    }, 900);

    const onPause = () => pauseCurrentTrack();
    const onPlay = () => resumeCurrentTrack();
    const onUnmute = () => handleManualPlay();
    const onPrevTrack = () => {
      try {
        playerRef.current?.previousVideo();
      } catch {
        return;
      }

      mutedFallbackRef.current = false;
      setShowPlayFallback(false);
      scheduleTrackRefresh();
    };
    const onNextTrack = () => {
      try {
        playerRef.current?.nextVideo();
      } catch {
        return;
      }

      mutedFallbackRef.current = false;
      setShowPlayFallback(false);
      scheduleTrackRefresh();
    };
    const onPlayIndex = (event: Event) => {
      const detail = (event as CustomEvent<{ index: number }>).detail;
      if (typeof detail?.index !== "number") return;
      try {
        playerRef.current?.playVideoAt(detail.index);
        playerRef.current?.unMute();
        playerRef.current?.setVolume(clampVolume(volumeRef.current));
      } catch {
        return;
      }
      mutedFallbackRef.current = false;
      pauseRequestedRef.current = false;
      setShowPlayFallback(false);
      scheduleTrackRefresh();
    };
    const onVolume = (event: Event) => {
      const detail = (event as CustomEvent<{ volume: number }>).detail;

      if (typeof detail?.volume !== "number") return;

      const nextVolume = clampVolume(detail.volume);
      volumeRef.current = nextVolume;

      try {
        if (nextVolume > 0) {
          mutedFallbackRef.current = false;
          playerRef.current?.unMute();
        }

        playerRef.current?.setVolume(nextVolume);
      } catch {
        return;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible" || !startedRef.current) return;

      syncEmbeddedFrame();
      syncTrackData();
    };

    window.addEventListener(MINIPLAYER_PAUSE_EVENT, onPause);
    window.addEventListener(MINIPLAYER_PLAY_EVENT, onPlay);
    window.addEventListener(MINIPLAYER_UNMUTE_EVENT, onUnmute);
    window.addEventListener(MINIPLAYER_PREV_EVENT, onPrevTrack);
    window.addEventListener(MINIPLAYER_NEXT_EVENT, onNextTrack);
    window.addEventListener(MINIPLAYER_VOLUME_EVENT, onVolume);
    window.addEventListener(MINIPLAYER_PLAY_INDEX_EVENT, onPlayIndex);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      window.clearInterval(playbackPoll);
      window.removeEventListener(MINIPLAYER_PAUSE_EVENT, onPause);
      window.removeEventListener(MINIPLAYER_PLAY_EVENT, onPlay);
      window.removeEventListener(MINIPLAYER_UNMUTE_EVENT, onUnmute);
      window.removeEventListener(MINIPLAYER_PREV_EVENT, onPrevTrack);
      window.removeEventListener(MINIPLAYER_NEXT_EVENT, onNextTrack);
      window.removeEventListener(MINIPLAYER_VOLUME_EVENT, onVolume);
      window.removeEventListener(MINIPLAYER_PLAY_INDEX_EVENT, onPlayIndex);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onVisibility);
      window.removeEventListener("focus", onVisibility);
      clearTrackRefreshTimeouts();
    };
  }, [
    clearTrackRefreshTimeouts,
    handleManualPlay,
    pauseCurrentTrack,
    resumeCurrentTrack,
    scheduleTrackRefresh,
    syncEmbeddedFrame,
    syncTrackData,
  ]);

  useEffect(() => {
    const update = () => {
      const small = window.innerWidth < 640;
      setSize({ width: small ? 120 : 200, height: small ? 68 : 113 });
    };

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed z-40 bottom-3 right-3 opacity-20 hover:opacity-100 transition-opacity duration-300" style={{ width: size.width }}>
      <div className="overflow-hidden rounded-xl border border-white/40 bg-white/20 shadow-sm backdrop-blur-sm">
        <div className="flex h-9 items-center justify-between px-2 text-[11px] font-medium text-white/70 max-sm:h-6 max-sm:text-[9px]">
          <span>🎵 Now Playing</span>
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="rounded p-1 text-white/70 hover:bg-white/20"
            aria-label={collapsed ? "Expand player" : "Minimize player"}
          >
            {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <div
          className="relative bg-transparent"
          style={{
            height: collapsed ? 0 : size.height,
            transition: "height 200ms ease",
            overflow: "hidden",
          }}
        >
          <div id={PLAYER_ELEMENT_ID} ref={playerHostRef} className="h-full w-full" />

          {showPlayFallback && !collapsed ? (
            <button
              type="button"
              onClick={handleManualPlay}
              className="absolute inset-0 flex items-center justify-center gap-1 bg-amber-300/95 text-[10px] font-semibold text-black sm:text-xs"
            >
              <Volume2 size={14} /> Tap for Music
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
