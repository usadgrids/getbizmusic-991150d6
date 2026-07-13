import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MINIPLAYER_PLAYLIST_EVENT,
  type MiniPlayerPlaylist,
} from "@/components/biz/MiniPlayer";
import { onMiniPlayerEvent } from "@/hooks/useMiniPlayerController";
import { getYouTubePlaylistTracks } from "@/lib/playlists.functions";

export type PlaylistTrack = { videoId: string; title: string };

export function usePlaylistTracks() {
  const fetchPlaylistTracks = useServerFn(getYouTubePlaylistTracks);
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

  const playlistQuery = useQuery({
    queryKey: ["yt-playlist-feed"],
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    queryFn: () => fetchPlaylistTracks(),
  });

  const tracks: PlaylistTrack[] =
    playlistQuery.data ?? videoIds.map((id) => ({ videoId: id, title: "Loading…" }));

  return {
    tracks,
    isLoading: playlistQuery.isLoading && tracks.length === 0,
  };
}
