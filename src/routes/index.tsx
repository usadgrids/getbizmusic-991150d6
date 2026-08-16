import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, UtensilsCrossed, Scissors } from "lucide-react";
import { BizFooter } from "@/components/biz/BizFooter";
import { BusinessClaimSearch } from "@/components/biz/BusinessClaimSearch";
import { getAdsByCategory } from "@/lib/ads.functions";
import {
  DIRECTORY_CATEGORIES,
  DIRECTORY_CATEGORY_SLUGS,
  type DirectoryCategory,
} from "@/lib/directory-categories";
import homeHero from "@/assets/SD-Business-3.png.asset.json";

const ALL_INDUSTRIES = DIRECTORY_CATEGORY_SLUGS.flatMap((s) => DIRECTORY_CATEGORIES[s].industries);

/** Decorative tiled mosaic of live advertiser graphics behind the claim panel. */
function AdTileBackground() {
  const fetchAds = useServerFn(getAdsByCategory);
  const { data: ads = [] } = useQuery({
    queryKey: ["home-tile-ads"],
    queryFn: () => fetchAds({ data: { industries: ALL_INDUSTRIES, seed_key: "home-tiles" } }),
    staleTime: 5 * 60 * 1000,
  });

  if (!ads.length) return null;
  const tiles = Array.from({ length: 24 }, (_, i) => ads[i % ads.length]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="grid h-full w-full grid-cols-3 gap-1 opacity-[0.18] sm:grid-cols-4 lg:grid-cols-6">
        {tiles.map((ad, i) => (
          <img
            key={`${ad.id}-${i}`}
            src={ad.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F2A4A] via-[#0F2A4A]/80 to-[#0F2A4A]" />
    </div>
  );
}

const OG_IMAGE_URL =
  "https://www.getbizmusic.com/__l5e/assets-v1/74f08fd4-9ee2-41dc-b8b1-fbc723051789/getbizmusic-og-image.png";

const CATEGORY_TABS: { slug: DirectoryCategory; label: string; icon: typeof UtensilsCrossed }[] = [
  { slug: "food", label: "Food & Dining", icon: UtensilsCrossed },
  { slug: "beauty", label: "Beauty & Grooming", icon: Scissors },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Get Biz Music — Find & Claim Your San Diego County Business" },
      {
        name: "description",
        content:
          "Is your San Diego County business visible on ChatGPT and AI search engines? Find and claim your business listing — get a free AI Visibility Audit and a free professional ad design.",
      },
      { property: "og:title", content: "Get Biz Music — Find & Claim Your San Diego County Business" },
      {
        property: "og:description",
        content:
          "Is your San Diego County business visible on ChatGPT and AI search engines? Find and claim your listing — free AI Visibility Audit and ad design.",
      },
      { property: "og:url", content: "https://getbizmusic.com/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:image:width", content: "1254" },
      { property: "og:image:height", content: "1254" },
      { property: "og:image:alt", content: "Is your San Diego County business visible on ChatGPT? — GetBizMusic.com" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [{ rel: "canonical", href: "https://getbizmusic.com/" }],
  }),
  component: Index,
});

function Index() {
  const [category, setCategory] = useState<DirectoryCategory>("food");

  return (
    <div className="flex min-h-screen flex-col bg-[#0F2A4A] text-white overflow-x-clip">
      {/* Brand anchor — visible, not a clickable nav item */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-3 text-[#D4A24C]">
        <Building2 size={20} className="text-[#D4A24C]" aria-hidden />
        <span className="font-['Sora'] text-sm font-bold tracking-[0.25em] uppercase">
          Get Biz Music
        </span>
      </div>

      {/* Hero header image */}
      <header className="relative overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-2 sm:px-4">
          <img
            src={homeHero.url}
            alt="Is your San Diego County business visible on ChatGPT and other AI search engines? GetBizMusic.com"
            className="block w-full h-auto rounded-xl"
          />
        </div>
      </header>

      {/* Centerpiece: the Find & Claim Your Business panel */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-3xl">
          {/* Premium panel wrapping the reused widget */}
          <div className="relative overflow-hidden rounded-3xl border border-[#D4A24C]/40 bg-gradient-to-br from-[#16213e] via-[#0F2A4A] to-[#0a0e1a] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:p-8">
            {/* Thin gold accent line at top */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4A24C] to-transparent" />

            {/* Section label */}
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A24C]">
              Get Listed — San Diego County
            </p>

            {/* Category toggle — routes the reused widget to the right claim options */}
            <div className="mt-4 flex justify-center">
              <div
                role="tablist"
                aria-label="Choose your business category"
                className="inline-flex rounded-full border border-[#D4A24C]/40 bg-[#0a0e1a]/60 p-1"
              >
                {CATEGORY_TABS.map(({ slug, label, icon: Icon }) => {
                  const active = category === slug;
                  return (
                    <button
                      key={slug}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setCategory(slug)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors sm:px-6 sm:text-sm ${
                        active
                          ? "bg-[#D4A24C] text-[#0F2A4A] shadow"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      <Icon size={15} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* The reused Find & Claim widget — not rebuilt, just mounted */}
            <div key={category} className="mt-2 [&>section]:mt-0 [&>section]:shadow-none">
              <BusinessClaimSearch category={category} />
            </div>
          </div>
        </div>
      </main>

      <BizFooter />
    </div>
  );
}
