import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { getCityBySlug } from "@/lib/cities.functions";

export const Route = createFileRoute("/$city")({
  loader: async ({ params }) => {
    const city = await getCityBySlug({ data: { slug: params.city } });
    if (!city || !city.is_active) throw notFound();
    return { city };
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-8 text-center bg-[#f5f6f8]">
      <div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-600">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-8 text-center bg-[#f5f6f8]">
      <div>
        <h1 className="text-2xl font-bold mb-2">City not found</h1>
        <p className="text-sm text-gray-600">
          We don't have a page for this city yet.{" "}
          <a href="/" className="text-blue-600 underline">Browse active cities</a>.
        </p>
      </div>
    </div>
  ),
  component: () => <Outlet />,
});
