import { createFileRoute, notFound } from "@tanstack/react-router";
import { getDirectoryPlace } from "@/lib/directory.functions";
import { DirectoryPlaceView } from "@/components/biz/DirectoryPlaceView";
import { isDirectoryCategory, type DirectoryCategory } from "@/lib/directory-categories";

/**
 * Master template for every BizMusic Knowledge Graph listing page.
 * Serves /food/<slug>, /beauty/<slug> and any future category — one file,
 * unlimited advertiser URLs, all rendered on demand from the database.
 */
export const Route = createFileRoute("/$city/$slug")({
  loader: async ({ params }) => {
    if (!isDirectoryCategory(params.city)) throw notFound();
    const category = params.city as DirectoryCategory;
    const res = await getDirectoryPlace({ data: { category, slug: params.slug } });
    if (!res.place) throw notFound();
    return { ...res, category };
  },
  head: ({ loaderData }) => {
    const place = loaderData?.place;
    const category = loaderData?.category;
    if (!place || !category) return {};
    const where = [place.city, place.state].filter(Boolean).join(", ");
    const title = `${place.name}${where ? ` — ${where}` : ""} | Hours, Services & FAQs`.slice(0, 60);
    const description = (
      place.summary ??
      `${place.name} in ${where || "San Diego County"}: hours, services, contact details and answers to common questions.`
    ).slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(place.image_url?.startsWith("https://")
          ? [
              { property: "og:image", content: place.image_url },
              { name: "twitter:image", content: place.image_url },
            ]
          : []),
      ],
      links: [
        { rel: "canonical", href: `https://www.getbizmusic.com/${category}/${place.slug}` },
      ],
    };
  },
  errorComponent: () => (
    <div className="p-10 text-center text-muted-foreground">This listing could not be loaded.</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Listing not found.</div>
  ),
  component: DirectoryPlacePage,
});

function DirectoryPlacePage() {
  const { place, faqs, category } = Route.useLoaderData();
  if (!place) return null;
  return <DirectoryPlaceView category={category} place={place} faqs={faqs} />;
}
