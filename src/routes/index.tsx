import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdsByCategory } from "@/lib/ads.functions";
import { BizNavbar } from "@/components/biz/BizNavbar";
import { BizFooter } from "@/components/biz/BizFooter";
import { DIRECTORY_CATEGORIES } from "@/lib/directory-categories";
import { DIRECTORY_CATEGORY_UI } from "@/lib/directory-category-ui";

const OG_IMAGE_URL =
  "https://www.getbizmusic.com/__l5e/assets-v1/74f08fd4-9ee2-41dc-b8b1-fbc723051789/getbizmusic-og-image.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Get Biz Music — Browse Business Categories with Music Streaming" },
      {
        name: "description",
        content:
          "Browse Get Biz Music business categories — Food & Dining, Beauty & Grooming — with music streaming while you browse. Advertise your business from $12/year.",
      },
      { property: "og:title", content: "Get Biz Music — Browse Business Categories with Music Streaming" },
      {
        property: "og:description",
        content: "Browse Get Biz Music business categories — Food & Dining, Beauty & Grooming — with music streaming.",
      },
      { property: "og:url", content: "https://getbizmusic.com/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:image:width", content: "1254" },
      { property: "og:image:height", content: "1254" },
      { property: "og:image:alt", content: "Get Biz Music — Local B2B Business Network with Music Streaming" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [{ rel: "canonical", href: "https://getbizmusic.com/" }],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["home-category-ads", "food"],
        queryFn: () =>
          getAdsByCategory({
            data: { industries: DIRECTORY_CATEGORIES.food.industries, seed_key: "food" },
          }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["home-category-ads", "beauty"],
        queryFn: () =>
          getAdsByCategory({
            data: { industries: DIRECTORY_CATEGORIES.beauty.industries, seed_key: "beauty" },
          }),
      }),
    ]);
  },
  component: Index,
});

function Index() {
  const fetchFoodAds = useServerFn(getAdsByCategory);
  const fetchBeautyAds = useServerFn(getAdsByCategory);

  const { data: foodAds = [] } = useQuery({
    queryKey: ["home-category-ads", "food"],
    queryFn: () =>
      fetchFoodAds({ data: { industries: DIRECTORY_CATEGORIES.food.industries, seed_key: "food" } }),
  });
  const { data: beautyAds = [] } = useQuery({
    queryKey: ["home-category-ads", "beauty"],
    queryFn: () =>
      fetchBeautyAds({ data: { industries: DIRECTORY_CATEGORIES.beauty.industries, seed_key: "beauty" } }),
  });

  // Live ad thumbnails come from randomized, signed-URL data, so they can differ
  // between the server render and the first client render. Only add them after
  // hydration to keep the markup identical on both passes.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Build the marquee thumbnail pool: real category ads + showcase placeholders
  // so the strip is never empty even before advertisers sign up.
  const thumbnails: string[] = [
    ...DIRECTORY_CATEGORY_UI.food.showcaseAds.map((a) => a.image_url),
    ...DIRECTORY_CATEGORY_UI.beauty.showcaseAds.map((a) => a.image_url),
    ...(hydrated ? foodAds.map((a) => a.image_url) : []),
    ...(hydrated ? beautyAds.map((a) => a.image_url) : []),
  ].filter(Boolean);
  // Duplicate for a seamless loop.
  const marqueeTiles = thumbnails.length > 0 ? [...thumbnails, ...thumbnails] : [];

  const categories = [
    { slug: "food" as const, href: "/food", coming: false },
    { slug: "beauty" as const, href: "/beauty", coming: false },
  ];

  return (
    <div className="min-h-screen bg-[#0F2A4A] text-white font-['Manrope'] overflow-x-hidden">
      <BizNavbar />

      {/* Hero header */}
      <header className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C430] mb-5">
            <Sparkles size={14} />
            Business Directory + Music Streaming
          </div>
          <h1 className="font-['Sora'] text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Find Your <span className="text-[#F4C430]">Vibe</span>
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-base sm:text-lg text-white/75">
            Curated local business categories synced with the perfect soundtrack. Pick a category
            below and start exploring.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-7 py-3 text-sm font-bold text-[#0F2A4A] transition-transform hover:scale-105 hover:bg-[#F4C430] shadow-md"
            >
              Submit Your Ad
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/submit"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D4A24C] px-7 py-3 text-sm font-bold text-[#D4A24C] transition-colors hover:bg-[#D4A24C]/10"
            >
              Advertise
            </Link>
          </div>
        </div>
      </header>

      {/* Fast-sliding advertiser thumbnails */}
      {marqueeTiles.length > 0 && (
        <section aria-label="Live advertiser previews" className="relative w-full overflow-hidden py-5">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-20 bg-gradient-to-r from-[#0F2A4A] to-transparent sm:w-28" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-20 bg-gradient-to-l from-[#0F2A4A] to-transparent sm:w-28" />
          <div className="flex w-max gap-4 will-change-transform animate-[home-marquee_22s_linear_infinite] hover:[animation-play-state:paused]">
            {marqueeTiles.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl border border-[#D4A24C]/30 object-cover"
              />
            ))}
          </div>
        </section>
      )}

      {/* Category card grid */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
          {categories.map(({ slug, href }) => {
            const config = DIRECTORY_CATEGORIES[slug];
            const ui = DIRECTORY_CATEGORY_UI[slug];
            return (
              <a
                key={slug}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl border border-[#D4A24C]/20 transition-all hover:-translate-y-2 hover:border-[#F4C430]"
              >
                <img
                  src={ui.thumbnail}
                  alt={config.heroAlt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/45 transition-colors group-hover:bg-black/25" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F2A4A] via-[#0F2A4A]/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-7">
                  <h2 className="font-['Sora'] text-2xl sm:text-3xl font-bold mb-2">{config.title}</h2>
                  <p className="text-sm text-white/0 group-hover:text-white/80 transition-colors duration-300 flex items-center gap-1">
                    Explore category
                    <ArrowRight size={14} />
                  </p>
                </div>
              </a>
            );
          })}

          {/* More categories coming soon */}
          <div className="relative flex aspect-[4/5] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/15 bg-[#153a66]/40 p-8 text-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4A24C] animate-ping" />
            </div>
            <h3 className="font-['Sora'] text-xl font-semibold text-white/55">More Categories Coming Soon</h3>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/30">Expanding our network</p>
            <Link
              to="/pricing"
              className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-[#D4A24C]/40 px-5 py-2 text-xs font-semibold text-[#D4A24C] hover:bg-[#D4A24C]/10"
            >
              <Plus size={14} />
              Advertise with us
            </Link>
          </div>
        </div>
      </main>

      <BizFooter />

      <style>{`@keyframes home-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
