import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { useMiniPlayerController } from "@/hooks/useMiniPlayerController";
import type { MiniPlayerMood } from "./MiniPlayer";

export function PlaylistMarquee({ mood }: { mood?: MiniPlayerMood }) {
  const { tracks, isLoading } = usePlaylistTracks(mood);
  const player = useMiniPlayerController(mood);
  const [currentTitle, setCurrentTitle] = useState<string>("");

  useEffect(() => {
    setCurrentTitle(player.track?.title ?? "");
  }, [player.track]);

  if (isLoading || tracks.length === 0) {
    return <div className="mt-1 h-7 w-full rounded-full bg-white/40 animate-pulse" />;
  }

  const handleClick = (index: number) => {
    if (mood) {
      player.playMood(mood, index);
      return;
    }
    player.playIndex(index);
  };

  const renderRow = (keyPrefix: string) =>
    tracks.map((t, i) => {
      const isCurrent =
        currentTitle && t.title.trim().toLowerCase() === currentTitle.trim().toLowerCase();
      return (
        <button
          key={`${keyPrefix}-${t.videoId}-${i}`}
          type="button"
          onClick={() => handleClick(i)}
          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
            isCurrent
              ? "bg-[#0F2A4A] text-[#D4A24C]"
              : "bg-white/90 text-[#0F2A4A] hover:bg-white"
          }`}
          title={t.title}
        >
          <Play size={10} className="shrink-0" fill="currentColor" />
          <span className="max-w-[200px] truncate">{t.title}</span>
        </button>
      );
    });

  return (
    <div className="marquee-container mt-1 w-full max-w-full overflow-hidden rounded-full bg-[#0F2A4A]/10 py-1 border border-[#0F2A4A]/15 min-w-0" style={{ contain: "layout paint" }}>
      <div className="marquee-track flex w-max gap-2 px-2 min-w-0">
        {renderRow("a")}
        {renderRow("b")}
      </div>
    </div>
  );
}
