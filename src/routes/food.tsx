import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UtensilsCrossed, ArrowRight, CheckCircle2 } from "lucide-react";
import { getAdsByCategory, type PublicAd } from "@/lib/ads.functions";
import type { ActivationProof } from "@/lib/activation.functions";
import { BizHero } from "@/components/biz/BizHero";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { ActivationCodeBar } from "@/components/biz/ActivationCodeBar";
import adAmerican from "@/assets/food-ad-american.jpg";
import adFilipino from "@/assets/food-ad-filipino.jpg";
import adMexican from "@/assets/food-ad-mexican.jpg";
import adItalian from "@/assets/food-ad-italian.jpg";
import adBuffet from "@/assets/food-ad-buffet.jpg";
import foodHero from "@/assets/food-hero.png.asset.json";


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

// Sample magazine-style creatives shown in the rotation so visitors can see
// what a professionally designed food ad looks like.
const SHOWCASE_ADS: PublicAd[] = [
  {
    id: "showcase-american",
    ad_number: null,
    business_name: "Liberty Grill House",
    website_url: null,
    youtube_url: null,
    tagline: "All-American Burgers, Ribs & Shakes",
    industry: "restaurant",
    ad_type: "slider_10",
    image_url: adAmerican,
    duration_seconds: 10,
  },
  {
    id: "showcase-filipino",
    ad_number: null,
    business_name: "Kusina Ni Lola",
    website_url: null,
    youtube_url: null,
    tagline: "Authentic Filipino Comfort Food",
    industry: "restaurant",
    ad_type: "slider_10",
    image_url: adFilipino,
    duration_seconds: 10,
  },
  {
    id: "showcase-mexican",
    ad_number: null,
    business_name: "Casa Del Sol Taqueria",
    website_url: null,
    youtube_url: null,
    tagline: "Street Tacos, Fresh Salsa, Real Fire",
    industry: "restaurant",
    ad_type: "slider_10",
    image_url: adMexican,
    duration_seconds: 10,
  },
  {
    id: "showcase-italian",
    ad_number: null,
    business_name: "Trattoria Bella Vita",
    website_url: null,
    youtube_url: null,
    tagline: "Handmade Pasta & Wood-Fired Pizza",
    industry: "restaurant",
    ad_type: "slider_10",
    image_url: adItalian,
    duration_seconds: 10,
  },
  {
    id: "showcase-buffet",
    ad_number: null,
    business_name: "Grand Harvest Buffet",
    website_url: null,
    youtube_url: null,
    tagline: "All-You-Can-Eat International Favorites",
    industry: "restaurant",
    ad_type: "slider_10",
    image_url: adBuffet,
    duration_seconds: 10,
  },
];


const TITLE = "Food & Dining Ads — Get Biz Music";
const DESCRIPTION =
  "Discover local restaurants, food trucks, cafés, bakeries, caterers and markets advertising with Get Biz Music — with music streaming while you browse.";

export const Route = createFileRoute("/food")({
  validateSearch: z.object({ code: z.string().optional() }),
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
  const search = Route.useSearch();
  const fetchAds = useServerFn(getAdsByCategory);
  const { data: ads = [] } = useSuspenseQuery({
    queryKey: ["category-ads", "food"],
    queryFn: () => fetchAds({ data: { industries: FOOD_INDUSTRIES, seed_key: "food" } }),
  });
  const [proof, setProof] = useState<ActivationProof | null>(null);
  // Bumped on every code submission so re-entering the same code still snaps the slider back.
  const [focusNonce, setFocusNonce] = useState(0);
  const handleProof = (next: ActivationProof | null) => {
    setProof(next);
    if (next) setFocusNonce((n) => n + 1);
  };

  // PRIVATE PREVIEW ONLY: this slide exists purely in this visitor's browser after they
  // entered their own activation code. It is never fetched by, or rendered for, anyone else.
  // Once the listing is paid + activated by an admin it becomes a real `ads` row and shows
  // up through the normal query, so we drop the preview slide at that point (no duplicate).
  const isLivePreview = proof?.status === "activated" || proof?.status === "live";
  const proofSlide: PublicAd | null =
    proof && proof.imageUrl && !isLivePreview
      ? {
          id: `activation-${proof.code}`,
          ad_number: null,
          business_name: proof.businessName,
          website_url: proof.websiteUrl,
          youtube_url: proof.youtubeUrl,
          tagline: proof.tagline,
          industry: proof.industry,
          ad_type: proof.adType === "slider_10" ? "slider_10" : "image_5",
          image_url: proof.imageUrl,
          duration_seconds: proof.adType === "slider_10" ? 10 : 7,
        }
      : null;
  const slides = [...(proofSlide ? [proofSlide] : []), ...SHOWCASE_ADS, ...ads];


  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">
      <BizHero
        cityName="Food & Dining In San Diego County"
        state="CA"
        imageUrl={foodHero.url}
        imageAlt="Get your restaurant listed, seen and recommended on AI search and answer engines — Get Biz Music AI Food Directory, $49.95/year."
      />
      <main className="w-full max-w-[1800px] mx-auto px-2 sm:px-4 pb-20 sm:pb-16 min-w-0">
        <h1 className="sr-only">Food & Dining business ads on Get Biz Music</h1>

        <div className="mx-auto w-full" style={{ maxWidth: "min(100%, 1400px, calc(90svh * 4 / 3))" }}>
          <ActivationCodeBar initialCode={search.code} proof={proof} onProof={handleProof} />
        </div>

        {proofSlide && (
          <div className="mx-auto mt-3 w-full max-w-3xl rounded-xl border border-[#D4A24C]/50 bg-[#FFF8E8] px-4 py-2.5 text-center text-xs font-semibold text-[#7a5410]">
            Private preview — only you can see this ad. It goes public after payment and activation.
          </div>
        )}


        {slides.length > 0 ? (
          <AdSlider
            ads={slides}
            title="Featured Food & Dining Business of the Moment"
            featured
            focusAdId={proofSlide?.id ?? null}
            focusNonce={focusNonce}
            belowShareBar={
              proofSlide ? (
                <div className="mt-4 mx-auto w-full max-w-3xl rounded-2xl border-2 border-[#D4A24C] bg-gradient-to-br from-[#0F2A4A] via-[#153a66] to-[#0F2A4A] px-5 py-6 sm:px-8 sm:py-7 text-center text-white shadow-md">
                  {isLivePreview || proof?.paid ? (
                    <>
                      <CheckCircle2 className="mx-auto mb-2 text-[#F4C430]" size={26} />
                      <h2 className="text-lg sm:text-xl font-bold mb-1">
                        Your listing is already live
                      </h2>
                      <p className="text-sm text-white/80">
                        This ad is active and running in the rotation. No further action is needed.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg sm:text-xl font-bold mb-1">
                        That's your ad in the spotlight — ready to go live?
                      </h2>
                      <p className="text-sm text-white/80 mb-1">
                        {proof?.priceNote
                          ? `Activation: ${proof.priceNote}`
                          : proof?.priceCents
                            ? `Activation: $${(proof.priceCents / 100).toFixed(2)}`
                            : "Activate your listing to make this ad public."}
                      </p>
                      <p className="text-xs text-white/60 mb-4">
                        It stays a private preview until payment and activation are complete.
                      </p>
                      <Link
                        to="/food/activate"
                        search={{ code: proof!.code }}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-7 py-3 text-sm font-bold text-[#0F2A4A] transition-transform hover:scale-105 hover:bg-[#e0b566] shadow-sm"
                      >
                        Review & Activate My Listing
                        <ArrowRight size={16} />
                      </Link>
                    </>
                  )}
                </div>
              ) : null
            }
          />
        ) : (
          <section className="mt-8 rounded-2xl bg-white px-5 py-10 text-center shadow-sm">
            <UtensilsCrossed className="mx-auto mb-3 text-[#D4A24C]" size={28} />
            <h2 className="text-lg font-bold text-[#0F2A4A]">No food ads running yet</h2>
            <p className="mt-2 text-sm text-gray-600">
              Be the first restaurant, food truck, café or market featured in the rotation.
            </p>
          </section>
        )}

      </main>

      <BizFooter />
    </div>
  );
}
