import { createFileRoute } from "@tanstack/react-router";

// Machine-readable feed of published directory listings, for AI crawlers.
export const Route = createFileRoute("/api/public/directory/$category")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const category = params.category === "beauty" ? "beauty" : "food";
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const { data, error } = await supabase
          .from("food_places")
          .select(
            "slug, name, city, state, zip, address, phone, website, booking_url, cuisines, price_range, hours, attributes, summary, rating, review_count, last_crawled_at",
          )
          .eq("category", category)
          .eq("status", "published")
          .order("name");
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json(
          {
            source: "https://www.getbizmusic.com",
            category,
            count: data?.length ?? 0,
            generated_at: new Date().toISOString(),
            places: (data ?? []).map((p) => ({
              ...p,
              url: `https://www.getbizmusic.com/${category}/${p.slug}`,
            })),
          },
          { headers: { "Cache-Control": "public, max-age=900" } },
        );
      },
    },
  },
});
