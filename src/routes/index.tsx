import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveAds } from "@/lib/ads.functions";
import { BizNavbar } from "@/components/biz/BizNavbar";
import { BizHero } from "@/components/biz/BizHero";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { MiniPlayer } from "@/components/biz/MiniPlayer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BizSpot Directory - National City — $12/yr Intro Offer" },
      {
        name: "description",
        content:
          "Advertise your National City business — restaurants, lawyers, salons, auto, and more. Limited-time intro: $12/year (about $1/month) for a full year of exposure.",
      },
      { property: "og:title", content: "BizSpot Directory - National City — $12/yr Intro Offer" },
      { property: "og:description", content: "Limited-time intro offer: $12/year, about $1/month. Open to new National City businesses started in 2026." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["active-ads"],
      queryFn: () => getActiveAds(),
    });
  },
  component: Index,
});

function Index() {
  const fetchAds = useServerFn(getActiveAds);
  const { data: ads = [] } = useSuspenseQuery({
    queryKey: ["active-ads"],
    queryFn: () => fetchAds(),
  });

  const sliderAds = ads.filter((a) => a.ad_type === "slider_10");

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">
      <BizNavbar />
      <BizHero />
      <main className="w-full max-w-[1800px] mx-auto px-2 sm:px-4 pb-20 sm:pb-16">
        <AdSlider
          ads={sliderAds.length ? sliderAds : ads}
          title="Featured Business of the Moment"
          featured
        />
      </main>
      <BizFooter />
      <MiniPlayer />
    </div>
  );
}
