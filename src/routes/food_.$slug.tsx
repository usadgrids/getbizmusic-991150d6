import { createFileRoute, notFound } from "@tanstack/react-router";
import { getDirectoryPlace } from "@/lib/directory.functions";
import { DirectoryPlaceView } from "@/components/biz/DirectoryPlaceView";

export const Route = createFileRoute("/food_/$slug")({
  loader: async ({ params }) => {
    const res = await getDirectoryPlace({ data: { category: "food", slug: params.slug } });
    if (!res.place) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const place = loaderData?.place;
    if (!place) return {};
    const where = [place.city, place.state].filter(Boolean).join(", ");
    const title = `${place.name}${where ? ` — ${where}` : ""} | Hours, Menu & FAQs`.slice(0, 60);
    const description = (
      place.summary ??
      `${place.name} in ${where || "San Diego County"}: hours, cuisine, contact details and answers to common questions.`
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
        { rel: "canonical", href: `https://www.getbizmusic.com/food/${place.slug}` },
      ],
    };
  },
  errorComponent: () => (
    <div className="p-10 text-center text-muted-foreground">This listing could not be loaded.</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Listing not found.</div>
  ),
  component: FoodPlacePage,
});

function FoodPlacePage() {
  const { place, faqs } = Route.useLoaderData();
  if (!place) return null;
  return <DirectoryPlaceView category="food" place={place} faqs={faqs} />;
}
