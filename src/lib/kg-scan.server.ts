import type { Json } from "@/integrations/supabase/types";

// Server-only AI Visibility Knowledge Graph pipeline.
// 1 Gather (Google Places + Firecrawl) -> 2 Normalize (AI) -> 3 Schema (JSON-LD)
// -> 4 Q&A (AI) -> 5 Score (deterministic, in code) -> 6 Publish (Supabase).

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

export type PlacesRaw = {
  placeId: string | null;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number;
  photoCount: number;
  photosReported: boolean;
  hours: string[];
  types: string[];
  priceLevel: string | null;
  reviews: string[];
};

export type NormalizedFacts = {
  hours: Record<string, string>;
  services: string[];
  serviceArea: string | null;
  pricingSignals: string | null;
  reviewSentiment: string | null;
  differentiators: string[];
  summary: string | null;
};

export type QaPair = {
  question: string;
  answer: string | null;
  answered: boolean;
  flag: "ok" | "insufficient_data";
  missingData: string | null;
};

export type ScoreBreakdown = {
  score: number;
  grade: string;
  gradeLabel: string;
  completeness: number;
  schema: number;
  answerability: number;
  reviews: number;
  fieldsFound: string[];
  fieldsMissing: string[];
  weakestComponent: string;
  weakestSummary: string;
};

export async function assertAdminUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

// ---------------- Step 1: Gather ----------------

export async function fetchPlaceDetails(
  businessName: string,
  locality: string,
): Promise<PlacesRaw | null> {
  const apiKey = process.env["GOOGLE_PLACES_API_KEY"];
  if (!apiKey) return null;

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.addressComponents",
    "places.location",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.photos",
    "places.regularOpeningHours",
    "places.types",
    "places.priceLevel",
    "places.reviews",
  ].join(",");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({
      textQuery: `${businessName} ${locality}`.trim(),
      maxResultCount: 1,
    }),
  });

  if (!res.ok) {
    console.error("[kg-scan] places failed", res.status, (await res.text()).slice(0, 300));
    return null;
  }

  const json = (await res.json()) as { places?: Array<Record<string, unknown>> };
  const p = json.places?.[0];
  if (!p) return null;

  // Text Search omits photos/reviews on some tiers — pull them from Place Details.
  let details: Record<string, unknown> = {};
  const placeId = (p["id"] as string) ?? null;
  if (placeId) {
    try {
      const dres = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "photos,reviews,regularOpeningHours" },
      });
      if (dres.ok) details = (await dres.json()) as Record<string, unknown>;
    } catch {
      /* details are optional */
    }
  }

  const comps = (p["addressComponents"] as Array<{ longText?: string; shortText?: string; types?: string[] }>) ?? [];
  const comp = (type: string, short = false) => {
    const c = comps.find((x) => (x.types ?? []).includes(type));
    return (short ? c?.shortText : c?.longText) ?? null;
  };
  const loc = p["location"] as { latitude?: number; longitude?: number } | undefined;
  const hoursSrc = (p["regularOpeningHours"] ?? details["regularOpeningHours"]) as
    | { weekdayDescriptions?: string[] }
    | undefined;
  const hours = hoursSrc?.weekdayDescriptions ?? [];
  const reviews = (((p["reviews"] ?? details["reviews"]) as Array<{ text?: { text?: string } }>) ?? [])
    .map((r) => r.text?.text ?? "")
    .filter(Boolean)
    .slice(0, 5);
  const photos = ((p["photos"] ?? details["photos"]) as unknown[]) ?? [];

  return {
    placeId,
    name: ((p["displayName"] as { text?: string } | undefined)?.text) ?? null,
    address: (p["formattedAddress"] as string) ?? null,
    city: comp("locality"),
    state: comp("administrative_area_level_1", true),
    zip: comp("postal_code"),
    phone: (p["nationalPhoneNumber"] as string) ?? null,
    website: (p["websiteUri"] as string) ?? null,
    lat: loc?.latitude ?? null,
    lng: loc?.longitude ?? null,
    rating: (p["rating"] as number) ?? null,
    reviewCount: (p["userRatingCount"] as number) ?? 0,
    photoCount: photos.length,
    photosReported: "photos" in p || "photos" in details,
    hours,
    types: (p["types"] as string[]) ?? [],
    priceLevel: (p["priceLevel"] as string) ?? null,
    reviews,
  };
}

export type Source = { url: string; markdown: string };

async function firecrawlScrape(url: string): Promise<Source | null> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) return null;
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    const json = (await res.json()) as { markdown?: string; data?: { markdown?: string } };
    if (!res.ok) return null;
    const md = json.markdown ?? json.data?.markdown ?? "";
    return md ? { url, markdown: md.slice(0, 15000) } : null;
  } catch {
    return null;
  }
}

async function firecrawlSearch(query: string, limit = 4): Promise<Source[]> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) return [];
  try {
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
    });
    const json = (await res.json()) as {
      data?: Array<{ url?: string; markdown?: string; description?: string }>;
      web?: Array<{ url?: string; markdown?: string; description?: string }>;
    };
    if (!res.ok) return [];
    return (json.data ?? json.web ?? [])
      .filter((r) => r.url)
      .map((r) => ({ url: r.url as string, markdown: (r.markdown ?? r.description ?? "").slice(0, 6000) }))
      .filter((r) => r.markdown.length > 30);
  } catch {
    return [];
  }
}

export async function gatherSources(
  businessName: string,
  locality: string,
  website: string | null,
): Promise<Source[]> {
  const sources: Source[] = [];
  if (website) {
    const own = await firecrawlScrape(website);
    if (own) sources.push(own);
  }
  const label = `${businessName} ${locality}`.trim();
  const [profiles, reviews] = await Promise.all([
    firecrawlSearch(`${label} facebook instagram yelp profile services hours`, 4),
    firecrawlSearch(`${label} reviews pricing services`, 4),
  ]);
  sources.push(...profiles, ...reviews);
  return sources;
}

// ---------------- AI helper ----------------

async function aiJson(system: string, user: string): Promise<Record<string, unknown>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`[kg-scan] AI gateway ${res.status}: ${body.slice(0, 500)}`);
    throw new Error(`AI step failed (${res.status}).`);
  }
  const parsed = JSON.parse(body) as { choices?: Array<{ message?: { content?: string } }> };
  const content = parsed.choices?.[0]?.message?.content ?? "";
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI returned an unreadable response.");
  return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
}

// ---------------- Step 2: Normalize ----------------

export async function normalizeFacts(
  businessName: string,
  places: PlacesRaw | null,
  sources: Source[],
): Promise<NormalizedFacts> {
  const corpus = sources
    .map((s, i) => `### SOURCE ${i + 1}: ${s.url}\n${s.markdown}`)
    .join("\n\n")
    .slice(0, 50000);

  const out = await aiJson(
    "You organize raw business data into clean structured fields. Use ONLY facts present in the supplied data. " +
      "Never guess, never invent. If a field has no evidence, return null (or an empty array). Respond with JSON only.",
    `Business: ${businessName}\n\nGOOGLE PLACES DATA:\n${JSON.stringify(places ?? {}, null, 1).slice(0, 8000)}\n\nWEB SOURCES:\n${corpus || "(none)"}\n\nReturn JSON exactly matching:\n{"hours":{"Monday":"9 AM - 5 PM"},"services":string[],"service_area":string|null,"pricing_signals":string|null,"review_sentiment":string|null,"differentiators":string[],"summary":string|null}`,
  );

  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 20) : []);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  let hours: Record<string, string> = {};
  if (out["hours"] && typeof out["hours"] === "object" && !Array.isArray(out["hours"])) {
    hours = Object.fromEntries(
      Object.entries(out["hours"] as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
    );
  }
  // Google's weekday descriptions win when the model found nothing.
  if (!Object.keys(hours).length && places?.hours.length) {
    for (const line of places.hours) {
      const [day, ...rest] = line.split(":");
      if (day && rest.length) hours[day.trim()] = rest.join(":").trim();
    }
  }

  return {
    hours,
    services: arr(out["services"]),
    serviceArea: str(out["service_area"]),
    pricingSignals: str(out["pricing_signals"]),
    reviewSentiment: str(out["review_sentiment"]),
    differentiators: arr(out["differentiators"]),
    summary: str(out["summary"]),
  };
}

// ---------------- Step 3: Schema ----------------

/** Convert human hours ("9 AM - 5 PM", "Open 24 hours") to schema.org 24h ranges. */
function toOpeningHoursSpec(value: string): string | null {
  const v = value.trim();
  if (/closed/i.test(v)) return null;
  if (/24\s*hours/i.test(v)) return "00:00-23:59";
  const m = v.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?/);
  if (!m) return null;
  const to24 = (h: string, min: string | undefined, ap: string) => {
    let hh = parseInt(h, 10) % 12;
    if (ap.toLowerCase() === "p") hh += 12;
    return `${String(hh).padStart(2, "0")}:${min ?? "00"}`;
  };
  return `${to24(m[1]!, m[2], m[3]!)}-${to24(m[4]!, m[5], m[6]!)}`;
}

/**
 * schema.org priceRange expects a compact band ("$$", "$100-$300"), not prose.
 * Free-text pricing signals are mapped when unambiguous, otherwise dropped.
 */
export function toPriceRange(signals: string | null | undefined): string | null {
  if (!signals) return null;
  const s = signals.trim();
  // Already a valid band: $, $$, $$$, $$$$
  const band = s.match(/^\${1,4}$/);
  if (band) return s;
  // Explicit numeric range, e.g. "$100 - $300" or "100-300 USD"
  const range = s.match(/\$?\s*(\d[\d,]*)\s*(?:-|–|to)\s*\$?\s*(\d[\d,]*)/i);
  if (range) return `$${range[1]!.replace(/,/g, "")}-$${range[2]!.replace(/,/g, "")}`;
  // Multiple prices quoted in prose -> derive a min-max band.
  const nums = [...s.matchAll(/\$\s*(\d[\d,]*)/g)].map((m) => Number(m[1]!.replace(/,/g, ""))).filter((n) => n > 0);
  const uniq = [...new Set(nums)];
  if (uniq.length > 1) return `$${Math.min(...uniq)}-$${Math.max(...uniq)}`;
  if (uniq.length === 1) return `$${uniq[0]}`;
  // Qualitative wording -> band
  const l = s.toLowerCase();
  if (/\b(luxury|high[- ]end|premium|upscale)\b/.test(l)) return "$$$";
  if (/\b(budget|affordable|cheap|low[- ]cost|value)\b/.test(l)) return "$";
  if (/\b(moderate|mid[- ]range|competitive|reasonable)\b/.test(l)) return "$$";
  return null;
}

export type SchemaResult = {
  localBusiness: Json | null;
  faqPage: Json | null;
  localValid: boolean;
  faqValid: boolean;
  notes: string[];
};

export function buildSchema(
  business: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    website: string | null;
    lat: number | null;
    lng: number | null;
    rating: number | null;
    reviewCount: number;
  },
  facts: NormalizedFacts,
  qa: QaPair[],
): SchemaResult {
  const notes: string[] = [];

  const openingHours = Object.entries(facts.hours)
    .map(([day, val]) => {
      const spec = toOpeningHoursSpec(val);
      return spec ? `${day.slice(0, 2)} ${spec}` : null;
    })
    .filter((v): v is string => Boolean(v))
    .slice(0, 7);

  const localBusiness: Record<string, Json> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
  };
  if (business.address) {
    localBusiness["address"] = {
      "@type": "PostalAddress",
      streetAddress: business.address,
      addressLocality: business.city,
      addressRegion: business.state,
      postalCode: business.zip,
      addressCountry: "US",
    };
  } else {
    notes.push("No street address found — LocalBusiness address omitted.");
  }
  if (business.lat != null && business.lng != null) {
    localBusiness["geo"] = { "@type": "GeoCoordinates", latitude: business.lat, longitude: business.lng };
  }
  if (business.phone) localBusiness["telephone"] = business.phone;
  else notes.push("No phone number found.");
  if (business.website) localBusiness["url"] = business.website.replace(/\/+$/, "");
  else notes.push("No website found.");
  if (openingHours.length) localBusiness["openingHours"] = openingHours;
  else notes.push("No opening hours found.");
  if (facts.serviceArea) localBusiness["areaServed"] = facts.serviceArea;
  const priceRange = toPriceRange(facts.pricingSignals);
  if (priceRange) localBusiness["priceRange"] = priceRange;
  else if (facts.pricingSignals) notes.push("Pricing signals found but not expressible as a schema.org priceRange — omitted.");
  if (facts.services.length) {
    localBusiness["makesOffer"] = facts.services.slice(0, 12).map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s },
    }));
  }
  if (business.rating != null && business.reviewCount > 0) {
    localBusiness["aggregateRating"] = {
      "@type": "AggregateRating",
      ratingValue: business.rating,
      reviewCount: business.reviewCount,
    };
  } else {
    notes.push("No verified public rating — aggregateRating omitted.");
  }

  // Required-field validation per schema.org / Google rich-result guidance.
  const localValid = Boolean(business.name && business.address && (business.phone || business.website));
  if (!localValid) notes.push("LocalBusiness JSON-LD is incomplete (needs name + address + phone or URL).");

  const answered = qa.filter((q) => q.answered && q.answer);
  const faqPage = answered.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: answered.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: q.answer },
        })),
      }
    : null;
  const faqValid = answered.length >= 2;
  if (!faqValid) notes.push("FAQPage needs at least 2 answered questions to be valid.");

  return { localBusiness, faqPage, localValid, faqValid, notes };
}

// ---------------- Step 4: Q&A ----------------

export async function generateQa(
  businessName: string,
  locality: string,
  facts: NormalizedFacts,
  places: PlacesRaw | null,
): Promise<QaPair[]> {
  const out = await aiJson(
    "You write realistic unbranded buyer questions and answer them using ONLY the supplied facts. " +
      "If the facts do not contain what a question needs, set answered=false, answer=null, flag='insufficient_data' and name the missing data. " +
      "NEVER guess, estimate, or fill gaps from general knowledge. " +
      `IDENTITY PIN: the subject is EXACTLY "${businessName}". When an answer names the business, use that exact string verbatim. ` +
      "Never invent, shorten, translate, or substitute a different trade name, category label, or brand — not even one that appears inside the facts, services, or reviews. " +
      "Respond with JSON only.",
    `Business: ${businessName}${locality ? ` (${locality})` : ""}\n\nFACTS:\n${JSON.stringify(
      {
        hours: facts.hours,
        services: facts.services,
        service_area: facts.serviceArea,
        pricing_signals: facts.pricingSignals,
        review_sentiment: facts.reviewSentiment,
        differentiators: facts.differentiators,
        rating: places?.rating ?? null,
        review_count: places?.reviewCount ?? 0,
        address: places?.address ?? null,
        phone: places?.phone ?? null,
      },
      null,
      1,
    )}\n\nWrite exactly 10 questions a real buyer would type or ask an AI assistant (e.g. "who's the best emergency plumber in National City open weekends"). Cover hours/availability, services, service area, pricing, quality/reviews, and what makes them different.\n\nReturn JSON exactly matching:\n{"qa":[{"question":string,"answer":string|null,"answered":boolean,"flag":"ok"|"insufficient_data","missing_data":string|null}]}`,
  );

  const raw = Array.isArray(out["qa"]) ? (out["qa"] as Array<Record<string, unknown>>) : [];
  return raw.slice(0, 10).map((q) => {
    const answer = typeof q["answer"] === "string" && q["answer"].trim() ? q["answer"].trim() : null;
    const answered = q["answered"] === true && Boolean(answer) && q["flag"] !== "insufficient_data";
    return {
      question: String(q["question"] ?? "").slice(0, 300),
      answer: answered ? answer : null,
      answered,
      flag: answered ? ("ok" as const) : ("insufficient_data" as const),
      missingData:
        typeof q["missing_data"] === "string" && q["missing_data"].trim() ? q["missing_data"].trim() : null,
    };
  });
}

// ---------------- Step 5: Score ----------------

const GRADE_LABELS: Record<string, string> = {
  A: "AI-ready — answer engines can confidently recommend you",
  B: "Strong, with a few gaps",
  C: "Visible but incomplete — missing info is limiting your reach",
  D: "Weak signal — most AI engines can't answer basic questions about you",
  F: "Not AI-visible — critical info is missing",
};

export function computeScore(input: {
  facts: NormalizedFacts;
  places: PlacesRaw | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  schema: SchemaResult;
  qa: QaPair[];
}): ScoreBreakdown {
  const { facts, places, schema, qa } = input;

  // Data Completeness — 8 key fields, 25 pts.
  const fields: Array<[string, boolean]> = [
    ["hours", Object.keys(facts.hours).length > 0],
    ["services list", facts.services.length > 0],
    ["service area", Boolean(facts.serviceArea)],
    ["pricing signals", Boolean(facts.pricingSignals)],
    ["phone", Boolean(input.phone)],
    ["address", Boolean(input.address)],
    ["website", Boolean(input.website)],
  ];
  // Photos only count when Google actually reports them for this account tier;
  // otherwise the field is unknown and is dropped from the denominator.
  const photosKnown = places?.photosReported ?? false;
  if (photosKnown) fields.push(["photos", (places?.photoCount ?? 0) > 0]);
  const found = fields.filter(([, ok]) => ok);
  const completeness = (found.length / fields.length) * 25;

  // Schema Coverage — 25 pts.
  const schemaScore = (schema.localBusiness && schema.localValid ? 15 : 0) + (schema.faqPage && schema.faqValid ? 10 : 0);

  // Answer-ability — 30 pts.
  const answeredCount = qa.filter((q) => q.answered).length;
  const answerability = (answeredCount / 10) * 30;

  // Review Signal — 20 pts.
  const count = places?.reviewCount ?? 0;
  const rating = places?.rating ?? 0;
  const countFactor = Math.min(count / 20, 1);
  const ratingFactor = rating > 0 ? Math.max(0, Math.min((rating - 3) / 1.5, 1)) : 0;
  const reviews = count === 0 ? 0 : 20 * countFactor * ratingFactor;

  const score = Math.max(0, Math.min(100, Math.round(completeness + schemaScore + answerability + reviews)));
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  const components = [
    { key: "Data Completeness", got: completeness, max: 25 },
    { key: "Schema Coverage", got: schemaScore, max: 25 },
    { key: "Answer-ability", got: answerability, max: 30 },
    { key: "Review Signal", got: reviews, max: 20 },
  ];
  const weakest = components.reduce((a, b) => (a.got / a.max <= b.got / b.max ? a : b));

  const missingFields = fields.filter(([, ok]) => !ok).map(([label]) => label);
  const missingForQa = [
    ...new Set(qa.filter((q) => !q.answered && q.missingData).map((q) => q.missingData as string)),
  ].slice(0, 3);

  let weakestSummary: string;
  switch (weakest.key) {
    case "Data Completeness":
      weakestSummary = `Your biggest gap: Data Completeness — ${found.length} of ${fields.length} key fields were found${
        missingFields.length ? `. Missing: ${missingFields.join(", ")}` : ""
      }.`;
      break;
    case "Schema Coverage":
      weakestSummary = `Your biggest gap: Schema Coverage — ${
        schema.localValid ? "LocalBusiness markup is valid" : "LocalBusiness markup is incomplete"
      } and ${schema.faqValid ? "FAQ markup is valid" : "FAQ markup could not be validated"}. ${schema.notes.join(" ")}`.trim();
      break;
    case "Answer-ability":
      weakestSummary = `Your biggest gap: Answer-ability — ${answeredCount} of 10 buyer questions could be answered from real scanned facts${
        missingForQa.length ? `. The unanswered ones needed: ${missingForQa.join("; ")}` : ""
      }.`;
      break;
    default:
      weakestSummary =
        count === 0
          ? "Your biggest gap: Review Signal — no public reviews were found, so AI engines have no third-party proof to cite."
          : `Your biggest gap: Review Signal — ${count} review${count === 1 ? "" : "s"} at a ${rating.toFixed(
              1,
            )} rating. 20+ reviews at 4.5+ earns full credit.`;
  }

  return {
    score,
    grade,
    gradeLabel: GRADE_LABELS[grade] ?? "",
    completeness: Math.round(completeness * 10) / 10,
    schema: Math.round(schemaScore * 10) / 10,
    answerability: Math.round(answerability * 10) / 10,
    reviews: Math.round(reviews * 10) / 10,
    fieldsFound: found.map(([l]) => l),
    fieldsMissing: missingFields,
    weakestComponent: weakest.key,
    weakestSummary,
  };
}

// ---------------- Steps 1-6 orchestration + persistence ----------------

export type ScanResult = {
  businessId: string;
  places: PlacesRaw | null;
  facts: NormalizedFacts;
  schema: SchemaResult;
  qa: QaPair[];
  score: ScoreBreakdown;
  sources: string[];
  needsManualValidation: boolean;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export async function runKnowledgeScan(opts: {
  businessName: string;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  businessId?: string | null;
}): Promise<ScanResult> {
  const locality = [opts.city, opts.state].filter(Boolean).join(", ");

  // 1 Gather
  const places = await fetchPlaceDetails(opts.businessName, locality);
  const website = opts.website?.trim() || places?.website || null;
  const sources = await gatherSources(opts.businessName, locality, website);

  // 2 Clean up
  const facts = await normalizeFacts(opts.businessName, places, sources);

  // 4 Generate Q&A (needed before FAQ schema)
  const qa = await generateQa(opts.businessName, locality, facts, places);

  const address = places?.address ?? null;
  const phone = places?.phone ?? null;

  // 3 Build schema
  const schema = buildSchema(
    {
      name: places?.name ?? opts.businessName,
      address,
      city: places?.city ?? opts.city ?? null,
      state: places?.state ?? opts.state ?? null,
      zip: places?.zip ?? null,
      phone,
      website,
      lat: places?.lat ?? null,
      lng: places?.lng ?? null,
      rating: places?.rating ?? null,
      reviewCount: places?.reviewCount ?? 0,
    },
    facts,
    qa,
  );

  // 5 Score
  const score = computeScore({ facts, places, website, address, phone, schema, qa });

  const needsManualValidation = !schema.localValid || !schema.faqValid || schema.notes.length > 0;

  // 6 Publish (saved as draft for admin review)
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const row = {
    name: places?.name ?? opts.businessName,
    slug: slugify(`${opts.businessName}-${places?.city ?? opts.city ?? ""}`),
    address,
    city: places?.city ?? opts.city ?? null,
    state: places?.state ?? opts.state ?? null,
    zip: places?.zip ?? null,
    phone,
    website,
    google_place_id: places?.placeId ?? null,
    lat: places?.lat ?? null,
    lng: places?.lng ?? null,
    rating: places?.rating ?? null,
    review_count: places?.reviewCount ?? 0,
    photo_count: places?.photoCount ?? 0,
    localbusiness_jsonld: schema.localBusiness,
    faq_jsonld: schema.faqPage,
    schema_valid: schema.localValid && schema.faqValid,
    schema_notes: schema.notes.join(" "),
    needs_manual_validation: needsManualValidation,
    score: score.score,
    grade: score.grade,
    score_completeness: score.completeness,
    score_schema: score.schema,
    score_answerability: score.answerability,
    score_reviews: score.reviews,
    weakest_component: score.weakestComponent,
    weakest_summary: score.weakestSummary,
    last_scanned_at: new Date().toISOString(),
  };

  let businessId = opts.businessId ?? null;
  if (businessId) {
    const { error } = await supabaseAdmin.from("kg_businesses").update(row).eq("id", businessId);
    if (error) throw new Error(`Save failed: ${error.message}`);
  } else {
    // Re-scanning by name must update the existing record, not create a duplicate slug.
    const { data: existing } = await supabaseAdmin
      .from("kg_businesses")
      .select("id")
      .eq("slug", row.slug)
      .maybeSingle();
    if (existing?.id) {
      businessId = existing.id as string;
      const { error } = await supabaseAdmin.from("kg_businesses").update(row).eq("id", businessId);
      if (error) throw new Error(`Save failed: ${error.message}`);
    } else {
      const { data, error } = await supabaseAdmin
        .from("kg_businesses")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(`Save failed: ${error.message}`);
      businessId = data.id as string;
    }
  }

  await supabaseAdmin.from("business_facts").upsert(
    {
      business_id: businessId,
      hours: facts.hours as unknown as Json,
      services: facts.services,
      service_area: facts.serviceArea,
      pricing_signals: facts.pricingSignals,
      review_sentiment: facts.reviewSentiment,
      differentiators: facts.differentiators,
      summary: facts.summary,
      raw_places: places as unknown as Json,
      source_urls: [...new Set(sources.map((s) => s.url))].slice(0, 12),
    },
    { onConflict: "business_id" },
  );

  await supabaseAdmin.from("qa_pairs").delete().eq("business_id", businessId);
  if (qa.length) {
    await supabaseAdmin.from("qa_pairs").insert(
      qa.map((q, i) => ({
        business_id: businessId as string,
        question: q.question,
        answer: q.answer,
        answered: q.answered,
        flag: q.flag,
        missing_data: q.missingData,
        sort_order: i,
      })),
    );
  }

  return {
    businessId: businessId as string,
    places,
    facts,
    schema,
    qa,
    score,
    sources: [...new Set(sources.map((s) => s.url))].slice(0, 12),
    needsManualValidation,
  };
}
