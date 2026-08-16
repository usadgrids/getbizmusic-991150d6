import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Sparkles } from "lucide-react";
import { getAdByNumber, getActiveAds } from "@/lib/ads.functions";
import { INDUSTRIES } from "@/lib/biz-utils";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { ShareBar } from "@/components/biz/ShareBar";
import { YoutubeHoverOverlay } from "@/components/biz/YoutubeHoverOverlay";
import { CityPickerButton } from "@/components/biz/CityPickerModal";
import { FloatingHomeButton, FloatingBackButton } from "@/components/biz/FloatingHomeButton";
import {
  DIRECTORY_CATEGORIES,
  type DirectoryCategory,
} from "@/lib/directory-categories";
import { DIRECTORY_CATEGORY_UI } from "@/lib/directory-category-ui";

/**
 * Shared public "unique ad page" body. Rendered by /ad/$adNumber and by the
 * category-scoped /$category/ad/$adNumber master template.
 */
export function AdLandingView({
  adNumber,
  breadcrumb,
  category,
}: {
  adNumber: number;
  breadcrumb?: { label: string; to: string };
  category?: DirectoryCategory;
}) {
  const fetchAd = useServerFn(getAdByNumber);
  const fetchAds = useServerFn(getActiveAds);

  const { data: ad } = useSuspenseQuery({
    queryKey: ["ad-by-number", adNumber],
    queryFn: () => fetchAd({ data: { ad_number: adNumber } }),
  });
  const citySlug = ad?.city_slug ?? null;
  const { data: ads = [] } = useSuspenseQuery({
    queryKey: ["active-ads", citySlug ?? "__all__"],
    queryFn: () =>
      citySlug ? fetchAds({ data: { city_slug: citySlug } }) : fetchAds(),
  });
  // On category pages, also pull the nationwide pool so the slider still has
  // other ads to rotate through when the city has only one.
  const { data: allAds = [] } = useSuspenseQuery({
    queryKey: ["active-ads", "__all__"],
    queryFn: () => fetchAds(),
  });

  if (!ad) return <AdLandingNotFound />;

  const industry =
    INDUSTRIES.find((i) => i.value === ad.industry)?.label ?? ad.industry;
  // On category-scoped pages (/beauty/ad/123) only ever show ads that belong
  // to that category; elsewhere fall back to all ads in the city.
  const categoryIndustries = category ? DIRECTORY_CATEGORIES[category].industries : null;
  const pool = categoryIndustries
    ? [...ads, ...allAds.filter((a) => !ads.some((b) => b.id === a.id))]
    : ads;
  const scopedAds = categoryIndustries
    ? pool.filter((a) => categoryIndustries.includes((a.industry ?? "").toLowerCase()))
    : pool;
  const showcaseAds = category ? DIRECTORY_CATEGORY_UI[category].showcaseAds : [];
  const otherAds = [...scopedAds.filter((a) => a.id !== ad.id), ...showcaseAds];
  const relatedAds = otherAds.filter((a) => a.industry === ad.industry);
  const sliderAds = otherAds.length > 0 ? otherAds : relatedAds;

  const Img = (
    <img
      src={ad.image_url}
      alt={ad.business_name}
      className="w-full h-full object-contain"
    />
  );

  return (
    <div className="min-h-screen bg-[#0F2A4A] text-white overflow-x-hidden">
      <main className="w-full max-w-[1200px] mx-auto px-3 sm:px-5 py-6 sm:py-10">
        <nav className="text-xs text-white/60 mb-3">
          <Link to="/" className="hover:underline">Home</Link>
          {breadcrumb && (
            <>
              <span className="mx-1">/</span>
              <a href={breadcrumb.to} className="hover:underline">
                {breadcrumb.label}
              </a>
            </>
          )}
          <span className="mx-1">/</span>
          <span>Ad #{ad.ad_number}</span>
        </nav>

        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3 text-center tracking-wide">
          Featured Business
        </h2>

        <section
          className="relative rounded-2xl overflow-hidden shadow-xl bg-white mx-auto w-full"
          style={{
            border: "3px solid #D4A24C",
            aspectRatio: "4 / 3",
            maxHeight: "min(92svh, 1000px)",
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
                shareUrl={breadcrumb ? `${breadcrumb.to}/ad/${ad.ad_number}` : undefined}
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
            featured
            compact
            ads={sliderAds.length > 0 ? sliderAds : [ad]}
            title={
              relatedAds.length > 0
                ? `More ${industry} in ${ad.city_name ?? "your area"}`
                : category
                  ? `More ${DIRECTORY_CATEGORIES[category].title} Businesses`
                  : `More ${ad.city_name ?? "Local"} Businesses`
            }
          />
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
      <FloatingHomeButton />
      <FloatingBackButton />
    </div>
  );
}

export function AdLandingNotFound() {
  return (
    <div className="min-h-screen bg-[#0F2A4A] text-white flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-white font-bold mb-2">
            Ad not found
          </h1>
          <p className="text-white/70 mb-4">
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
