// Server-only AI Visibility Score audit: web research via Firecrawl + scoring
// via the Lovable AI Gateway. Results are returned to the admin UI only.

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

export const DEFAULT_AUDIT_PROMPT =
  "Research everything you can on the internet about this business and give it an AI Optimization score audit. " +
  "Judge how likely AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini) are to find, trust and cite this business " +
  "when someone asks an unbranded question about their product or service in their city. " +
  "Score web presence, reviews and reputation, structured data / schema markup, content and Q&A answerability, " +
  "local NAP consistency, and overall AI citability. Be strict and realistic — most small local businesses score between 25 and 65.";

export type AuditSubscore = { label: string; score: number; note: string };

export type VisibilityAudit = {
  business: string;
  overall: number;
  subscores: AuditSubscore[];
  strengths: string[];
  recommendations: string[];
  gbmStandalone: string[];
  gbmKnowledgeGraph: string[];
  summary: string;
  sources: string[];
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

type Source = { url: string; markdown: string };

function firecrawlKey(): string {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured.");
  return key;
}

async function scrape(url: string): Promise<Source | null> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    const json = (await res.json()) as { markdown?: string; data?: { markdown?: string } };
    if (!res.ok) return null;
    const markdown = json.markdown ?? json.data?.markdown ?? "";
    return markdown ? { url, markdown: markdown.slice(0, 15000) } : null;
  } catch {
    return null;
  }
}

async function search(query: string, limit = 5): Promise<Source[]> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey()}`, "Content-Type": "application/json" },
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

function clamp(n: unknown, fallback = 0): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.max(0, Math.min(100, v));
}

export async function runVisibilityAudit(opts: {
  businessName: string;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  prompt?: string | null;
}): Promise<VisibilityAudit> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

  const locality = [opts.city, opts.state].filter(Boolean).join(", ");
  const label = locality ? `${opts.businessName} ${locality}` : opts.businessName;

  const sources: Source[] = [];
  if (opts.website) {
    const own = await scrape(opts.website);
    if (own) sources.push(own);
  }
  const [general, reviews] = await Promise.all([
    search(`${label} official website hours address phone`, 5),
    search(`${label} reviews google yelp ratings listing`, 5),
  ]);
  sources.push(...general, ...reviews);

  const corpus = sources
    .map((s, i) => `### SOURCE ${i + 1}: ${s.url}\n${s.markdown}`)
    .join("\n\n")
    .slice(0, 60000);

  const system = [
    opts.prompt?.trim() || DEFAULT_AUDIT_PROMPT,
    "You are auditing for AEO/GEO (AI answer engine optimization).",
    "Never invent facts. If evidence for a dimension is missing from the sources, that itself lowers the score — say so in the note.",
    "Respond with JSON only, no markdown fences.",
  ].join(" ");

  const shape = `{"overall":number,"summary":string,"subscores":[{"label":"Web Presence","score":number,"note":string},{"label":"Reviews & Reputation","score":number,"note":string},{"label":"Structured Data / Schema","score":number,"note":string},{"label":"Content & Q&A Answerability","score":number,"note":string},{"label":"Local Consistency (NAP)","score":number,"note":string},{"label":"AI Citability","score":number,"note":string}],"strengths":string[],"recommendations":string[],"gbm_standalone":string[],"gbm_knowledge_graph":string[]}`;

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
          content: `Business: ${label}${opts.website ? `\nWebsite: ${opts.website}` : ""}\n\nReturn JSON matching exactly this shape:\n${shape}\n\nWrite 3-6 strengths and 3-6 general recommendations in plain language a business owner can act on. The "recommendations" array is ONLY for things the business and its own webmaster must do on their own website and business profiles.\n\nCRITICAL — the two GetBizMusic arrays must describe ONLY capabilities GetBizMusic actually delivers. You may ONLY select and phrase items drawn from these exact capability lists, choosing the ones most relevant to this business (rephrase for their industry, but never add capabilities outside the lists):\n\nALLOWED for "gbm_standalone" (no access to their site or profiles needed):\n- Build a business-specific GetBizMusic Knowledge Graph page as a second high-authority, machine-readable source about the business.\n- Publish unbranded "answer pages" for the services/dishes this business offers (e.g. "where to get <service> in <city>") that list this business with real facts.\n- Expose the business in GetBizMusic's AI-crawler feeds: /llms.txt, the public JSON directory feeds, and the XML sitemap.\n- Research and normalize the business's NAP, hours, services and pricing from public web sources, and keep a last-verified date on the page.\n- Internally link the Knowledge Graph page from GetBizMusic category hubs and answer pages so crawlers and AI engines reach it.\n- Create a shareable category ad page for the business for social distribution.\n\nALLOWED for "gbm_knowledge_graph" (implemented inside their unique GetBizMusic URL):\n- LocalBusiness JSON-LD with address, geo coordinates, phone, hours and price range.\n- FAQPage schema answering real customer questions, including unbranded ones.\n- BreadcrumbList schema and canonical metadata.\n- makesOffer / service listings built from their researched services or cuisines.\n- aggregateRating markup when a verified public rating and review count exist.\n- Open Graph / social share metadata plus the business's ad image on the page.\n\nSTRICTLY FORBIDDEN — never mention or imply any of these, because GetBizMusic cannot do them: syndicating or pushing NAP data to Google Business Profile, Yelp, Apple Maps, Bing or any third-party directory; building citation or backlink networks; improving the business's domain authority; editing, auditing or adding schema to the business's own website; managing or responding to reviews; ongoing multi-platform review sentiment monitoring; menu or per-dish ingredient schema; ad spend or paid placement on other platforms.\n\nPut 3-6 items in each array, each a single concise sentence.\n\n${

            corpus ? `SOURCES:\n${corpus}` : "NO WEB SOURCES COULD BE FOUND. Score accordingly (very low web presence)."
          }`,
        },
      ],
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`[ai-audit] AI gateway failed [${res.status}]: ${body}`);
    throw new Error(`AI audit failed (${res.status}).`);
  }

  const parsed = JSON.parse(body) as { choices?: Array<{ message?: { content?: string } }> };
  const content = parsed.choices?.[0]?.message?.content ?? "";
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI audit returned an unreadable response.");
  const out = JSON.parse(content.slice(start, end + 1)) as Partial<VisibilityAudit>;

  const subscores: AuditSubscore[] = Array.isArray(out.subscores)
    ? out.subscores
        .filter((s) => s && s.label)
        .slice(0, 8)
        .map((s) => ({ label: String(s.label), score: clamp(s.score), note: String(s.note ?? "") }))
    : [];

  const overall = out.overall != null
    ? clamp(out.overall)
    : subscores.length
      ? Math.round(subscores.reduce((a, s) => a + s.score, 0) / subscores.length)
      : 0;

  return {
    business: opts.businessName,
    overall,
    subscores,
    strengths: Array.isArray(out.strengths) ? out.strengths.slice(0, 8).map(String) : [],
    recommendations: Array.isArray(out.recommendations)
      ? out.recommendations.slice(0, 8).map(String)
      : [],
    gbmStandalone: Array.isArray((out as Record<string, unknown>).gbm_standalone)
      ? ((out as Record<string, unknown>).gbm_standalone as unknown[]).slice(0, 8).map(String)
      : [],
    gbmKnowledgeGraph: Array.isArray((out as Record<string, unknown>).gbm_knowledge_graph)
      ? ((out as Record<string, unknown>).gbm_knowledge_graph as unknown[]).slice(0, 8).map(String)
      : [],
    summary: typeof out.summary === "string" ? out.summary : "",
    sources: [...new Set(sources.map((s) => s.url))].slice(0, 12),
  };
}
