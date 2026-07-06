import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { getAdByNumber, getActiveAds } from "@/lib/ads.functions";
import { INDUSTRIES } from "@/lib/biz-utils";
import { BizNavbar } from "@/components/biz/BizNavbar";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { ShareBar } from "@/components/biz/ShareBar";
import { MiniPlayer } from "@/components/biz/MiniPlayer";
import { PlaylistMarquee } from "@/components/biz/PlaylistMarquee";
import { YoutubeHoverOverlay } from "@/components/biz/YoutubeHoverOverlay";

const SITE = "https://bizspotmusicad.lovable.app";

const adQueryOptions = (adNumber: number) => ({
  queryKey: ["ad-by-number", adNumber],
  queryFn: () => getAdByNumber({ data: { ad_number: adNumber } }),
});

const activeAdsQueryOptions = (citySlug?: string) => ({
  queryKey: citySlug ? ["active-ads", citySlug] : ["active-ads"],
  queryFn: () => getActiveAds(citySlug ? { data: { city_slug: citySlug } } : undefined),
});

export const Route = createFileRoute("/ad/$adNumber")({
  loader: async ({ params, context }) => {
    const n = Number(params.adNumber);
    if (!Number.isFinite(n) || n <= 0) throw notFound();
    const ad = await context.queryClient.ensureQueryData(adQueryOptions(n));
    if (!ad) throw notFound();
    await context.queryClient.ensureQueryData(activeAdsQueryOptions(ad.city?.slug));
    return { ad };
  },
  head: ({ params, loaderData }) => {
    const n = Number(params.adNumber);
    const url = `${SITE}/ad/${params.adNumber}`;
    if (!loaderData?.ad) {
      return {
        meta: [
          { title: `Ad #${params.adNumber} — Get Biz Music` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const ad = loaderData.ad;
    const industry = INDUSTRIES.find((i) => i.value === ad.industry)?.label ?? ad.industry;
    const cityLabel = ad.city ? `${ad.city.name}, ${ad.city.state}` : "Get Biz Music";
    const title = `${ad.business_name} — ${industry} · ${cityLabel}`;
    const description =
      ad.tagline?.trim() ||
      `See ${ad.business_name} on Get Biz Music${ad.city ? ` — ${cityLabel}` : ""}. Local ${industry.toLowerCase()} — ad #${n}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: ad.image_url },
        { property: "og:image:alt", content: ad.business_name },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "900" },
        { property: "og:site_name", content: "Get Biz Music" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ad.image_url },
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
  const citySlug = ad?.city?.slug;
  const { data: ads = [] } = useSuspenseQuery({
    queryKey: citySlug ? ["active-ads", citySlug] : ["active-ads"],
    queryFn: () => fetchAds(citySlug ? { data: { city_slug: citySlug } } : undefined),
  });

  if (!ad) return <AdNotFound />;

  const industry = INDUSTRIES.find((i) => i.value === ad.industry)?.label ?? ad.industry;
  const relatedAds = ads.filter((a) => a.industry === ad.industry && a.id !== ad.id);
  const sliderAds = relatedAds.length > 0 ? relatedAds : ads.filter((a) => a.id !== ad.id);
  const cityLabel = ad.city ? `${ad.city.name}, ${ad.city.state}` : null;

  const Img = (
    <img src={ad.image_url} alt={ad.business_name} className="w-full h-full object-contain" />
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">
      <BizNavbar citySlug={ad.city?.slug} cityName={ad.city?.name} state={ad.city?.state} />
      <main className="w-full max-w-[1200px] mx-auto px-3 sm:px-5 py-6 sm:py-10">
        <nav className="text-xs text-gray-500 mb-3">
          {ad.city ? (
            <Link to="/$city" params={{ city: ad.city.slug }} className="hover:underline">
              {ad.city.name}
            </Link>
          ) : (
            <Link to="/" className="hover:underline">Home</Link>
          )}
          <span className="mx-1">/</span>
          <span>Ad #{ad.ad_number}</span>
        </nav>

        <section
          className="relative rounded-2xl overflow-hidden shadow-xl bg-white mx-auto"
          style={{ border: "3px solid #D4A24C", aspectRatio: "4 / 3", maxHeight: "min(80svh, 800px)" }}
        >
          <div className="absolute inset-0 bg-gray-100">
            {ad.youtube_url ? (
              <YoutubeHoverOverlay youtubeUrl={ad.youtube_url} businessName={ad.business_name}>
                {ad.website_url ? (
                  <a href={ad.website_url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Visit ${ad.business_name}`} className="absolute inset-0">
                    {Img}
                  </a>
                ) : Img}
              </YoutubeHoverOverlay>
            ) : ad.website_url ? (
              <a href={ad.website_url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Visit ${ad.business_name}`} className="absolute inset-0">
                {Img}
              </a>
            ) : Img}
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
              {cityLabel && (<><span className="mx-1.5">·</span><span>{cityLabel}</span></>)}
            </p>
            {ad.tagline && <p className="mt-1 text-[#0F2A4A]/80 text-sm">{ad.tagline}</p>}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            {ad.website_url && (
              <a href={ad.website_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2A4A] text-[#D4A24C] px-4 py-2 text-sm font-semibold hover:bg-[#0F2A4A]/90">
                <ExternalLink size={14} /> Visit website
              </a>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Share:</span>
              <ShareBar adNumber={ad.ad_number} businessName={ad.business_name} tagline={ad.tagline} />
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px flex-1 bg-gray-300" />
            <span className="text-xs uppercase tracking-wider text-gray-500">See more ads</span>
            <div className="h-px flex-1 bg-gray-300" />
          </div>
          <AdSlider
            ads={sliderAds.length > 0 ? sliderAds : ads}
            title={
              relatedAds.length > 0
                ? `More ${industry}${cityLabel ? ` in ${ad.city!.name}` : ""}`
                : cityLabel
                  ? `More ${ad.city!.name} Businesses`
                  : "More Businesses"
            }
          />
          <div className="mt-6">
            <PlaylistMarquee />
          </div>
          <div className="mt-4 text-center">
            <Link
              to="/submit"
              search={ad.city?.slug ? ({ city: ad.city.slug } as never) : (undefined as never)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2A4A] text-[#D4A24C] px-5 py-2.5 text-sm font-semibold hover:bg-[#0F2A4A]/90"
            >
              {cityLabel ? `Submit Your Own ${ad.city!.name} Business Ad →` : "Submit Your Own Business Ad →"}
            </Link>
          </div>
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
      <BizNavbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-[#0F2A4A] font-bold mb-2">Ad not found</h1>
          <p className="text-gray-600 mb-4">This ad may have expired or been removed.</p>
          <Link to="/" className="inline-flex items-center rounded-full bg-[#0F2A4A] text-[#D4A24C] px-5 py-2 font-semibold">
            Browse cities
          </Link>
        </div>
      </main>
      <BizFooter />
    </div>
  );
}
