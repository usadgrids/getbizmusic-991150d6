import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

/** Extract the 11-char YouTube video id from any common URL shape. */
export function parseYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Bare id
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const kw = ["embed", "shorts", "live", "v"];
      for (let i = 0; i < parts.length - 1; i++) {
        if (kw.includes(parts[i]) && /^[a-zA-Z0-9_-]{11}$/.test(parts[i + 1])) {
          return parts[i + 1];
        }
      }
    }
  } catch {
    // fall through
  }
  return null;
}

interface Props {
  youtubeUrl: string | null | undefined;
  businessName: string;
  /** Optional: allow clicks to bubble through to a parent link when not playing. */
  children?: React.ReactNode;
}

/**
 * Overlays a muted, autoplaying YouTube iframe on top of children while the
 * user hovers (or focuses / taps). Mounts the iframe lazily so no request
 * is made until the user actually interacts. Restarts on each hover.
 */
export function YoutubeHoverOverlay({ youtubeUrl, businessName, children }: Props) {
  const videoId = parseYoutubeId(youtubeUrl);
  const [active, setActive] = useState(false);
  const [nonce, setNonce] = useState(0); // forces iframe remount to restart video
  const leaveTimerRef = useRef<number | null>(null);

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  useEffect(() => () => clearLeaveTimer(), []);

  const activate = () => {
    if (!videoId) return;
    clearLeaveTimer();
    setActive((prev) => {
      if (!prev) setNonce((n) => n + 1);
      return true;
    });
  };

  const deactivate = () => {
    // small delay so pointer flickers between children/iframe don't tear.
    clearLeaveTimer();
    leaveTimerRef.current = window.setTimeout(() => {
      setActive(false);
      leaveTimerRef.current = null;
    }, 120);
  };

  if (!videoId) return <>{children}</>;

  const src =
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    `?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${videoId}`;

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={activate}
      onMouseLeave={deactivate}
      onFocus={activate}
      onBlur={deactivate}
      onTouchStart={activate}
    >
      {children}

      {/* Subtle "hover to play" affordance — only when no video is showing yet */}
      {!active && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-white text-xs font-semibold shadow-lg backdrop-blur-sm">
          <Play size={12} fill="currentColor" />
          Hover to play video
        </div>
      )}

      {active && (
        <div
          key={nonce}
          className="absolute inset-0 z-20 bg-black"
          onClick={(e) => e.stopPropagation()}
        >
          <iframe
            src={src}
            title={`${businessName} video`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      )}
    </div>
  );
}
