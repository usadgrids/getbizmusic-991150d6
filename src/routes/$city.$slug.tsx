import { createFileRoute, notFound } from "@tanstack/react-router";
import { getDirectoryPlace, getDirectoryTopic } from "@/lib/directory.functions";
import { DirectoryPlaceView } from "@/components/biz/DirectoryPlaceView";
import {
  DirectoryTopicView,
  type DirectoryTopicPage,
} from "@/components/biz/DirectoryTopicView";
import {
  DIRECTORY_CATEGORIES,
  isDirectoryCategory,
  type DirectoryCategory,
} from "@/lib/directory-categories";

/**
 * Master template for every BizMusic Knowledge Graph page under a category.
 * Resolution order: published business slug → unbranded topic answer page → 404.
 * One file, unlimited URLs, all rendered on demand from the database.
 */
export const Route = createFileRoute("/$city/$slug")({
  loader: async ({ params }) => {
    if (!isDirectoryCategory(params.city)) throw notFound();
    const category = params.city as DirectoryCategory;
    const res = await getDirectoryPlace({ data: { category, slug: params.slug } });
    if (res.place) return { kind: "place" as const, ...res, category, topic: null };

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
    throw notFound();
  },
  head: ({ loaderData }) => {
    const category = loaderData?.category;
    if (!category) return {};

    if (loaderData?.kind === "topic" && loaderData.topic) {
      const topic = loaderData.topic;
      const config = DIRECTORY_CATEGORIES[category];
      const title = `${topic.title} — Where To Go | ${config.title}`.slice(0, 60);
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
          { rel: "canonical", href: `https://www.getbizmusic.com/${category}/${topic.slug}` },
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
        { rel: "canonical", href: `https://www.getbizmusic.com/${category}/${place.slug}` },
      ],
    };
  },
  errorComponent: () => (
    <div className="p-10 text-center text-muted-foreground">This page could not be loaded.</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Page not found.</div>
  ),
  component: DirectoryPage,
});

function DirectoryPage() {
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
    />
  );
}
