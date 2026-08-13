import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, UtensilsCrossed } from "lucide-react";
import { getAdsByCategory } from "@/lib/ads.functions";
import { BizHero } from "@/components/biz/BizHero";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { CityPickerButton } from "@/components/biz/CityPickerModal";

// Business categories that belong on the /food page.
const FOOD_INDUSTRIES = [
  "restaurant",
  "food_truck",
  "cafe_coffee",
  "bakery",
  "catering",
  "bar_nightlife",
  "grocery",
  "farmers_market",
  "convenience_store",
  "liquor_store",
  "nutrition",
];

const TITLE = "Food & Dining Ads — Get Biz Music";
const DESCRIPTION =
  "Discover local restaurants, food trucks, cafés, bakeries, caterers and markets advertising with Get Biz Music — with music streaming while you browse.";

export const Route = createFileRoute("/food")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["category-ads", "food"],
      queryFn: () => getAdsByCategory({ data: { industries: FOOD_INDUSTRIES, seed_key: "food" } }),
    });
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://getbizmusic.com/food" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://getbizmusic.com/food" }],
  }),
  component: FoodCategoryPage,
});

function FoodCategoryPage() {
  const fetchAds = useServerFn(getAdsByCategory);
  const { data: ads = [] } = useSuspenseQuery({
    queryKey: ["category-ads", "food"],
    queryFn: () => fetchAds({ data: { industries: FOOD_INDUSTRIES, seed_key: "food" } }),
  });

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">
      <BizHero cityName="Food & Dining" />
      <main className="w-full max-w-[1800px] mx-auto px-2 sm:px-4 pb-20 sm:pb-16 min-w-0">
        <h1 className="sr-only">Food &amp; Dining business ads on Get Biz Music</h1>
        {ads.length > 0 ? (
          <AdSlider ads={ads} title="Featured Food &amp; Dining Business of the Moment" featured />
        ) : (
          <section className="mt-8 rounded-2xl bg-white px-5 py-10 text-center shadow-sm">
            <UtensilsCrossed className="mx-auto mb-3 text-[#D4A24C]" size={28} />
            <h2 className="text-lg font-bold text-[#0F2A4A]">No food ads running yet</h2>
            <p className="mt-2 text-sm text-gray-600">
              Be the first restaurant, food truck, café or market featured in the rotation.
            </p>
          </section>
        )}

        <div className="mx-auto w-full" style={{ maxWidth: "min(100%, 1400px, calc(90svh * 4 / 3))" }}>
          <section className="mt-6 sm:mt-8 rounded-2xl bg-gradient-to-br from-[#0F2A4A] via-[#153a66] to-[#0F2A4A] px-5 py-6 sm:px-8 sm:py-8 text-center text-white shadow-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#F4C430] mb-3">
              <Sparkles size={14} />
              Food &amp; Dining Spotlight
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Submit Your Business Novelty Ad</h2>
            <p className="text-sm text-white/80 max-w-2xl mx-auto mb-4">
              Get your restaurant, food truck, café or market featured in the rotation above and reach
              hungry local listeners for just $12/year. Limited-time intro offer.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-6 py-2.5 text-sm font-bold text-[#0F2A4A] transition-transform hover:scale-105 hover:bg-[#e0b566] shadow-sm"
              >
                Submit Your Ad
                <Sparkles size={14} />
              </Link>
              <CityPickerButton className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/40 px-6 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105 hover:bg-white/10 hover:border-white/60 shadow-sm" />
            </div>
          </section>
        </div>
      </main>
      <BizFooter />
    </div>
  );
}
