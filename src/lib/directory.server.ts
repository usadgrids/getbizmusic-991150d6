// Server-only research pipeline for the AEO/GEO business knowledge base.
// Firecrawl scrapes the web, Lovable AI normalizes the result, and we store a
// clean typed record + Q&A pairs in the database.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export type DirectoryCategory = "food" | "beauty";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type ScrapeResult = { url: string; markdown: string };

async function firecrawlScrape(url: string): Promise<ScrapeResult | null> {
  const apiKey = process.env["FIRECRAWL_API_KEY"];
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured.");
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    const json = (await res.json()) as {
      markdown?: string;
      data?: { markdown?: string };
      error?: string;
    };
    if (!res.ok) {
      console.error(`[directory] Firecrawl scrape failed [${res.status}]`, json?.error);
      return null;
    }
    const markdown = json.markdown ?? json.data?.markdown ?? "";
    return markdown ? { url, markdown: markdown.slice(0, 20000) } : null;
  } catch (err) {
    console.error("[directory] Firecrawl scrape error", err);
    return null;
  }
}

async function firecrawlSearch(query: string, limit = 4): Promise<ScrapeResult[]> {
  const apiKey = process.env["FIRECRAWL_API_KEY"];
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured.");
  try {
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    const json = (await res.json()) as {
      data?: Array<{ url?: string; markdown?: string; description?: string }>;
      web?: Array<{ url?: string; markdown?: string; description?: string }>;
      error?: string;
    };
    if (!res.ok) {
      console.error(`[directory] Firecrawl search failed [${res.status}]`, json?.error);
      return [];
    }
    const rows = json.data ?? json.web ?? [];
    return rows
      .filter((r) => r.url)
      .map((r) => ({
        url: r.url as string,
        markdown: (r.markdown ?? r.description ?? "").slice(0, 8000),
      }))
      .filter((r) => r.markdown.length > 40);
  } catch (err) {
    console.error("[directory] Firecrawl search error", err);
    return [];
  }
}

export type NormalizedPlace = {
  name: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  booking_url: string | null;
  cuisines: string[];
  price_range: string | null;
  hours: Record<string, string>;
  attributes: Record<string, unknown>;
  description: string | null;
  summary: string | null;
  rating: number | null;
  review_count: number | null;
  faqs: Array<{ question: string; answer: string }>;
};

function categoryGuidance(category: DirectoryCategory): string {
  if (category === "beauty") {
    return [
      'This is a beauty business (hair salon, barbershop, nail salon, day spa, lash/brow bar).',
      '"cuisines" should instead hold the SERVICE TYPES offered, e.g. ["haircut","balayage","fade","gel manicure","pedicure","lash extensions","facials"].',
      '"attributes" should capture: walk_ins_accepted, appointment_required, booking_url, kid_friendly, parking, payment_types, languages_spoken, specialties, brands_used, wheelchair_accessible, staff_count.',
      'Q&A should answer things real customers ask: walk-in availability, price of a common service, Sunday hours, whether they do a specific technique, parking, kids cuts.',
    ].join(" ");
  }
  return [
    "This is a restaurant or food business.",
    '"cuisines" should hold cuisine types, e.g. ["filipino","bbq","seafood"].',
    '"attributes" should capture: dine_in, takeout, delivery, catering, outdoor_seating, reservations, parking, payment_types, dietary (vegan/gluten_free/halal), alcohol, kid_friendly, wheelchair_accessible, menu_highlights.',
    "Q&A should answer things real diners ask: vegan options, Sunday hours, delivery, parking, price of a popular dish, reservations.",
  ].join(" ");
}

async function normalizeWithAI(
  category: DirectoryCategory,
  businessName: string,
  sources: ScrapeResult[],
): Promise<NormalizedPlace | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

  const corpus = sources
    .map((s, i) => `### SOURCE ${i + 1}: ${s.url}\n${s.markdown}`)
    .join("\n\n")
    .slice(0, 60000);

  const system = [
    "You extract accurate, structured local-business facts for a public directory that AI answer engines will cite.",
    categoryGuidance(category),
    "Rules: never invent facts. Use null or omit when a source does not state it. Hours keys must be monday..sunday with values like '9:00 AM - 7:00 PM' or 'Closed'.",
    "Write 6-10 FAQ pairs. Each answer must be one to three plain sentences that stand alone when quoted, and must name the business.",
    "Respond with JSON only, no markdown fences.",
  ].join(" ");

  const shape = `{"name":string,"city":string|null,"state":string|null,"zip":string|null,"address":string|null,"phone":string|null,"website":string|null,"booking_url":string|null,"cuisines":string[],"price_range":string|null,"hours":object,"attributes":object,"description":string,"summary":string,"rating":number|null,"review_count":number|null,"faqs":[{"question":string,"answer":string}]}`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Business: ${businessName}\nReturn JSON matching exactly this shape:\n${shape}\n\nSOURCES:\n${corpus}`,
          },
        ],
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`[directory] AI gateway failed [${res.status}]: ${body}`);
      throw new Error(`AI normalization failed (${res.status}).`);
    }
    const parsed = JSON.parse(body) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = parsed.choices?.[0]?.message?.content ?? "";
    const jsonText = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const out = JSON.parse(jsonText.slice(start, end + 1)) as Partial<NormalizedPlace>;
    return {
      name: out.name || businessName,
      city: out.city ?? null,
      state: out.state ?? null,
      zip: out.zip ?? null,
      address: out.address ?? null,
      phone: out.phone ?? null,
      website: out.website ?? null,
      booking_url: out.booking_url ?? null,
      cuisines: Array.isArray(out.cuisines) ? out.cuisines.slice(0, 24).map(String) : [],
      price_range: out.price_range ?? null,
      hours: (out.hours as Record<string, string>) ?? {},
      attributes: (out.attributes as Record<string, unknown>) ?? {},
      description: out.description ?? null,
      summary: out.summary ?? null,
      rating: typeof out.rating === "number" ? out.rating : null,
      review_count: typeof out.review_count === "number" ? out.review_count : null,
      faqs: Array.isArray(out.faqs)
        ? out.faqs
            .filter((f) => f && f.question && f.answer)
            .slice(0, 12)
            .map((f) => ({ question: String(f.question), answer: String(f.answer) }))
        : [],
    };
  } catch (err) {
    console.error("[directory] AI normalization error", err);
    throw new Error(
      `AI normalization failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function uniqueSlug(category: DirectoryCategory, base: string, placeId?: string) {
  let slug = base || "listing";
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data } = await supabaseAdmin
      .from("food_places")
      .select("id")
      .eq("category", category)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === placeId) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

/**
 * Research one approved ad and upsert its knowledge-base record.
 */
export async function researchAd(opts: {
  adId: string;
  category: DirectoryCategory;
  triggeredBy: string;
  autoPublish?: boolean;
}): Promise<{ ok: boolean; placeId?: string; error?: string }> {
  const { adId, category, triggeredBy } = opts;

  const { data: ad, error: adErr } = await supabaseAdmin
    .from("ads")
    .select("id, business_name, website_url, image_url, city_id, cities(name, state)")
    .eq("id", adId)
    .maybeSingle();

  if (adErr || !ad) return { ok: false, error: adErr?.message ?? "Ad not found." };

  const { data: run } = await supabaseAdmin
    .from("food_crawl_runs")
    .insert({ triggered_by: triggeredBy, status: "running", category })
    .select("id")
    .maybeSingle();
  const runId = run?.id;

  const finish = async (status: string, errors?: string, placeId?: string) => {
    if (runId) {
      await supabaseAdmin
        .from("food_crawl_runs")
        .update({
          status,
          errors: errors ?? null,
          finished_at: new Date().toISOString(),
          place_id: placeId ?? null,
        })
        .eq("id", runId);
    }
  };

  try {
    const cityRow = (ad as { cities?: { name?: string; state?: string } | null }).cities ?? null;
    const locality = [cityRow?.name, cityRow?.state].filter(Boolean).join(", ");
    const label = locality ? `${ad.business_name} ${locality}` : ad.business_name;

    const sources: ScrapeResult[] = [];
    if (ad.website_url) {
      const own = await firecrawlScrape(ad.website_url);
      if (own) sources.push(own);
    }
    const searched = await firecrawlSearch(
      `${label} ${category === "beauty" ? "salon barbershop nail spa" : "restaurant menu"} hours address reviews`,
      4,
    );
    sources.push(...searched);

    if (sources.length === 0) {
      await finish("failed", "No web sources could be scraped for this business.");
      return { ok: false, error: "No web sources could be scraped for this business." };
    }

    const normalized = await normalizeWithAI(category, label, sources);
    if (!normalized) {
      await finish("failed", "AI could not structure the scraped content.");
      return { ok: false, error: "AI could not structure the scraped content." };
    }

    const { data: existing } = await supabaseAdmin
      .from("food_places")
      .select("id, slug, status")
      .eq("ad_id", adId)
      .eq("category", category)
      .maybeSingle();

    const slug =
      existing?.slug ?? (await uniqueSlug(category, slugify(normalized.name || ad.business_name)));

    const payload = {
      ad_id: adId,
      category,
      slug,
      name: normalized.name || ad.business_name,
      city: normalized.city ?? cityRow?.name ?? null,
      state: normalized.state ?? cityRow?.state ?? null,
      zip: normalized.zip,
      address: normalized.address,
      phone: normalized.phone,
      website: normalized.website ?? ad.website_url ?? null,
      booking_url: normalized.booking_url,
      cuisines: normalized.cuisines,
      price_range: normalized.price_range,
      hours: normalized.hours as unknown as Json,
      attributes: normalized.attributes as unknown as Json,
      description: normalized.description,
      summary: normalized.summary,
      rating: normalized.rating,
      review_count: normalized.review_count,
      image_url: ad.image_url,
      source_urls: sources.map((s) => s.url),
      last_crawled_at: new Date().toISOString(),
      status: existing?.status ?? (opts.autoPublish === false ? "draft" : "published"),
      updated_at: new Date().toISOString(),
    };

    let placeId = existing?.id;
    if (placeId) {
      const { error } = await supabaseAdmin.from("food_places").update(payload).eq("id", placeId);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabaseAdmin
        .from("food_places")
        .insert(payload)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      placeId = data?.id;
    }

    if (placeId && normalized.faqs.length) {
      await supabaseAdmin.from("food_place_faqs").delete().eq("place_id", placeId);
      await supabaseAdmin.from("food_place_faqs").insert(
        normalized.faqs.map((f, i) => ({
          place_id: placeId!,
          question: f.question,
          answer: f.answer,
          sort_order: i,
        })),
      );
    }

    await finish("completed", undefined, placeId);
    return { ok: true, placeId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finish("failed", message);
    return { ok: false, error: message };
  }
}

/** Re-crawl the stalest published places for one or both categories. */
export async function refreshStalePlaces(limit = 5) {
  const { data: places } = await supabaseAdmin
    .from("food_places")
    .select("id, ad_id, category")
    .order("last_crawled_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const place of places ?? []) {
    const res = await researchAd({
      adId: place.ad_id,
      category: (place.category as DirectoryCategory) ?? "food",
      triggeredBy: "weekly-refresh",
    });
    results.push({ id: place.id, ok: res.ok, error: res.error });
  }
  return results;
}
