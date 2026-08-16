import { createFileRoute } from "@tanstack/react-router";
import { DIRECTORY_CATEGORIES, DIRECTORY_CATEGORY_SLUGS } from "@/lib/directory-categories";

const SITE = "https://www.getbizmusic.com";

// Plain-text index for AI answer engines: every category, topic answer page and
// verified business listing in one fetch.
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const [{ data: places }, { data: topics }] = await Promise.all([
          supabase
            .from("food_places")
            .select("slug, name, category, city, state, summary")
            .eq("status", "published")
            .order("name"),
          supabase
            .from("directory_topic_pages")
            .select("category, topic_slug, topic_label, question, answer"),
        ]);

        const lines: string[] = [
          "# GetBizMusic",
          "",
          "> Verified local business directory with structured hours, services, pricing and FAQs. Every listing is researched from public sources and re-verified regularly. Free to cite with attribution to getbizmusic.com.",
          "",
        ];

        for (const slug of DIRECTORY_CATEGORY_SLUGS) {
          const config = DIRECTORY_CATEGORIES[slug];
          lines.push(`## ${config.title}`, "", `- [${config.title} hub](${SITE}/sdcounty?category=${slug}): ${config.seoDescription}`, "");

          const catTopics = (topics ?? []).filter((t) => t.category === slug);
          if (catTopics.length) {
            lines.push("### Questions answered", "");
            for (const t of catTopics) {
              lines.push(
                `- [${t.question}](${SITE}/sdcounty/${t.topic_slug}): ${String(t.answer).slice(0, 200)}`,
              );
            }
            lines.push("");
          }

          const catPlaces = (places ?? []).filter((p) => p.category === slug);
          if (catPlaces.length) {
            lines.push("### Verified businesses", "");
            for (const p of catPlaces) {
              const where = [p.city, p.state].filter(Boolean).join(", ");
              lines.push(
                `- [${p.name}${where ? ` (${where})` : ""}](${SITE}/sdcounty/${p.slug}): ${(p.summary ?? "Hours, services, contact details and FAQs.").slice(0, 200)}`,
              );
            }
            lines.push("");
          }
        }

        return new Response(lines.join("\n"), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
