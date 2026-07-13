import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
          title: decodeEntities(title),
        };
      })
      .filter((track): track is YouTubePlaylistTrack => track !== null);
  },
);

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Fetch titles for arbitrary video IDs via YouTube oEmbed (no API key).
 * Used to backfill titles for playlist entries beyond the RSS feed's ~15-item window.
 */
export const getYouTubeVideoTitles = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        videoIds: z.array(z.string().regex(/^[a-zA-Z0-9_-]{6,20}$/)).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<YouTubePlaylistTrack[]> => {
    const results = await Promise.all(
      data.videoIds.map(async (videoId) => {
        try {
          const res = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(
              `https://www.youtube.com/watch?v=${videoId}`,
            )}&format=json`,
            { headers: { accept: "application/json" } },
          );
          if (!res.ok) return { videoId, title: "" };
          const json = (await res.json()) as { title?: string };
          return { videoId, title: decodeEntities(json.title ?? "") };
        } catch {
          return { videoId, title: "" };
        }
      }),
    );
    return results.filter((r) => r.title.length > 0);
  });
