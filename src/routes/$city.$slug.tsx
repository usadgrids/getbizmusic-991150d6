import { createFileRoute, redirect } from "@tanstack/react-router";
import { isDirectoryCategory } from "@/lib/directory-categories";

/**
 * Legacy Knowledge Graph URLs (/food/<slug>, /beauty/<slug>) now live at
 * /sdcounty/<slug>. Server-side 301 keeps external links, bookmarks and
 * existing AI answer-engine citations resolving to the new page.
 */
export const Route = createFileRoute("/$city/$slug")({
  loader: ({ params }) => {
    if (isDirectoryCategory(params.city)) {
      throw redirect({
        to: "/sdcounty/$slug",
        params: { slug: params.slug },
        statusCode: 301,
      });
    }
    throw redirect({ to: "/sdcounty", statusCode: 301 });
  },
  component: () => null,
});
