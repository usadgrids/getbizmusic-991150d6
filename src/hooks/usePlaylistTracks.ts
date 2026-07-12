import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MINIPLAYER_PLAYLIST_EVENT,
  type MiniPlayerMood,
  type MiniPlayerPlaylist,
} from "@/components/biz/MiniPlayer";
import { onMiniPlayerEvent } from "@/hooks/useMiniPlayerController";
import { getYouTubePlaylistTracks } from "@/lib/playlists.functions";

export type PlaylistTrack = { videoId: string; title: string };

export function usePlaylistTracks(preferredMood?: MiniPlayerMood) {
  const fetchPlaylistTracks = useServerFn(getYouTubePlaylistTracks);
  const [playlists, setPlaylists] = useState<Partial<Record<MiniPlayerMood, string[]>>>({});
  const [currentMood, setCurrentMood] = useState<MiniPlayerMood>(preferredMood ?? "secular");

  useEffect(() => {
    return onMiniPlayerEvent<MiniPlayerPlaylist>(MINIPLAYER_PLAYLIST_EVENT, (detail) => {
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
    });
  }, []);

  const mood = preferredMood ?? currentMood;
  const videoIds = playlists[mood] ?? [];

  const playlistQuery = useQuery({
    queryKey: ["yt-playlist-feed", mood],
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    queryFn: () => fetchPlaylistTracks({ data: { mood } }),
  });

  const tracks: PlaylistTrack[] =
    playlistQuery.data ?? videoIds.map((id) => ({ videoId: id, title: "Loading…" }));

  return {
    tracks,
    isLoading: playlistQuery.isLoading && tracks.length === 0,
  };
}
