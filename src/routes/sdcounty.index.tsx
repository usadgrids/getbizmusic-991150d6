import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CountyHubPage } from "@/components/biz/CountyHubPage";
import { listAllDirectoryPlaces, listDirectoryTopics } from "@/lib/directory.functions";
import { getCountyAds } from "@/lib/ads.functions";
import { DIRECTORY_CATEGORY_SLUGS, type DirectoryCategory } from "@/lib/directory-categories";

const TITLE = "San Diego County Business Directory | Get Biz Music";
const DESCRIPTION =
  "Verified San Diego County businesses — hours, services, pricing and answers, structured so AI answer engines cite them correctly.";

export const Route = createFileRoute("/sdcounty/")({
  validateSearch: z.object({ category: z.string().optional() }),
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["directory-places", "all"],
        queryFn: () => listAllDirectoryPlaces({}),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["county-ads", "sdcounty"],
        queryFn: () => getCountyAds(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["directory-topics", "all"],
        queryFn: async () => {
          const all = await Promise.all(
            DIRECTORY_CATEGORY_SLUGS.map((category) =>
              listDirectoryTopics({ data: { category: category as DirectoryCategory } }),
            ),
          );
          return all.flatMap((r) => r?.topics ?? []);
        },
      }),
    ]);
    return {};
  },

  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.getbizmusic.com/sdcounty" }],
  }),
  component: CountyHub,
});

function CountyHub() {
  const { category } = Route.useSearch();
  return <CountyHubPage categoryFilter={category} />;
}
