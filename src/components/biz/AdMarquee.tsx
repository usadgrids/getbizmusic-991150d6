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
 * overlay showing that ad graphic large with an invitation to request a free
 * custom ad design; moving the pointer away dismisses the overlay.
 */
export function AdMarquee({ disabled = false }: { disabled?: boolean }) {
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

  // Duplicate the strip so the CSS marquee loops seamlessly, then guarantee no
  // two neighbouring tiles (including across the loop seam) share an image.
  const strip: Ad[] = [];
  for (const ad of [...shuffled, ...shuffled]) {
    const prev = strip[strip.length - 1];
    if (prev && (prev.image_url ?? prev.id) === (ad.image_url ?? ad.id)) {
      // Swap with the following slot by deferring: push after next item.
      const swapWith = strip.pop()!;
      strip.push(ad, swapWith);
      continue;
    }
    strip.push(ad);
  }

  const [hovered, setHovered] = useState<Ad | null>(null);

  if (!shuffled.length) return null;

  return (
    <>
      <div
        className="admarquee-container relative mt-5 overflow-hidden rounded-xl border border-[#D4A24C]/30 bg-[#0F2A4A]/40"
        aria-label="Sample business ads"
        onMouseLeave={() => setHovered(null)}
      >
        <div className="admarquee-track flex w-max gap-2 px-2 py-2">
          {strip.map((ad, i) => (
            <div
              key={`${ad.id}-${i}`}
              onMouseEnter={() => setHovered(ad)}
              className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md ring-1 ring-[#D4A24C]/30 sm:h-20 sm:w-36"
            >
              <img
                src={ad.image_url}
                alt="Sample business ad"
                loading="lazy"
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
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[#0F2A4A]/85 px-4 backdrop-blur-sm"
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
              className="block max-h-[65vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
