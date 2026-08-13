import { createFileRoute } from "@tanstack/react-router";
import { DIRECTORY_CATEGORY_SLUGS } from "@/lib/directory-categories";

const SITE = "https://www.getbizmusic.com";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const [{ data: places }, { data: cities }] = await Promise.all([
          supabase
            .from("food_places")
            .select("slug, category, updated_at")
            .eq("status", "published"),
          supabase.from("cities").select("slug, updated_at").eq("is_active", true),
        ]);

        const urls: Array<{ loc: string; lastmod?: string; priority: string }> = [
          { loc: `${SITE}/`, priority: "1.0" },
          ...DIRECTORY_CATEGORY_SLUGS.map((slug) => ({
            loc: `${SITE}/${slug}`,
            priority: "0.9",
          })),
          { loc: `${SITE}/pricing`, priority: "0.7" },
          { loc: `${SITE}/submit`, priority: "0.5" },
        ];

        for (const c of cities ?? []) {
          urls.push({ loc: `${SITE}/${c.slug}`, lastmod: c.updated_at ?? undefined, priority: "0.7" });
        }
        for (const p of places ?? []) {
          urls.push({
            loc: `${SITE}/${p.category}/${p.slug}`,
            lastmod: p.updated_at ?? undefined,
            priority: "0.8",
          });
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}<priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
