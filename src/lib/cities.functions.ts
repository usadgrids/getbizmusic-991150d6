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
      city_name: z.string().min(2).max(120),
      state: z.string().min(1).max(60).optional(),
      email: z.string().email().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("city_requests").insert({
      city_name: data.city_name,
      state: data.state ?? null,
      email: data.email ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
