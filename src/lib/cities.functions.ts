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

export const getActiveCities = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cities, error } = await supabaseAdmin
    .from("cities")
    .select("id,slug,name,state,is_active,sort_order,hero_tagline,hero_background_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  const nowIso = new Date().toISOString();
  const results: CityWithCount[] = [];
  for (const c of (cities ?? []) as City[]) {
    const { count } = await supabaseAdmin
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("city_id", c.id)
      .gt("expires_at", nowIso);
    results.push({ ...c, ad_count: count ?? 0 });
  }
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
