import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MINIPLAYER_PLAYLIST_EVENT,
  type MiniPlayerPlaylist,
} from "@/components/biz/MiniPlayer";
import { onMiniPlayerEvent } from "@/hooks/useMiniPlayerController";
import {
  getYouTubePlaylistTracks,
  getYouTubeVideoTitles,
} from "@/lib/playlists.functions";

export type PlaylistTrack = { videoId: string; title: string };

export function usePlaylistTracks() {
  const fetchPlaylistTracks = useServerFn(getYouTubePlaylistTracks);
  const fetchVideoTitles = useServerFn(getYouTubeVideoTitles);
  const [videoIds, setVideoIds] = useState<string[]>([]);

  useEffect(() => {
    return onMiniPlayerEvent<MiniPlayerPlaylist>(MINIPLAYER_PLAYLIST_EVENT, (detail) => {
      if (!Array.isArray(detail?.videoIds) || detail.videoIds.length === 0) return;
      setVideoIds((prev) => {
        if (
          prev.length === detail.videoIds.length &&
          prev.every((id, i) => id === detail.videoIds[i])
        ) {
          return prev;
        }
        return detail.videoIds;
      });
    });
  }, []);

  // Fast initial titles (~15 most recent) from the RSS feed.
  const feedQuery = useQuery({
    queryKey: ["yt-playlist-feed"],
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    queryFn: () => fetchPlaylistTracks(),
  });

  // Backfill: full title list for every ID reported by the YT player (oEmbed).
  const titlesQuery = useQuery({
    queryKey: ["yt-playlist-titles", videoIds],
    enabled: videoIds.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    queryFn: () => fetchVideoTitles({ data: { videoIds } }),
  });

  const tracks = useMemo<PlaylistTrack[]>(() => {
    const titleById = new Map<string, string>();
    for (const t of feedQuery.data ?? []) titleById.set(t.videoId, t.title);
    for (const t of titlesQuery.data ?? []) titleById.set(t.videoId, t.title);

    if (videoIds.length > 0) {
      return videoIds.map((id) => ({
        videoId: id,
        title: titleById.get(id) ?? "Loading…",
      }));
    }
    return feedQuery.data ?? [];
  }, [videoIds, feedQuery.data, titlesQuery.data]);

  return {
    tracks,
    isLoading: feedQuery.isLoading && tracks.length === 0,
  };
}
