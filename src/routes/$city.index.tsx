import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveAds } from "@/lib/ads.functions";
import { getCityBySlug } from "@/lib/cities.functions";
import { BizNavbar } from "@/components/biz/BizNavbar";
import { BizHero } from "@/components/biz/BizHero";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { MiniPlayer } from "@/components/biz/MiniPlayer";

export const Route = createFileRoute("/$city/")({
  loader: async ({ params, context }) => {
    const city = await getCityBySlug({ data: { slug: params.city } });
    if (!city || !city.is_active) {
      throw new Error("City not found");
    }
    await context.queryClient.ensureQueryData({
      queryKey: ["active-ads", params.city],
      queryFn: () => getActiveAds({ data: { city_slug: params.city } }),
    });
    return { city };
  },
  head: ({ loaderData, params }) => {
    const city = loaderData?.city;
    const label = city ? `${city.name}, ${city.state}` : "";
    const title = city
      ? `Get Biz Music - ${label} — $12/yr Intro Offer`
      : "Get Biz Music — $12/yr Intro Offer";
    const description = city
      ? `Advertise your ${label} business — restaurants, lawyers, salons, auto, and more. Limited-time intro: $12/year (about $1/month) for a full year of exposure.`
      : "Local business advertising with music streaming — $12/year intro offer.";
    const url = `https://getbizmusic.com/${params.city}`;
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
  component: CityHome,
});

function CityHome() {
  const { city } = Route.useLoaderData();
  const { city: citySlug } = Route.useParams();
  const fetchAds = useServerFn(getActiveAds);
  const { data: ads = [] } = useSuspenseQuery({
    queryKey: ["active-ads", citySlug],
    queryFn: () => fetchAds({ data: { city_slug: citySlug } }),
  });

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">
      <BizNavbar citySlug={city.slug} cityName={city.name} state={city.state} />
      <BizHero cityName={city.name} state={city.state} />
      <main className="w-full max-w-[1800px] mx-auto px-2 sm:px-4 pb-20 sm:pb-16 min-w-0">
        <AdSlider
          ads={ads}
          title={`Featured ${city.name} Business of the Moment`}
          featured
        />
      </main>
      <BizFooter />
      <MiniPlayer />
    </div>
  );
}
