import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveAds } from "@/lib/ads.functions";
import { BizNavbar } from "@/components/biz/BizNavbar";
import { BizHero } from "@/components/biz/BizHero";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { PricingBanner } from "@/components/biz/PricingBanner";
import { FeaturedBusinesses } from "@/components/biz/FeaturedBusinesses";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BizSpot Directory — Local Business Advertising From $5/yr" },
      {
        name: "description",
        content:
          "Advertise your business — restaurants, lawyers, salons, auto, and more. $5 for 5-second image ads, $10 for 10-second featured slider ads. Full year of exposure.",
      },
      { property: "og:title", content: "BizSpot Directory — Local Business Advertising" },
      { property: "og:description", content: "Reach local customers all year long for as little as $5." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery({
      queryKey: ["active-ads"],
      queryFn: () => getActiveAds(),
    });
  },
  component: Index,
});

function Index() {
  const fetchAds = useServerFn(getActiveAds);
  const { data: ads = [] } = useQuery({
    queryKey: ["active-ads"],
    queryFn: () => fetchAds(),
  });

  const sliderAds = ads.filter((a) => a.ad_type === "slider_10");
  const imageAds = ads.filter((a) => a.ad_type === "image_5");

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <BizNavbar />
      <BizHero />
      <main className="max-w-6xl mx-auto px-4">
        <AdSlider
          ads={sliderAds.length ? sliderAds : ads}
          title="Featured Business of the Moment"
          featured
        />
        <PricingBanner />
        <AdSlider ads={imageAds.length ? imageAds : ads} title="Local Business Spotlight" />
        <FeaturedBusinesses ads={ads} />
      </main>
      <BizFooter />
    </div>
  );
}
