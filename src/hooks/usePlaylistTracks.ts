import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MINIPLAYER_PLAYLIST_EVENT,
  type MiniPlayerMood,
  type MiniPlayerPlaylist,
} from "@/components/biz/MiniPlayer";

export type PlaylistTrack = { videoId: string; title: string };

async function fetchTitle(videoId: string): Promise<PlaylistTrack> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!res.ok) return { videoId, title: "Untitled" };
    const json = (await res.json()) as { title?: string };
    return { videoId, title: json.title ?? "Untitled" };
  } catch {
    return { videoId, title: "Untitled" };
  }
}

export function usePlaylistTracks(preferredMood?: MiniPlayerMood) {
  const [playlists, setPlaylists] = useState<Partial<Record<MiniPlayerMood, string[]>>>({});
  const [currentMood, setCurrentMood] = useState<MiniPlayerMood>(preferredMood ?? "secular");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<MiniPlayerPlaylist>).detail;
      if (!Array.isArray(detail?.videoIds) || detail.videoIds.length === 0) return;
      const mood = detail.mood === "religious" ? "religious" : "secular";
      setCurrentMood(mood);
      setPlaylists((prev) => {
        const existing = prev[mood] ?? [];
        if (
          existing.length === detail.videoIds.length &&
          existing.every((id, i) => id === detail.videoIds[i])
        ) {
          return prev;
        }
        return { ...prev, [mood]: detail.videoIds };
      });
    };
    window.addEventListener(MINIPLAYER_PLAYLIST_EVENT, handler);
    return () => window.removeEventListener(MINIPLAYER_PLAYLIST_EVENT, handler);
  }, []);

  const videoIds = playlists[preferredMood ?? currentMood] ?? [];

  const query = useQuery({
    queryKey: ["yt-playlist-titles", videoIds.join(",")],
    enabled: videoIds.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    queryFn: async () => Promise.all(videoIds.map(fetchTitle)),
  });

  const tracks: PlaylistTrack[] =
    query.data ?? videoIds.map((id) => ({ videoId: id, title: "Loading…" }));

  return { tracks, isLoading: videoIds.length === 0 || query.isLoading };
}