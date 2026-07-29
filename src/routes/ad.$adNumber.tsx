import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Sparkles } from "lucide-react";
import { getAdByNumber, getActiveAds } from "@/lib/ads.functions";
import { INDUSTRIES } from "@/lib/biz-utils";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { ShareBar } from "@/components/biz/ShareBar";
import { MiniPlayer } from "@/components/biz/MiniPlayer";
import { PlaylistMarquee } from "@/components/biz/PlaylistMarquee";
import { YoutubeHoverOverlay } from "@/components/biz/YoutubeHoverOverlay";
import { CityPickerButton } from "@/components/biz/CityPickerModal";

const SITE = "https://www.getbizmusic.com";

const adQueryOptions = (adNumber: number) => ({
  queryKey: ["ad-by-number", adNumber],
  queryFn: () => getAdByNumber({ data: { ad_number: adNumber } }),
});

const activeAdsQueryOptions = (citySlug: string | null) => ({
  queryKey: ["active-ads", citySlug ?? "__all__"],
  queryFn: () =>
    citySlug ? getActiveAds({ data: { city_slug: citySlug } }) : getActiveAds(),
});

export const Route = createFileRoute("/ad/$adNumber")({
  loader: async ({ params, context }) => {
    const n = Number(params.adNumber);
    if (!Number.isFinite(n) || n <= 0) throw notFound();
    const ad = await context.queryClient.ensureQueryData(adQueryOptions(n));
    if (!ad) throw notFound();
    await context.queryClient.ensureQueryData(activeAdsQueryOptions(ad.city_slug));
    return { ad };
  },
  head: ({ params, loaderData }) => {
    const n = Number(params.adNumber);
    const url = `${SITE}/ad/${params.adNumber}`;
    if (!loaderData?.ad) {
      return {
        meta: [
          { title: `Ad #${params.adNumber} — BizSpot Directory` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const ad = loaderData.ad;
    const industry =
      INDUSTRIES.find((i) => i.value === ad.industry)?.label ?? ad.industry;
    const title = `${ad.business_name} — ${industry} · Get Biz Music - National City, CA`;
    const description =
      ad.tagline?.trim() ||
      `See ${ad.business_name} on Get Biz Music - National City, CA. Local ${industry.toLowerCase()} — ad #${n}.`;
    // Social crawlers get a stable public image URL instead of a temporary
    // storage URL, so Facebook/mobile native share can reliably attach it.
    const imageUrl = `${SITE}/api/public/ad-image/${ad.ad_number ?? params.adNumber}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: imageUrl },
        { property: "og:image:secure_url", content: imageUrl },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:alt", content: ad.business_name },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "900" },
        { property: "og:site_name", content: "BizSpot Directory" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },

  component: AdLanding,
  notFoundComponent: AdNotFound,
});

function AdLanding() {
  const params = Route.useParams();
  const n = Number(params.adNumber);
  const fetchAd = useServerFn(getAdByNumber);
  const fetchAds = useServerFn(getActiveAds);

  const { data: ad } = useSuspenseQuery({
    queryKey: ["ad-by-number", n],
    queryFn: () => fetchAd({ data: { ad_number: n } }),
  });
  const citySlug = ad?.city_slug ?? null;
  const { data: ads = [] } = useSuspenseQuery({
    queryKey: ["active-ads", citySlug ?? "__all__"],
    queryFn: () =>
      citySlug ? fetchAds({ data: { city_slug: citySlug } }) : fetchAds(),
  });

  if (!ad) return <AdNotFound />;

  const industry =
    INDUSTRIES.find((i) => i.value === ad.industry)?.label ?? ad.industry;
  const relatedAds = ads.filter((a) => a.industry === ad.industry && a.id !== ad.id);
  const sliderAds = relatedAds.length > 0 ? relatedAds : ads.filter((a) => a.id !== ad.id);

  const Img = (
    <img
      src={ad.image_url}
      alt={ad.business_name}
      className="w-full h-full object-contain"
    />
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">
      <main className="w-full max-w-[1200px] mx-auto px-3 sm:px-5 py-6 sm:py-10">
        <nav className="text-xs text-gray-500 mb-3">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-1">/</span>
          <span>Ad #{ad.ad_number}</span>
        </nav>

        <section
          className="relative rounded-2xl overflow-hidden shadow-xl bg-white mx-auto"
          style={{
            border: "3px solid #D4A24C",
            aspectRatio: "4 / 3",
            maxHeight: "min(80svh, 800px)",
          }}
        >
          <div className="absolute inset-0 bg-gray-100">
            {ad.youtube_url ? (
              <YoutubeHoverOverlay
                youtubeUrl={ad.youtube_url}
                businessName={ad.business_name}
              >
                {ad.website_url ? (
                  <a
                    href={ad.website_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={`Visit ${ad.business_name}`}
                    className="absolute inset-0"
                  >
                    {Img}
                  </a>
                ) : (
                  Img
                )}
              </YoutubeHoverOverlay>
            ) : ad.website_url ? (
              <a
                href={ad.website_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={`Visit ${ad.business_name}`}
                className="absolute inset-0"
              >
                {Img}
              </a>
            ) : (
              Img
            )}
          </div>
        </section>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl text-[#0F2A4A] font-bold truncate">
              {ad.business_name}
            </h1>
            <p className="text-sm text-gray-600">
              <span className="text-[#D4A24C] font-semibold">{industry}</span>
              <span className="mx-1.5">·</span>
              <span className="font-mono">#{ad.ad_number}</span>
            </p>
            {ad.tagline && (
              <p className="mt-1 text-[#0F2A4A]/80 text-sm">{ad.tagline}</p>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            {ad.website_url && (
              <a
                href={ad.website_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2A4A] text-[#D4A24C] px-4 py-2 text-sm font-semibold hover:bg-[#0F2A4A]/90"
              >
                <ExternalLink size={14} /> Visit website
              </a>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Share:</span>
              <ShareBar
                adNumber={ad.ad_number}
                businessName={ad.business_name}
                tagline={ad.tagline}
              />
            </div>
          </div>
        </div>

        <div className="mt-10">


          <div className="flex items-center gap-3 mb-2">
            <div className="h-px flex-1 bg-gray-300" />
            <span className="text-xs uppercase tracking-wider text-gray-500">
              See more ads
            </span>
            <div className="h-px flex-1 bg-gray-300" />
          </div>
          <AdSlider
            ads={sliderAds.length > 0 ? sliderAds : ads}
            title={
              relatedAds.length > 0
                ? `More ${industry} in ${ad.city_name ?? "your area"}`
                : `More ${ad.city_name ?? "Local"} Businesses`
            }
          />
          <div className="mt-6">
            <PlaylistMarquee />
          </div>
          <section className="mt-8 rounded-2xl bg-gradient-to-br from-[#0F2A4A] via-[#153a66] to-[#0F2A4A] px-5 py-6 sm:px-8 sm:py-8 text-center text-white shadow-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#F4C430] mb-3">
              <Sparkles size={14} />
              {ad.city_name ?? "Local"} Business Spotlight
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Submit Your Business Novelty Ad
            </h2>
            <p className="text-sm text-white/80 max-w-2xl mx-auto mb-4">
              Get your {ad.city_name ?? "local"} business featured in the rotation
              above and reach local listeners for just $12/year. Limited-time intro
              offer.
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
      <MiniPlayer />
    </div>
  );
}

function AdNotFound() {
  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-[#0F2A4A] font-bold mb-2">
            Ad not found
          </h1>
          <p className="text-gray-600 mb-4">
            This ad may have expired or been removed.
          </p>
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-[#0F2A4A] text-[#D4A24C] px-5 py-2 font-semibold"
          >
            Browse current ads
          </Link>
        </div>
      </main>
      <BizFooter />
    </div>
  );
}
