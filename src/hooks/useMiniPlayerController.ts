import { useEffect, useState } from "react";
import {
  MINIPLAYER_ACTIVITY_EVENT,
  MINIPLAYER_NEXT_EVENT,
  MINIPLAYER_PAUSE_EVENT,
  MINIPLAYER_PLAY_EVENT,
  MINIPLAYER_PLAY_INDEX_EVENT,
  MINIPLAYER_PLAY_MOOD_EVENT,
  MINIPLAYER_PREV_EVENT,
  MINIPLAYER_SET_PLAYLIST_EVENT,
  MINIPLAYER_TRACK_EVENT,
  type MiniPlayerActivity,
  type MiniPlayerMood,
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
  /** Mood currently loaded in the mini-player. */
  activeMood: MiniPlayerMood;
  /** Latest track reported by the mini-player. */
  track: MiniPlayerTrack | null;
  /** Play a mood-specific playlist (loads + starts in one atomic action). */
  playMood: (mood: MiniPlayerMood, index?: number) => void;
  /** Play a specific index — optionally in a specific mood. */
  playIndex: (index: number, mood?: MiniPlayerMood) => void;
  /** Pause the mini-player. */
  pause: () => void;
  /** Resume the current mini-player track (no mood switch). */
  resume: () => void;
  /** Advance to the next track. */
  next: () => void;
  /** Rewind to the previous track. */
  prev: () => void;
  /** Load a playlist without necessarily starting it (used for priming). */
  setPlaylist: (mood: MiniPlayerMood, force?: boolean) => void;
}

/**
 * Central mini-player controller. Wraps the window-event API so components
 * don't repeat try/catch + CustomEvent boilerplate, and exposes reactive
 * `playing` / `activeMood` / `track` state derived from mini-player events.
 *
 * Pass `filterMood` to only surface activity/track updates that belong to a
 * specific mood (used by ChristianMusicPanel to ignore secular events).
 */
export function useMiniPlayerController(filterMood?: MiniPlayerMood): MiniPlayerController {
  const [playing, setPlaying] = useState(false);
  const [activeMood, setActiveMood] = useState<MiniPlayerMood>(filterMood ?? "secular");
  const [track, setTrack] = useState<MiniPlayerTrack | null>(null);

  useEffect(() => {
    const offActivity = onMiniPlayerEvent<MiniPlayerActivity>(
      MINIPLAYER_ACTIVITY_EVENT,
      (detail) => {
        if (!detail) return;
        if (detail.mood === "secular" || detail.mood === "religious") {
          setActiveMood(detail.mood);
        }
        if (filterMood && detail.mood !== filterMood) {
          setPlaying(false);
          return;
        }
        setPlaying(Boolean(detail.playing));
      },
    );
    const offTrack = onMiniPlayerEvent<MiniPlayerTrack>(MINIPLAYER_TRACK_EVENT, (detail) => {
      if (!detail) return;
      if (detail.mood === "secular" || detail.mood === "religious") {
        setActiveMood(detail.mood);
      }
      if (filterMood && detail.mood !== filterMood) return;
      setTrack(detail);
    });
    const offSet = onMiniPlayerEvent<{ mood: MiniPlayerMood }>(
      MINIPLAYER_SET_PLAYLIST_EVENT,
      (detail) => {
        if (detail?.mood === "secular" || detail?.mood === "religious") {
          setActiveMood(detail.mood);
        }
      },
    );
    return () => {
      offActivity();
      offTrack();
      offSet();
    };
  }, [filterMood]);

  return {
    playing,
    activeMood,
    track,
    playMood: (mood, index) =>
      emit<{ mood: MiniPlayerMood; index?: number }>(MINIPLAYER_PLAY_MOOD_EVENT, { mood, index }),
    playIndex: (index, mood) =>
      emit<{ index: number; mood?: MiniPlayerMood }>(MINIPLAYER_PLAY_INDEX_EVENT, { index, mood }),
    pause: () => emit(MINIPLAYER_PAUSE_EVENT),
    resume: () => emit(MINIPLAYER_PLAY_EVENT),
    next: () => emit(MINIPLAYER_NEXT_EVENT),
    prev: () => emit(MINIPLAYER_PREV_EVENT),
    setPlaylist: (mood, force) =>
      emit<{ mood: MiniPlayerMood; force?: boolean }>(MINIPLAYER_SET_PLAYLIST_EVENT, {
        mood,
        force,
      }),
  };
}
