import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { useMiniPlayerController } from "@/hooks/useMiniPlayerController";

const NORMAL_DURATION = "200s";
const FAST_DURATION = "60s";

export function PlaylistMarquee() {
  const { tracks, isLoading } = usePlaylistTracks();
  const player = useMiniPlayerController();
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const trackRef = useRef<HTMLDivElement | null>(null);
  const releaseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentTitle(player.track?.title ?? "");
  }, [player.track]);

  useEffect(() => {
    return () => {
      if (releaseTimerRef.current) window.clearTimeout(releaseTimerRef.current);
    };
  }, []);

  if (isLoading || tracks.length === 0) {
    return <div className="mt-1 h-7 w-full rounded-full bg-white/40 animate-pulse" />;
  }

  const handleClick = (index: number) => {
    player.playIndex(index);
  };

  const applySpeed = (direction: "forward" | "reverse" | null) => {
    const el = trackRef.current;
    if (!el) return;
    if (releaseTimerRef.current) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    if (direction === null) {
      el.style.animationDuration = NORMAL_DURATION;
      el.style.animationDirection = "normal";
      el.style.animationPlayState = "";
      return;
    }
    el.style.animationDuration = FAST_DURATION;
    el.style.animationDirection = direction === "reverse" ? "reverse" : "normal";
    el.style.animationPlayState = "running";
  };

  const burst = (direction: "forward" | "reverse") => {
    applySpeed(direction);
    releaseTimerRef.current = window.setTimeout(() => applySpeed(null), 900);
  };

  const holdStart = (direction: "forward" | "reverse") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    applySpeed(direction);
  };
  const holdEnd = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    applySpeed(null);
  };

  const arrowBtn = (side: "left" | "right") => {
    const direction = side === "left" ? "reverse" : "forward";
    const Icon = side === "left" ? ChevronLeft : ChevronRight;
    return (
      <button
        type="button"
        aria-label={side === "left" ? "Scroll playlist left" : "Scroll playlist right"}
        onClick={() => burst(direction)}
        onPointerDown={holdStart(direction)}
        onPointerUp={holdEnd}
        onPointerCancel={holdEnd}
        onPointerLeave={(e) => {
          if (e.buttons) applySpeed(null);
        }}
        className={`absolute top-1/2 -translate-y-1/2 ${
          side === "left" ? "left-0.5" : "right-0.5"
        } z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#0F2A4A] text-white shadow-sm hover:bg-[#153a66] active:scale-95 transition`}
      >
        <Icon size={14} />
      </button>
    );
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
    <div className="marquee-container relative mt-1 w-full max-w-full overflow-hidden rounded-full bg-[#0F2A4A]/10 py-1 pl-7 pr-7 border border-[#0F2A4A]/15 min-w-0" style={{ contain: "layout paint" }}>
      {arrowBtn("left")}
      <div ref={trackRef} className="marquee-track flex w-max gap-2 px-2 min-w-0">
        {renderRow("a")}
        {renderRow("b")}
      </div>
      {arrowBtn("right")}
    </div>
  );
}
