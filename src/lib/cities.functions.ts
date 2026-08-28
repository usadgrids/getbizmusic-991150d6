import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type City = {
  id: string;
  slug: string;
  name: string;
  state: string;
  is_active: boolean;
  sort_order: number;
  hero_tagline: string | null;
  hero_background_url: string | null;
};

export type CityWithCount = City & { ad_count: number };

/**
 * Short-lived server-side cache. The city list changes rarely but is read on
 * nearly every page load, so a 90s window removes almost all repeat queries.
 */
let citiesCache: { at: number; data: CityWithCount[] } | null = null;
const CITIES_CACHE_MS = 90_000;

export const getActiveCities = createServerFn({ method: "GET" }).handler(async () => {
  if (citiesCache && Date.now() - citiesCache.at < CITIES_CACHE_MS) {
    return citiesCache.data;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowIso = new Date().toISOString();

  // Two round trips total (cities + all live ads), instead of one count query
  // per city. Counting in memory keeps the exact same return shape.
  const [{ data: cities, error }, { data: liveAds, error: adsError }] = await Promise.all([
    supabaseAdmin
      .from("cities")
      .select("id,slug,name,state,is_active,sort_order,hero_tagline,hero_background_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("ads")
      .select("city_id")
      .eq("status", "active")
      .gt("expires_at", nowIso),
  ]);
  if (error) throw new Error(error.message);
  if (adsError) throw new Error(adsError.message);

  const counts = new Map<string, number>();
  for (const row of (liveAds ?? []) as Array<{ city_id: string | null }>) {
    if (!row.city_id) continue;
    counts.set(row.city_id, (counts.get(row.city_id) ?? 0) + 1);
  }

  const results: CityWithCount[] = ((cities ?? []) as City[]).map((c) => ({
    ...c,
    ad_count: counts.get(c.id) ?? 0,
  }));

  citiesCache = { at: Date.now(), data: results };
  return results;
});


export const getCityBySlug = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("cities")
      .select("id,slug,name,state,is_active,sort_order,hero_tagline,hero_background_url")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as City | null;
  });

export const submitCityRequest = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      city_name: z.string().trim().min(2).max(120),
      state: z.string().trim().min(1).max(60),
      email: z.string().trim().email().max(200),
      zip: z.string().trim().regex(/^\d{5}$/).optional(),
      message: z.string().trim().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("city_requests")
      .insert({
        city_name: data.city_name,
        state: data.state,
        email: data.email,
        zip: data.zip ?? null,
        message: data.message ?? null,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);

    // Fire-and-forget notifications to admin recipients
    try {
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      const recipients = ["request-city@getbizmusic.com", "ralphposadas29@gmail.com"];
      const submittedAt = inserted?.created_at ?? new Date().toISOString();
      const templateData = {
        cityName: data.city_name,
        state: data.state,
        zip: data.zip ?? undefined,
        email: data.email,
        message: data.message ?? undefined,
        submittedAt,
      };
      await Promise.all(
        recipients.map((to) =>
          enqueueTransactionalEmailInternal({
            templateName: "city-request-notification",
            recipientEmail: to,
            templateData,
            idempotencyKey: `city-request-${inserted?.id ?? crypto.randomUUID()}-${to}`,
          }),
        ),
      );
    } catch (e) {
      console.error("city request notification enqueue failed", e);
    }

    return { ok: true };
  });
