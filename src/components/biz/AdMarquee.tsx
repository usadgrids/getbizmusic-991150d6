import { useState } from "react";
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

/**
 * Horizontal "crawling" marquee of live + showcase ad graphics, mounted at the
 * bottom of the Find & Claim search form. Hovering an image raises a full-page
 * overlay inviting the visitor to request a free custom ad design; moving the
 * pointer away dismisses the overlay and returns focus to the search form.
 */
export function AdMarquee() {
  const fetchAds = useServerFn(getAdsByCategory);
  const { data: ads = [] } = useQuery({
    queryKey: ["admarquee-ads"],
    queryFn: () =>
      fetchAds({
        data: { industries: ALL_INDUSTRIES, seed_key: "admarquee" },
      }),
    staleTime: 5 * 60 * 1000,
  });

  const showcase = DIRECTORY_CATEGORY_SLUGS.flatMap(
    (s) => DIRECTORY_CATEGORY_UI[s].showcaseAds,
  );
  const pooled: Ad[] = [
    ...ads.map((a) => ({ id: a.id, image_url: a.image_url })),
    ...showcase.map((s) => ({ id: s.id, image_url: s.image_url })),
  ];

  // De-duplicate by image_url so the crawl shows many distinct ads.
  const byImage = new Map<string, Ad>();
  for (const ad of pooled) {
    const url = ad.image_url ?? ad.id;
    if (url && !byImage.has(url)) byImage.set(url, ad);
  }
  const unique = Array.from(byImage.values());

  // Fisher–Yates shuffle for variety.
  const shuffled = [...unique];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Duplicate the strip so the CSS marquee loops seamlessly.
  const strip = [...shuffled, ...shuffled];

  const [hovered, setHovered] = useState(false);

  if (!shuffled.length) return null;

  return (
    <>
      <div
        className="marquee-container relative mt-5 overflow-hidden rounded-xl border border-[#D4A24C]/30 bg-[#0F2A4A]/40"
        aria-label="Sample business ads"
      >
        <div className="marquee-track flex w-max gap-2 px-2 py-2">
          {strip.map((ad, i) => (
            <button
              key={`${ad.id}-${i}`}
              type="button"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocus={() => setHovered(true)}
              onBlur={() => setHovered(false)}
              className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md ring-1 ring-[#D4A24C]/30 transition hover:ring-2 hover:ring-[#D4A24C] sm:h-20 sm:w-36"
            >
              <img
                src={ad.image_url}
                alt="Sample business ad"
                loading="lazy"
                className="h-full w-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
        {/* Gold edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#0F2A4A] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0F2A4A] to-transparent" />
      </div>

      {/* Full-page hover overlay */}
      {hovered && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#0F2A4A]/85 px-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-md rounded-2xl border border-[#D4A24C] bg-gradient-to-br from-[#16213e] via-[#0F2A4A] to-[#0a0e1a] px-6 py-8 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
            <p className="text-xl font-bold leading-snug text-[#D4A24C] sm:text-2xl">
              Sample Business Ads
            </p>
            <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
              Request Your Free Custom Design Now!
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/60">
              Move your cursor away to return to the search form
            </p>
          </div>
        </div>
      )}
    </>
  );
}
