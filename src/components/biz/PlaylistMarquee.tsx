import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { useMiniPlayerController } from "@/hooks/useMiniPlayerController";

// Seconds to traverse one full "row" of the duplicated track at each speed.
const NORMAL_SECONDS = 200;
const FAST_SECONDS = 60;

export function PlaylistMarquee() {
  const { tracks, isLoading } = usePlaylistTracks();
  const player = useMiniPlayerController();
  const [currentTitle, setCurrentTitle] = useState<string>("");

  const trackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live-mutable state for the rAF loop — refs so they don't trigger re-renders.
  const offsetRef = useRef(0);
  const halfWidthRef = useRef(0);
  const speedRef = useRef<"normal" | "fast">("normal");
  const directionRef = useRef<1 | -1>(1); // 1 = scroll left (normal), -1 = reverse
  const draggingRef = useRef(false);
  const burstUntilRef = useRef(0);

  // Pointer drag tracking
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const dragMovedRef = useRef(false);
  const dragPointerIdRef = useRef<number | null>(null);
  // Track that was directly under the finger when the touch began. On touch
  // devices the marquee keeps moving between pointerdown and the synthesized
  // click, so the click can land on a different song than the one tapped.
  const pendingTrackRef = useRef<{ index: number; videoId: string } | null>(null);
  const suppressClickRef = useRef(false);


  useEffect(() => {
    setCurrentTitle(player.track?.title ?? "");
  }, [player.track]);

  // Measure half-width whenever the track content changes.
  useEffect(() => {
    const measure = () => {
      const el = trackRef.current;
      if (!el) return;
      halfWidthRef.current = el.scrollWidth / 2;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [tracks.length]);

  // rAF-driven marquee. Continues to run when arrows/burst change speed,
  // and pauses when user is dragging.
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const el = trackRef.current;
      const half = halfWidthRef.current;
      if (el && half > 0 && !draggingRef.current) {
        // End of burst timer?
        if (burstUntilRef.current && now > burstUntilRef.current) {
          burstUntilRef.current = 0;
          speedRef.current = "normal";
          directionRef.current = 1;
        }
        const seconds = speedRef.current === "fast" ? FAST_SECONDS : NORMAL_SECONDS;
        const pxPerSec = half / seconds;
        offsetRef.current -= pxPerSec * dt * directionRef.current;
        // Wrap
        if (offsetRef.current <= -half) offsetRef.current += half;
        if (offsetRef.current > 0) offsetRef.current -= half;
        el.style.transform = `translate3d(${offsetRef.current}px,0,0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (isLoading || tracks.length === 0) {
    return <div className="mt-1 h-7 w-full rounded-full bg-white/40 animate-pulse" />;
  }

  const handleTrackClick = (index: number, videoId: string) => {
    // Suppress click that ended a drag, or a click already handled on touch-up.
    if (dragMovedRef.current || suppressClickRef.current) return;
    player.playIndex(index, videoId);
  };



  const burst = (dir: 1 | -1) => {
    speedRef.current = "fast";
    directionRef.current = dir;
    burstUntilRef.current = performance.now() + 900;
  };

  const holdStart = (dir: 1 | -1) => () => {
    speedRef.current = "fast";
    directionRef.current = dir;
    burstUntilRef.current = 0;
  };
  const holdEnd = () => {
    speedRef.current = "normal";
    directionRef.current = 1;
    burstUntilRef.current = 0;
  };

  // Touch/pointer drag on the container to swipe through songs.
  const onPointerDown = (e: React.PointerEvent) => {
    // Only handle primary touch/mouse; ignore if starting on an arrow button.
    const target = e.target as HTMLElement;
    if (target.closest("[data-marquee-arrow]")) return;
    // Only enable drag-swipe for touch/pen. On mouse, let clicks pass through
    // normally so desktop users can click a track to play it.
    if (e.pointerType === "mouse") return;
    draggingRef.current = true;
    dragMovedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    dragPointerIdRef.current = e.pointerId;
    // Remember the exact chip under the finger at touch-down.
    const chip = target.closest<HTMLElement>("[data-track-id]");
    pendingTrackRef.current = chip
      ? { index: Number(chip.dataset.trackIndex ?? "0"), videoId: chip.dataset.trackId ?? "" }
      : null;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 4) dragMovedRef.current = true;
    const el = trackRef.current;
    const half = halfWidthRef.current;
    if (!el || half === 0) return;
    let next = dragStartOffsetRef.current + dx;
    // Keep within one repeating cycle for stable wrap on release.
    while (next <= -half) next += half;
    while (next > 0) next -= half;
    offsetRef.current = next;
    el.style.transform = `translate3d(${next}px,0,0)`;
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragPointerIdRef.current !== null) {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(dragPointerIdRef.current);
      dragPointerIdRef.current = null;
    }
    const tapped = pendingTrackRef.current;
    pendingTrackRef.current = null;
    // A tap (no movement) plays the chip captured at touch-down, not whatever
    // scrolled under the finger by the time the click fires.
    if (!dragMovedRef.current && tapped?.videoId) {
      suppressClickRef.current = true;
      player.playIndex(tapped.index, tapped.videoId);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 400);
    }
    // Reset a moved-drag flag shortly after so the synthesized click is swallowed.
    if (dragMovedRef.current) {
      window.setTimeout(() => {
        dragMovedRef.current = false;
      }, 50);
    }
  };


  const arrowBtn = (side: "left" | "right") => {
    const dir: 1 | -1 = side === "left" ? -1 : 1;
    const Icon = side === "left" ? ChevronLeft : ChevronRight;
    return (
      <button
        type="button"
        data-marquee-arrow
        aria-label={side === "left" ? "Scroll playlist left" : "Scroll playlist right"}
        onClick={() => burst(dir)}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          holdStart(dir)();
        }}
        onPointerUp={(e) => {
          (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
          holdEnd();
        }}
        onPointerCancel={holdEnd}
        onPointerLeave={(e) => {
          if (e.buttons) holdEnd();
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
          data-track-id={t.videoId}
          data-track-index={i}
          onClick={() => handleTrackClick(i, t.videoId)}

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
    <div
      ref={containerRef}
      className="marquee-container relative mt-1 w-full max-w-full overflow-hidden rounded-full bg-[#0F2A4A]/10 py-1 pl-7 pr-7 border border-[#0F2A4A]/15 min-w-0 touch-pan-y select-none"
      style={{ contain: "layout paint" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {arrowBtn("left")}
      <div ref={trackRef} className="flex w-max gap-2 px-2 min-w-0" style={{ willChange: "transform" }}>
        {renderRow("a")}
        {renderRow("b")}
      </div>
      {arrowBtn("right")}
    </div>
  );
}
