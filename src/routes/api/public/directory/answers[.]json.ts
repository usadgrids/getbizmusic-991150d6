import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://www.getbizmusic.com";

// Machine-readable feed of every unbranded topic answer page.
export const Route = createFileRoute("/api/public/directory/answers.json")({
  server: {
    handlers: {
      GET: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const [{ data: topics }, { data: places }] = await Promise.all([
          supabase
            .from("directory_topic_pages")
            .select("category, topic_slug, topic_label, question, answer, faqs, updated_at")
            .order("category"),
          supabase
            .from("food_places")
            .select("slug, name, category, city, state, phone, price_range, cuisines, attributes")
            .eq("status", "published"),
        ]);

        const { buildTopics } = await import("@/lib/directory-topics");

        const payload = (topics ?? []).map((t) => {
          const catPlaces = (places ?? []).filter((p) => p.category === t.category);
          const match = buildTopics(
            t.category as never,
            catPlaces as never,
          ).find((x) => x.slug === t.topic_slug);
          return {
            category: t.category,
            topic: t.topic_label,
            url: `${SITE}/${t.category}/${t.topic_slug}`,
            question: t.question,
            answer: t.answer,
            faqs: t.faqs ?? [],
            last_verified: t.updated_at,
            businesses: (match?.places ?? []).map((p) => ({
              name: p.name,
              url: `${SITE}/${t.category}/${p.slug}`,
              city: p.city,
              state: p.state,
              phone: p.phone,
              price_range: p.price_range,
            })),
          };
        });

        return Response.json(
          {
            source: SITE,
            count: payload.length,
            generated_at: new Date().toISOString(),
            answers: payload,
          },
          { headers: { "Cache-Control": "public, max-age=900" } },
        );
      },
    },
  },
});
