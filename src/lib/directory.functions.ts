import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DIRECTORY_CATEGORY_SLUGS } from "@/lib/directory-categories";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DirectoryCategory, DirectoryFaq, DirectoryPlace } from "@/lib/directory-categories";

const PLACE_COLUMNS =
  "id, slug, category, name, city, state, zip, address, lat, lng, phone, website, booking_url, cuisines, price_range, hours, attributes, description, summary, rating, review_count, image_url, source_urls, last_crawled_at, status, ad_id";

function toPlace(row: Record<string, unknown>): DirectoryPlace {
  return {
    ...(row as unknown as DirectoryPlace),
    cuisines: (row.cuisines as string[]) ?? [],
    source_urls: (row.source_urls as string[]) ?? [],
    hours: (row.hours as Record<string, string>) ?? {},
    attributes: (row.attributes as Record<string, import("@/lib/directory-categories").JsonValue>) ?? {},
  };
}

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** Registry-derived so new categories need no server code changes. */
const categorySchema = z.enum(DIRECTORY_CATEGORY_SLUGS);

// ---------------- Public reads ----------------

export const listDirectoryPlaces = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ category: categorySchema }).parse(d))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { data: rows, error } = await supabase
      .from("food_places")
      .select(PLACE_COLUMNS)
      .eq("category", data.category)
      .eq("status", "published")
      .order("name", { ascending: true });
    if (error) {
      console.error("[directory] listDirectoryPlaces failed", error.message);
      return { places: [] as DirectoryPlace[] };
    }
    return { places: (rows ?? []).map((r) => toPlace(r as Record<string, unknown>)) };
  });

export const getDirectoryPlace = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ category: categorySchema, slug: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { data: row } = await supabase
      .from("food_places")
      .select(PLACE_COLUMNS)
      .eq("category", data.category)
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!row) return { place: null, faqs: [] as DirectoryFaq[] };
    const place = toPlace(row as Record<string, unknown>);

    // Resolve the ad image (stored as a raw storage path) to a real URL so the
    // ad image renders on the knowledge-graph listing page. Matches the pattern
    // used by ads.functions attachUrls. Already-URL paths pass through unchanged.
    const img = place.image_url?.trim();
    if (img && !/^(https?:)?\//i.test(img)) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin.storage
        .from("ad-uploads")
        .createSignedUrl(img, 60 * 60 * 24 * 7);
      if (data?.signedUrl) place.image_url = data.signedUrl;
    }

    const { data: faqs } = await supabase
      .from("food_place_faqs")
      .select("question, answer")
      .eq("place_id", place.id)
      .order("sort_order", { ascending: true });
    return { place, faqs: (faqs ?? []) as DirectoryFaq[] };
  });

// ---------------- Admin ----------------

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

export const adminListDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: places }, { data: runs }] = await Promise.all([
      supabaseAdmin
        .from("food_places")
        .select(PLACE_COLUMNS)
        .order("updated_at", { ascending: false })
        .limit(300),
      supabaseAdmin
        .from("food_crawl_runs")
        .select("id, place_id, category, triggered_by, status, started_at, finished_at, errors")
        .order("started_at", { ascending: false })
        .limit(25),
    ]);
    return {
      places: (places ?? []).map((r) => toPlace(r as Record<string, unknown>)),
      runs: runs ?? [],
    };
  });

/** Ads eligible for a knowledge-base page that don't have one yet. */
export const adminListResearchableAds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { categoryForIndustry } = await import("@/lib/directory-categories");
    const { data: ads } = await supabaseAdmin
      .from("ads")
      .select("id, business_name, industry, website_url, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(500);
    const { data: places } = await supabaseAdmin.from("food_places").select("ad_id");
    const have = new Set((places ?? []).map((p) => p.ad_id));
    return {
      ads: (ads ?? [])
        .map((a) => ({ ...a, category: categoryForIndustry(a.industry) }))
        .filter((a) => a.category && !have.has(a.id)),
    };
  });

export const adminResearchAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ adId: z.string().uuid(), category: categorySchema })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { researchAd } = await import("@/lib/directory.server");
    return researchAd({
      adId: data.adId,
      category: data.category as DirectoryCategory,
      triggeredBy: "admin",
    });
  });

export const adminUpdatePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z.object({
          name: z.string().min(1).optional(),
          status: z.enum(["draft", "published"]).optional(),
          description: z.string().nullable().optional(),
          summary: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
          address: z.string().nullable().optional(),
          website: z.string().nullable().optional(),
          booking_url: z.string().nullable().optional(),
          price_range: z.string().nullable().optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("food_places")
      .update({ ...data.patch, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeletePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("food_place_faqs").delete().eq("place_id", data.id);
    const { error } = await supabaseAdmin.from("food_places").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
