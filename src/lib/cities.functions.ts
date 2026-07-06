import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

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

// ---------- Admin-only ----------

export const listAllCitiesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("cities")
      .select("id,slug,name,state,is_active,sort_order,hero_tagline,hero_background_url")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as City[];
  });

export const upsertCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      slug: z.string().min(1).max(120).optional(),
      name: z.string().min(1).max(120),
      state: z.string().min(1).max(60),
      is_active: z.boolean().optional().default(true),
      sort_order: z.number().int().optional().default(0),
      hero_tagline: z.string().max(200).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const slug = (data.slug ?? slugify(data.name)) || slugify(data.name);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("cities")
        .update({
          slug,
          name: data.name,
          state: data.state,
          is_active: data.is_active,
          sort_order: data.sort_order,
          hero_tagline: data.hero_tagline ?? null,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("cities")
      .insert({
        slug,
        name: data.name,
        state: data.state,
        is_active: data.is_active,
        sort_order: data.sort_order,
        hero_tagline: data.hero_tagline ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error || !row) throw new Error(error?.message ?? "Insert failed");
    return { ok: true as const, id: (row as { id: string }).id };
  });

export const toggleCityActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("cities").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listCityRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("city_requests")
      .select("id,city_name,state,email,status,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateCityRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "launched", "dismissed"]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("city_requests").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
