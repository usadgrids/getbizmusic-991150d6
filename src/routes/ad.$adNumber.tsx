import { createFileRoute, notFound } from "@tanstack/react-router";
import { AdLandingView, AdLandingNotFound } from "@/components/biz/AdLandingView";
import { getAdByNumber, getActiveAds } from "@/lib/ads.functions";
import { INDUSTRIES } from "@/lib/biz-utils";

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
  notFoundComponent: AdLandingNotFound,
});

function AdLanding() {
  const params = Route.useParams();
  return <AdLandingView adNumber={Number(params.adNumber)} />;
}
