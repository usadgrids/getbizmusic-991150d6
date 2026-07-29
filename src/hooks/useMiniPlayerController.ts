import { useEffect, useState } from "react";
import {
  MINIPLAYER_ACTIVITY_EVENT,
  MINIPLAYER_NEXT_EVENT,
  MINIPLAYER_PAUSE_EVENT,
  MINIPLAYER_PLAY_EVENT,
  MINIPLAYER_PLAY_INDEX_EVENT,
  MINIPLAYER_PREV_EVENT,
  MINIPLAYER_TRACK_EVENT,
  type MiniPlayerActivity,
  type MiniPlayerTrack,
} from "@/components/biz/MiniPlayer";

/**
 * Typed dispatch helper for mini-player custom events. Silently no-ops if
 * `window.dispatchEvent` throws (e.g. during SSR or in stripped environments).
 */
export function emit<T = unknown>(event: string, detail?: T) {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      detail === undefined
        ? new CustomEvent(event)
        : new CustomEvent<T>(event, { detail }),
    );
  } catch {
    /* noop */
  }
}

/** Small typed listener helper — auto-casts CustomEvent detail. */
export function onMiniPlayerEvent<T>(event: string, handler: (detail: T | undefined) => void) {
  const wrapped = (e: Event) => handler((e as CustomEvent<T>).detail);
  window.addEventListener(event, wrapped);
  return () => window.removeEventListener(event, wrapped);
}

export interface MiniPlayerController {
  /** True when the mini-player is currently playing. */
  playing: boolean;
  /** Latest track reported by the mini-player. */
  track: MiniPlayerTrack | null;
  /** Play a specific playlist entry (videoId preferred over index). */
  playIndex: (index: number, videoId?: string) => void;


  /** Pause the mini-player. */
  pause: () => void;
  /** Resume the current mini-player track. */
  resume: () => void;
  /** Advance to the next track. */
  next: () => void;
  /** Rewind to the previous track. */
  prev: () => void;
}

/**
 * Central mini-player controller. Wraps the window-event API so components
 * don't repeat try/catch + CustomEvent boilerplate, and exposes reactive
 * `playing` / `track` state derived from mini-player events.
 */
export function useMiniPlayerController(): MiniPlayerController {
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<MiniPlayerTrack | null>(null);

  useEffect(() => {
    const offActivity = onMiniPlayerEvent<MiniPlayerActivity>(
      MINIPLAYER_ACTIVITY_EVENT,
      (detail) => {
        if (!detail) return;
        setPlaying(Boolean(detail.playing));
      },
    );
    const offTrack = onMiniPlayerEvent<MiniPlayerTrack>(MINIPLAYER_TRACK_EVENT, (detail) => {
      if (!detail) return;
      setTrack(detail);
    });
    return () => {
      offActivity();
      offTrack();
    };
  }, []);

  return {
    playing,
    track,
    playIndex: (index, videoId) =>
      emit<{ index: number; videoId?: string }>(MINIPLAYER_PLAY_INDEX_EVENT, {
        index,
        videoId,
      }),

    pause: () => emit(MINIPLAYER_PAUSE_EVENT),
    resume: () => emit(MINIPLAYER_PLAY_EVENT),
    next: () => emit(MINIPLAYER_NEXT_EVENT),
    prev: () => emit(MINIPLAYER_PREV_EVENT),
  };
}
