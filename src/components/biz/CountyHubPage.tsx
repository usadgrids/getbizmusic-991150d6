import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2 } from "lucide-react";
import { getCountyAds } from "@/lib/ads.functions";
import { listAllDirectoryPlaces, listDirectoryTopics } from "@/lib/directory.functions";
import { BizHero } from "@/components/biz/BizHero";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { PageShareBar } from "@/components/biz/PageShareBar";
import { DirectoryList } from "@/components/biz/DirectoryList";
import { BusinessClaimSearch } from "@/components/biz/BusinessClaimSearch";
import { FloatingHomeButton, FloatingBackButton } from "@/components/biz/FloatingHomeButton";
import {
  
  DIRECTORY_CATEGORY_SLUGS,
  type DirectoryCategory,
} from "@/lib/directory-categories";
import { toUniversalCategory } from "@/lib/business-categories";

// Directory (Knowledge Graph) categories still drive the place list; ads are
// no longer limited to them — see getCountyAds.


function filterSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Unified San Diego County Knowledge Graph hub. Replaces the per-category
 * hubs (/food, /beauty), which now 301 here.
 */
export function CountyHubPage({ categoryFilter }: { categoryFilter?: string }) {
  const fetchPlaces = useServerFn(listAllDirectoryPlaces);
  const { data: placeData } = useSuspenseQuery({
    queryKey: ["directory-places", "all"],
    queryFn: () => fetchPlaces({}),
  });
  const places = placeData?.places ?? [];

  const fetchAds = useServerFn(getCountyAds);
  const { data: allAds = [] } = useSuspenseQuery({
    queryKey: ["county-ads", "sdcounty"],
    queryFn: () => fetchAds(),
  });

  const [active, setActive] = useState<string>(categoryFilter ?? "all");

  const withCategory = useMemo(
    () =>
      places.map((p) => ({
        place: p,
        universal: toUniversalCategory(p.category),
      })),
    [places],
  );

  // Ads carry their own business category (industry) — same universal taxonomy
  // used by claims, so activation-code ads filter/tag consistently here.
  const adsWithCategory = useMemo(
    () => allAds.map((ad) => ({ ad, universal: toUniversalCategory(ad.industry) })),
    [allAds],
  );

  const ads = useMemo(
    () =>
      active === "all"
        ? adsWithCategory.map((a) => a.ad)
        : adsWithCategory.filter((a) => filterSlug(a.universal) === active).map((a) => a.ad),
    [adsWithCategory, active],
  );

  const filters = useMemo(() => {
    const set = new Set([
      ...withCategory.map((p) => p.universal),
      ...adsWithCategory.map((a) => a.universal),
    ]);
    return Array.from(set).sort();
  }, [withCategory, adsWithCategory]);


  const visible = useMemo(
    () =>
      active === "all"
        ? withCategory.map((p) => p.place)
        : withCategory.filter((p) => filterSlug(p.universal) === active).map((p) => p.place),
    [withCategory, active],
  );

  return (
    <div className="min-h-screen bg-[#0F2A4A] text-white overflow-x-hidden">
      <BizHero cityName="San Diego County Business Directory" state="CA" hideImage />

      <main className="w-full max-w-[1800px] mx-auto px-2 sm:px-4 pb-20 sm:pb-16 min-w-0">
        <h1 className="sr-only">
          San Diego County business directory — verified listings on GetBizMusic
        </h1>

        {ads.length > 0 && (
          <AdSlider
            ads={ads}
            title="Featured San Diego County Business of the Moment"
            featured
            hideAdShareBar
            belowShareBar={
              <PageShareBar
                url="https://www.getbizmusic.com/sdcounty"
                title="San Diego County Business Directory"
                text="Verified San Diego County businesses, cited by AI answer engines."
                label="Share the San Diego County directory"
              />
            }
          />
        )}

        <BusinessClaimSearch />

        {places.length > 0 ? (
          <section className="mt-8 rounded-2xl bg-white text-[#0F2A4A]">
            {filters.length > 1 && (
              <div className="flex flex-wrap gap-2 px-4 pt-6">
                <button
                  type="button"
                  onClick={() => setActive("all")}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                    active === "all"
                      ? "bg-[#0F2A4A] text-white"
                      : "border border-gray-300 text-[#0F2A4A]"
                  }`}
                >
                  All businesses
                </button>
                {filters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActive(filterSlug(f))}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                      active === filterSlug(f)
                        ? "bg-[#0F2A4A] text-white"
                        : "border border-gray-300 text-[#0F2A4A]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
            <DirectoryList places={visible} />
          </section>
        ) : (
          <section className="mt-8 rounded-2xl bg-white px-5 py-10 text-center shadow-sm">
            <Building2 className="mx-auto mb-3 text-[#D4A24C]" size={28} />
            <h2 className="text-lg font-bold text-[#0F2A4A]">No published listings yet</h2>
            <p className="mt-2 text-sm text-gray-600">
              Claim your business above to be one of the first in the San Diego County Knowledge
              Graph.
            </p>
          </section>
        )}

        <TopicLinks />
      </main>

      <BizFooter />
      <FloatingHomeButton />
      <FloatingBackButton />
    </div>
  );
}

function TopicLinks() {
  const fetchTopics = useServerFn(listDirectoryTopics);
  const results = DIRECTORY_CATEGORY_SLUGS.map((slug) => slug as DirectoryCategory);
  const { data } = useSuspenseQuery({
    queryKey: ["directory-topics", "all"],
    queryFn: async () => {
      const all = await Promise.all(
        results.map((category) => fetchTopics({ data: { category } })),
      );
      return all.flatMap((r) => r?.topics ?? []);
    },
  });
  const topics = data ?? [];
  if (!topics.length) return null;

  return (
    <section
      aria-label="Popular questions"
      className="mx-auto mt-8 w-full max-w-3xl rounded-2xl bg-white px-5 py-6 shadow-sm sm:px-8"
    >
      <h2 className="text-lg font-bold text-[#0F2A4A]">
        Popular questions we answer about San Diego County businesses
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Verified answers built from real hours, services and pricing — the pages AI answer engines
        cite.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {topics.slice(0, 24).map((t) => (
          <li key={t.slug}>
            <Link
              to="/sdcounty/$slug"
              params={{ slug: t.slug }}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#0F2A4A] hover:border-[#D4A24C] hover:bg-[#fdf7ec]"
            >
              <span>{t.question}</span>
              <span className="shrink-0 text-xs text-gray-500">{t.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
