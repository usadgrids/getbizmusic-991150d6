import { createFileRoute } from "@tanstack/react-router";

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

        const [{ data: places }, { data: cities }, { data: topics }] = await Promise.all([
          supabase
            .from("food_places")
            .select("slug, category, updated_at, ad_id")
            .eq("status", "published"),
          supabase.from("cities").select("slug, updated_at").eq("is_active", true),
          supabase.from("directory_topic_pages").select("category, topic_slug, updated_at"),
        ]);

        const urls: Array<{ loc: string; lastmod?: string; priority: string }> = [
          { loc: `${SITE}/`, priority: "1.0" },
          { loc: `${SITE}/sdcounty`, priority: "0.9" },
          ...(topics ?? []).map((t) => ({
            loc: `${SITE}/sdcounty/${t.topic_slug}`,
            lastmod: (t.updated_at as string | null) ?? undefined,
            priority: "0.85",
          })),
          { loc: `${SITE}/alliance`, priority: "0.8" },
          { loc: `${SITE}/pricing`, priority: "0.7" },
          { loc: `${SITE}/submit`, priority: "0.5" },
        ];

        for (const c of cities ?? []) {
          urls.push({ loc: `${SITE}/${c.slug}`, lastmod: c.updated_at ?? undefined, priority: "0.7" });
        }
        const adIds = (places ?? []).map((p) => p.ad_id).filter(Boolean) as string[];
        const adNumberById = new Map<string, number>();
        if (adIds.length) {
          const { data: ads } = await supabase
            .from("ads")
            .select("id, ad_number")
            .in("id", adIds)
            .eq("status", "active");
          for (const a of ads ?? []) {
            if (a.ad_number != null) adNumberById.set(a.id as string, a.ad_number as number);
          }
        }
        for (const p of places ?? []) {
          urls.push({
            loc: `${SITE}/sdcounty/${p.slug}`,
            lastmod: p.updated_at ?? undefined,
            priority: "0.8",
          });
          const adNumber = p.ad_id ? adNumberById.get(p.ad_id as string) : undefined;
          if (adNumber != null) {
            urls.push({
              loc: `${SITE}/ad/${adNumber}`,
              lastmod: p.updated_at ?? undefined,
              priority: "0.7",
            });
          }
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
