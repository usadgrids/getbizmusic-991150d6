import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAdByNumber, getActiveAds } from "@/lib/ads.functions";
import { INDUSTRIES } from "@/lib/biz-utils";
import { AdLandingView, AdLandingNotFound } from "@/components/biz/AdLandingView";
import {
  isDirectoryCategory,
  DIRECTORY_LABELS,
  type DirectoryCategory,
} from "@/lib/directory-categories";

const SITE = "https://www.getbizmusic.com";

/**
 * Category-scoped unique ad page: /beauty/ad/2978, /food/ad/1234, ...
 * Same public ad landing experience as /ad/$adNumber, but branded and
 * canonicalised under the Knowledge Graph category it belongs to.
 */
export const Route = createFileRoute("/$city/ad/$adNumber")({
  loader: async ({ params, context }) => {
    if (!isDirectoryCategory(params.city)) throw notFound();
    const n = Number(params.adNumber);
    if (!Number.isFinite(n) || n <= 0) throw notFound();
    const ad = await context.queryClient.ensureQueryData({
      queryKey: ["ad-by-number", n],
      queryFn: () => getAdByNumber({ data: { ad_number: n } }),
    });
    if (!ad) throw notFound();
    await context.queryClient.ensureQueryData({
      queryKey: ["active-ads", ad.city_slug ?? "__all__"],
      queryFn: () =>
        ad.city_slug ? getActiveAds({ data: { city_slug: ad.city_slug } }) : getActiveAds(),
    });
    return { ad, category: params.city as DirectoryCategory };
  },
  head: ({ params, loaderData }) => {
    const ad = loaderData?.ad;
    const category = loaderData?.category;
    if (!ad || !category) {
      return {
        meta: [
          { title: `Ad #${params.adNumber} — Get Biz Music` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const label = DIRECTORY_LABELS[category];
    const industry = INDUSTRIES.find((i) => i.value === ad.industry)?.label ?? ad.industry;
    const url = `${SITE}/${category}/ad/${ad.ad_number ?? params.adNumber}`;
    const title = `${ad.business_name} — ${industry} · ${label.title}`.slice(0, 60);
    const description = (
      ad.tagline?.trim() ||
      `See ${ad.business_name} on Get Biz Music — local ${industry.toLowerCase()} in ${ad.city_name ?? "your area"}.`
    ).slice(0, 158);
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
        { property: "og:image:alt", content: ad.business_name },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CategoryAdPage,
  notFoundComponent: AdLandingNotFound,
  errorComponent: AdLandingNotFound,
});

function CategoryAdPage() {
  const { category } = Route.useLoaderData();
  const params = Route.useParams();
  const label = DIRECTORY_LABELS[category];
  return (
    <AdLandingView
      adNumber={Number(params.adNumber)}
      breadcrumb={{ label: label.title, to: label.basePath }}
    />
  );
}
