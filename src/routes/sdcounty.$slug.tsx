import { createFileRoute, notFound } from "@tanstack/react-router";
import { getDirectoryPlace, getDirectoryTopic } from "@/lib/directory.functions";
import { DirectoryPlaceView } from "@/components/biz/DirectoryPlaceView";
import {
  DirectoryTopicView,
  type DirectoryTopicPage,
} from "@/components/biz/DirectoryTopicView";
import {
  DIRECTORY_CATEGORY_SLUGS,
  type DirectoryCategory,
} from "@/lib/directory-categories";

/**
 * Unified master template for every BizMusic Knowledge Graph page.
 * One file, unlimited URLs at /sdcounty/<business-slug>, rendered on demand
 * from the database. Resolution order: published business → topic page → 404.
 */
export const Route = createFileRoute("/sdcounty/$slug")({
  loader: async ({ params }) => {
    for (const slug of DIRECTORY_CATEGORY_SLUGS) {
      const category = slug as DirectoryCategory;
      const res = await getDirectoryPlace({ data: { category, slug: params.slug } });
      if (res.place) return { kind: "place" as const, ...res, category, topic: null };
    }
    for (const slug of DIRECTORY_CATEGORY_SLUGS) {
      const category = slug as DirectoryCategory;
      const topicRes = await getDirectoryTopic({ data: { category, slug: params.slug } });
      if (topicRes.topic) {
        return {
          kind: "topic" as const,
          category,
          topic: topicRes.topic as DirectoryTopicPage,
          place: null,
          faqs: [],
          adNumber: null,
        };
      }
    }
    throw notFound();
  },
  head: ({ loaderData }) => {
    const category = loaderData?.category;
    if (!category) return {};

    if (loaderData?.kind === "topic" && loaderData.topic) {
      const topic = loaderData.topic;
      const title = `${topic.title} — Where To Go In San Diego County`.slice(0, 60);
      const description = topic.answer.slice(0, 158);
      return {
        meta: [
          { title },
          { name: "description", content: description },
          { property: "og:title", content: title },
          { property: "og:description", content: description },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [
          { rel: "canonical", href: `https://www.getbizmusic.com/sdcounty/${topic.slug}` },
        ],
      };
    }

    const place = loaderData?.place;
    if (!place) return {};
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
        { rel: "canonical", href: `https://www.getbizmusic.com/sdcounty/${place.slug}` },
      ],
    };
  },
  errorComponent: () => (
    <div className="p-10 text-center text-muted-foreground">This page could not be loaded.</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Page not found.</div>
  ),
  component: CountyDirectoryPage,
});

function CountyDirectoryPage() {
  const data = Route.useLoaderData();
  if (data.kind === "topic" && data.topic) {
    return <DirectoryTopicView category={data.category} topic={data.topic} />;
  }
  if (!data.place) return null;
  return (
    <DirectoryPlaceView
      category={data.category}
      place={data.place}
      faqs={data.faqs}
      adNumber={data.adNumber ?? null}
      foundingMember={data.foundingMember ?? false}
      serviceAreaLabel={data.serviceAreaLabel ?? null}
    />

  );
}
