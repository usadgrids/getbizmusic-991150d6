import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdsByCategory } from "@/lib/ads.functions";
import {
  DIRECTORY_CATEGORY_SLUGS,
  DIRECTORY_CATEGORIES,
} from "@/lib/directory-categories";
import { DIRECTORY_CATEGORY_UI } from "@/lib/directory-category-ui";

type Ad = { id: string; image_url?: string };

const ALL_INDUSTRIES = DIRECTORY_CATEGORY_SLUGS.flatMap(
  (s) => DIRECTORY_CATEGORIES[s].industries,
);

/** Max tiles per strip — keeps the DOM light and the crawl smooth. */
const MAX_TILES = 14;

/**
 * Horizontal "crawling" marquee of live + showcase ad graphics, mounted at the
 * bottom of the Find & Claim search form. Hovering an image raises a full-page
 * overlay showing that ad graphic large with an invitation to request a free
 * custom ad design; moving the pointer away dismisses the overlay and returns
 * focus to the Legal Business Name field.
 */
export function AdMarquee({
  disabled = false,
  onHoverDismiss,
}: {
  disabled?: boolean;
  onHoverDismiss?: () => void;
}) {
  const fetchAds = useServerFn(getAdsByCategory);
  const { data: ads = [] } = useQuery({
    queryKey: ["admarquee-ads"],
    queryFn: () =>
      fetchAds({
        data: { industries: ALL_INDUSTRIES, seed_key: "admarquee" },
      }),
    staleTime: 5 * 60 * 1000,
  });

  // Build the strip once per ad payload — re-shuffling on every render caused
  // the whole image list to remount and stutter.
  const strip = useMemo<Ad[]>(() => {
    const showcase = DIRECTORY_CATEGORY_SLUGS.flatMap(
      (s) => DIRECTORY_CATEGORY_UI[s].showcaseAds,
    );
    const pooled: Ad[] = [
      ...ads.map((a) => ({ id: a.id, image_url: a.image_url })),
      ...showcase.map((s) => ({ id: s.id, image_url: s.image_url })),
    ];

    const byImage = new Map<string, Ad>();
    for (const ad of pooled) {
      const url = ad.image_url ?? ad.id;
      if (url && !byImage.has(url)) byImage.set(url, ad);
    }
    const unique = Array.from(byImage.values());
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    const capped = unique.slice(0, MAX_TILES);
    // Duplicate once so the CSS marquee loops seamlessly.
    return [...capped, ...capped];
  }, [ads]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<Ad | null>(null);
  const hoveredRef = useRef<Ad | null>(null);
  hoveredRef.current = hovered;

  function dismiss() {
    if (!hoveredRef.current) return;
    hoveredRef.current = null;
    setHovered(null);
    onHoverDismiss?.();
  }

  // Safety net: the overlay must never get stuck. Any pointer movement outside
  // the marquee strip, a scroll, a tap, Escape, or a short idle timeout clears
  // it — even if the element's own mouseleave never fires.
  useEffect(() => {
    if (!hovered) return;
    const onMove = (e: PointerEvent | MouseEvent) => {
      const el = containerRef.current;
      if (!el) return dismiss();
      const t = e.target as Node | null;
      if (!t || !el.contains(t)) dismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    const idle = window.setTimeout(dismiss, 4000);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", dismiss, { passive: true });
    window.addEventListener("pointerdown", dismiss, { passive: true });
    window.addEventListener("blur", dismiss);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("blur", dismiss);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  // Clear immediately if the marquee becomes disabled (e.g. after a search).
  useEffect(() => {
    if (disabled && hoveredRef.current) {
      hoveredRef.current = null;
      setHovered(null);
    }
  }, [disabled]);

  if (!strip.length) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="admarquee-container relative mt-5 overflow-hidden rounded-xl border border-[#D4A24C]/30 bg-[#0F2A4A]/40"
        aria-label="Sample business ads"
        onMouseLeave={dismiss}
        onPointerLeave={dismiss}
      >
        <div className="admarquee-track flex w-max gap-2 px-2 py-2">
          {strip.map((ad, i) => (
            <div
              key={`${ad.id}-${i}`}
              onMouseEnter={() => {
                if (!disabled) setHovered(ad);
              }}
              className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md ring-1 ring-[#D4A24C]/30 sm:h-20 sm:w-36"
            >
              <img
                src={ad.image_url}
                alt="Sample business ad"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
        {/* Gold edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#0F2A4A] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0F2A4A] to-transparent" />
      </div>

      {/* Full-page hover overlay showing the hovered ad graphic */}
      {hovered && (
        <div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[#0F2A4A]/90 px-4"
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#D4A24C] bg-gradient-to-br from-[#16213e] via-[#0F2A4A] to-[#0a0e1a] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
            <div className="border-b border-[#D4A24C]/40 bg-[#0F2A4A] px-6 py-5 text-center">
              <p className="text-xl font-bold leading-snug text-[#D4A24C] sm:text-2xl">
                Sample Business Ads
              </p>
              <p className="mt-1 text-lg font-semibold text-white sm:text-xl">
                Request Your Free Custom Design Now!
              </p>
            </div>
            <img
              src={hovered.image_url}
              alt="Sample business ad"
              decoding="async"
              className="block max-h-[65vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
