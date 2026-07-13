import { createServerFn } from "@tanstack/react-start";

export type YouTubePlaylistTrack = { videoId: string; title: string };

const PLAYLIST_ID = "PLp93JI5bGWYnVI3YlstpndURt44OgrIKj";

export const getYouTubePlaylistTracks = createServerFn({ method: "GET" }).handler(
  async (): Promise<YouTubePlaylistTrack[]> => {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(PLAYLIST_ID)}`,
      {
        headers: {
          accept: "application/atom+xml, application/xml, text/xml",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Could not load YouTube playlist (${response.status})`);
    }

    const xml = await response.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
    return entries
      .map((entry) => {
        const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
        const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
        if (!id || !title) return null;
        return {
          videoId: id,
          title: title
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">"),
        };
      })
      .filter((track): track is YouTubePlaylistTrack => track !== null);
  },
);
