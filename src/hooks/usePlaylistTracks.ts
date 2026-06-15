import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MINIPLAYER_PLAYLIST_EVENT } from "@/components/biz/MiniPlayer";

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

export function usePlaylistTracks() {
  const [videoIds, setVideoIds] = useState<string[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ videoIds: string[] }>).detail;
      if (!Array.isArray(detail?.videoIds) || detail.videoIds.length === 0) return;
      setVideoIds((prev) =>
        prev.length === detail.videoIds.length && prev.every((id, i) => id === detail.videoIds[i])
          ? prev
          : detail.videoIds,
      );
    };
    window.addEventListener(MINIPLAYER_PLAYLIST_EVENT, handler);
    return () => window.removeEventListener(MINIPLAYER_PLAYLIST_EVENT, handler);
  }, []);

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