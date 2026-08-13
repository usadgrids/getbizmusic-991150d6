import { createFileRoute } from "@tanstack/react-router";

// Machine-readable record for one published listing, for AI crawlers.
export const Route = createFileRoute("/api/public/directory/$category/$slug")({
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
        const { data: place } = await supabase
          .from("food_places")
          .select(
            "id, slug, name, city, state, zip, address, lat, lng, phone, website, booking_url, cuisines, price_range, hours, attributes, description, summary, rating, review_count, source_urls, last_crawled_at",
          )
          .eq("category", category)
          .eq("slug", params.slug)
          .eq("status", "published")
          .maybeSingle();

        if (!place) return Response.json({ error: "Not found" }, { status: 404 });

        const { data: faqs } = await supabase
          .from("food_place_faqs")
          .select("question, answer")
          .eq("place_id", place.id)
          .order("sort_order");

        const { id: _id, ...rest } = place;
        return Response.json(
          {
            source: "https://www.getbizmusic.com",
            url: `https://www.getbizmusic.com/${category}/${place.slug}`,
            category,
            ...rest,
            faqs: faqs ?? [],
          },
          { headers: { "Cache-Control": "public, max-age=900" } },
        );
      },
    },
  },
});
