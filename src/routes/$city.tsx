import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { getCityBySlug } from "@/lib/cities.functions";
import { isDirectoryCategory } from "@/lib/directory-categories";

export const Route = createFileRoute("/$city")({
  loader: async ({ params }) => {
    // Knowledge Graph category slugs (/food, /beauty, …) share this segment with
    // city slugs. Categories win; anything else must resolve to an active city.
    if (isDirectoryCategory(params.city)) return { city: null };
    const city = await getCityBySlug({ data: { slug: params.city } });
    if (!city || !city.is_active) throw notFound();
    return { city };
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-8 text-center bg-[#0F2A4A] text-white">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-white">Something went wrong</h1>
        <p className="text-sm text-white/70">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-8 text-center bg-[#0F2A4A] text-white">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-white">Page not found</h1>
        <p className="text-sm text-white/70">
          We don't have a page for this yet.{" "}
          <a href="/" className="text-[#D4A24C] underline">Browse active cities</a>.
        </p>
      </div>
    </div>
  ),
  component: () => <Outlet />,
});
