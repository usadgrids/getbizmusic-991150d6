import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { getActiveAds } from "@/lib/ads.functions";
import { getCityBySlug } from "@/lib/cities.functions";
import { BizHero } from "@/components/biz/BizHero";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { CityPickerButton } from "@/components/biz/CityPickerModal";
import { z } from "zod";
import { CategoryHubPage } from "@/components/biz/CategoryHubPage";
import { listDirectoryPlaces } from "@/lib/directory.functions";
import { getAdsByCategory } from "@/lib/ads.functions";
import {
  DIRECTORY_CATEGORIES,
  isDirectoryCategory,
  type DirectoryCategory,
} from "@/lib/directory-categories";


export const Route = createFileRoute("/$city/")({
  validateSearch: z.object({ code: z.string().optional() }),
  loader: async ({ params, context }) => {
    // Master template branch: Knowledge Graph category hub (/food, /beauty, …).
    if (isDirectoryCategory(params.city)) {
      const category = params.city as DirectoryCategory;
      const config = DIRECTORY_CATEGORIES[category];
      await context.queryClient.ensureQueryData({
        queryKey: ["directory-places", category],
        queryFn: () => listDirectoryPlaces({ data: { category } }),
      });
      await context.queryClient.ensureQueryData({
        queryKey: ["category-ads", category],
        queryFn: () =>
          getAdsByCategory({ data: { industries: config.industries, seed_key: category } }),
      });
      return { city: null, category };
    }

    const city = await getCityBySlug({ data: { slug: params.city } });
    if (!city || !city.is_active) {
      throw new Error("City not found");
    }
    await context.queryClient.ensureQueryData({
      queryKey: ["active-ads", params.city],
      queryFn: () => getActiveAds({ data: { city_slug: params.city } }),
    });
    return { city, category: null };
  },
  head: ({ loaderData, params }) => {
    const url = `https://getbizmusic.com/${params.city}`;
    const category = loaderData?.category;
    if (category) {
      const config = DIRECTORY_CATEGORIES[category];
      return {
        meta: [
          { title: config.seoTitle },
          { name: "description", content: config.seoDescription },
          { property: "og:title", content: config.seoTitle },
          { property: "og:description", content: config.seoDescription },
          { property: "og:url", content: url },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const city = loaderData?.city;
    const label = city ? `${city.name}, ${city.state}` : "";
    const title = city
      ? `Get Biz Music - ${label} — $12/yr Intro Offer`
      : "Get Biz Music — $12/yr Intro Offer";
    const description = city
      ? `Advertise your ${label} business — restaurants, lawyers, salons, auto, and more. Limited-time intro: $12/year (about $1/month) for a full year of exposure.`
      : "Local business advertising with music streaming — $12/year intro offer.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CitySegmentPage,
});

/** One entry point for both city pages and Knowledge Graph category hubs. */
function CitySegmentPage() {
  const { category } = Route.useLoaderData();
  const search = Route.useSearch();
  if (category) return <CategoryHubPage category={category} initialCode={search.code} />;
  return <CityHome />;
}

function CityHome() {
  const { city } = Route.useLoaderData();
  if (!city) return null;
  const { city: citySlug } = Route.useParams();
  const fetchAds = useServerFn(getActiveAds);
  const { data: ads = [] } = useSuspenseQuery({
    queryKey: ["active-ads", citySlug],
    queryFn: () => fetchAds({ data: { city_slug: citySlug } }),
  });

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">
      <BizHero cityName={city.name} state={city.state} />
      <main className="w-full max-w-[1800px] mx-auto px-2 sm:px-4 pb-20 sm:pb-16 min-w-0">
        <AdSlider
          ads={ads}
          title={`Featured ${city.name} Business of the Moment`}
          featured
        />
        <div
          className="mx-auto w-full"
          style={{ maxWidth: "min(100%, 1400px, calc(90svh * 4 / 3))" }}
        >
          <section className="mt-6 sm:mt-8 rounded-2xl bg-gradient-to-br from-[#0F2A4A] via-[#153a66] to-[#0F2A4A] px-5 py-6 sm:px-8 sm:py-8 text-center text-white shadow-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#F4C430] mb-3">
              <Sparkles size={14} />
              {city.name} Business Spotlight
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Submit Your Business Novelty Ad
            </h2>
            <p className="text-sm text-white/80 max-w-2xl mx-auto mb-4">
              Get your {city.name} business featured in the rotation above and reach local
              listeners for just $12/year. Limited-time intro offer.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-6 py-2.5 text-sm font-bold text-[#0F2A4A] transition-transform hover:scale-105 hover:bg-[#e0b566] shadow-sm"
              >
                Submit Your Ad
                <Sparkles size={14} />
              </Link>
              <CityPickerButton
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/40 px-6 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105 hover:bg-white/10 hover:border-white/60 shadow-sm"
              />

            </div>
          </section>
        </div>
      </main>
      <BizFooter />
    </div>
  );
}
