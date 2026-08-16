import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// B2B Lead Generation & Email Campaign — Apollo.io + Brevo (admin-only)
// ============================================================================

const ADMIN_EMAIL_ALLOWLIST = new Set<string>([
  "ralphposadas29@gmail.com",
]);

// Targeting defaults (source of truth for the current batch)
const PRIMARY_CITY = "National City";
const PRIMARY_STATE = "CA";
const FOUNDED_YEAR = 2026;
const FALLBACK_ZIPS = ["91950", "91910", "91911", "91913", "91914", "91932", "92173"];
const TARGET_TOTAL = 500;
const BREVO_LIST_NAME = "National City - New Businesses 2026";

// Mailing address + sender for CAN-SPAM footer (user-provided)
const SENDER_NAME = "GetBizMusic.com";
const SENDER_EMAIL = "info@getbizmusic.com";
const MAILING_ADDRESS = "PO Box 254";

async function requireAdminEmail(context: { claims?: { email?: string } | null }) {
  const email = String((context.claims as { email?: string } | null)?.email ?? "").toLowerCase();
  if (!email || !ADMIN_EMAIL_ALLOWLIST.has(email)) {
    throw new Error("Not authorized.");
  }
  return email;
}

// ---------- Apollo helpers ----------
const APOLLO_GATEWAY = "https://connector-gateway.lovable.dev/apollo";

interface ApolloPerson {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  title?: string;
  organization?: {
    id?: string;
    name?: string;
    industry?: string;
    founded_year?: number;
    city?: string;
    state?: string;
    primary_domain?: string;
  } | null;
}

interface ApolloSearchResponse {
  people?: ApolloPerson[];
  pagination?: { page?: number; per_page?: number; total_entries?: number; total_pages?: number };
}

function categorize(industry?: string | null): string {
  const s = (industry ?? "").toLowerCase();
  if (!s) return "other";
  if (s.includes("insurance")) return "insurance_agent";
  if (
    s.includes("restaurant") ||
    s.includes("retail") ||
    s.includes("food") ||
    s.includes("grocery") ||
    s.includes("hospitality") ||
    s.includes("cafe") ||
    s.includes("bakery") ||
    s.includes("automotive")
  ) return "brick_and_mortar";
  return "other";
}

async function apolloSearch(params: {
  page: number;
  perPage: number;
  city?: string;
  state?: string;
  zips?: string[];
  foundedYear: number;
}): Promise<ApolloSearchResponse> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const apolloKey = process.env.APOLLO_API_KEY;
  if (!lovableKey || !apolloKey) throw new Error("Apollo credentials missing.");

  const url = new URL(`${APOLLO_GATEWAY}/api/v1/mixed_people/search`);
  const qp = new URLSearchParams();
  qp.set("page", String(params.page));
  qp.set("per_page", String(params.perPage));
  // Only owners/founders/decision-makers
  ["Owner", "Founder", "Co-Founder", "CEO", "President"].forEach((t) => qp.append("person_titles[]", t));
  // Location filter
  if (params.zips?.length) {
    params.zips.forEach((z) => qp.append("organization_locations[]", z));
  } else if (params.city) {
    qp.append("organization_locations[]", `${params.city}, ${params.state ?? PRIMARY_STATE}`);
  }
  qp.append("organization_founded_year_min", String(params.foundedYear));
  qp.append("organization_founded_year_max", String(params.foundedYear));
  url.search = qp.toString();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apolloKey,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403 || /API_INACCESSIBLE|not accessible|free plan/i.test(body)) {
      throw new Error(
        "Apollo blocked this request: People Search isn't available on your current Apollo plan/API key. " +
          "Fix it in Apollo → Settings → Integrations → API: use a master API key and enable the " +
          "'People Search' (mixed_people/search) endpoint, or upgrade the Apollo plan. Then retry the import.",
      );
    }
    if (res.status === 401) {
      throw new Error("Apollo rejected the credentials (401). Reconnect the Apollo connection with a valid API key.");
    }
    throw new Error(`Apollo search failed (${res.status}): ${body}`);
  }
  return (await res.json()) as ApolloSearchResponse;
}

// ---------- Server fn: import Apollo leads ----------
export const importApolloLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { target?: number } | undefined) => ({
    target: Math.max(1, Math.min(2000, input?.target ?? TARGET_TOTAL)),
  }))
  .handler(async ({ data, context }) => {
    await requireAdminEmail(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const target = data.target;
    let insertedPrimary = 0;
    let insertedFallback = 0;
    let scanned = 0;
    let usedFallback = false;

    async function runPhase(sourceDetail: "national_city" | "south_bay_fallback", zips?: string[]) {
      let page = 1;
      const perPage = 100;
      // Cap pages per phase to avoid runaway credit use.
      const MAX_PAGES = 10;
      while (page <= MAX_PAGES) {
        const total = insertedPrimary + insertedFallback;
        if (total >= target) return;
        const resp = await apolloSearch({
          page,
          perPage,
          city: sourceDetail === "national_city" ? PRIMARY_CITY : undefined,
          state: PRIMARY_STATE,
          zips,
          foundedYear: FOUNDED_YEAR,
        });
        const people = resp.people ?? [];
        scanned += people.length;
        if (people.length === 0) return;

        const rows = people
          .filter((p) => p.email && !p.email.includes("email_not_unlocked"))
          .map((p) => {
            const org = p.organization ?? {};
            return {
              business_name: org.name ?? null,
              owner_name: p.name ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || null),
              email: (p.email as string).toLowerCase(),
              industry: org.industry ?? null,
              industry_category: categorize(org.industry),
              city: org.city ?? (sourceDetail === "national_city" ? PRIMARY_CITY : null),
              state: org.state ?? PRIMARY_STATE,
              founded_year: org.founded_year ?? FOUNDED_YEAR,
              source: "apollo",
              source_detail: sourceDetail,
              campaign_status: "not_sent",
            };
          });

        if (rows.length) {
          // Insert one-by-one to count only truly-new rows (skip existing emails).
          for (const row of rows) {
            const total2 = insertedPrimary + insertedFallback;
            if (total2 >= target) return;
            const { error } = await supabaseAdmin.from("leads").insert(row);
            if (!error) {
              if (sourceDetail === "national_city") insertedPrimary++;
              else insertedFallback++;
            }
            // duplicate email (23505) → silently skip
          }
        }

        const totalPages = resp.pagination?.total_pages ?? 1;
        if (page >= totalPages) return;
        page++;
      }
    }

    // Phase 1: National City only.
    await runPhase("national_city");

    // Phase 2: South Bay fallback if we still need more.
    if (insertedPrimary + insertedFallback < target) {
      usedFallback = true;
      await runPhase("south_bay_fallback", FALLBACK_ZIPS);
    }

    return {
      ok: true as const,
      target,
      inserted_total: insertedPrimary + insertedFallback,
      inserted_national_city: insertedPrimary,
      inserted_south_bay_fallback: insertedFallback,
      used_fallback: usedFallback,
      apollo_records_scanned: scanned,
    };
  });

__MIDDLE__

// ---------- Server fn: dashboard stats ----------
export const getCampaignDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { city?: string; industryCategory?: string; foundedYear?: number } | undefined) => ({
    city: input?.city?.trim() || undefined,
    industryCategory: input?.industryCategory?.trim() || undefined,
    foundedYear: input?.foundedYear || undefined,
  }))
  .handler(async ({ data, context }) => {
    await requireAdminEmail(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("leads")
      .select(
        "id, campaign_status, source_detail, city, industry_category, founded_year, business_name, owner_name, email, created_at, last_event_at, sent_at, delivered_at, first_opened_at, last_opened_at, open_count, click_count",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.city) query = query.eq("city", data.city);
    if (data.industryCategory) query = query.eq("industry_category", data.industryCategory);
    if (data.foundedYear) query = query.eq("founded_year", data.foundedYear);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];

    const attempted = list.filter((r) => r.campaign_status !== "not_sent");
    const deliveredRows = list.filter((r) => !!r.delivered_at);
    const openedRows = list.filter((r) => (r.open_count ?? 0) > 0 || !!r.first_opened_at);
    const reopenedRows = list.filter((r) => (r.open_count ?? 0) > 1);
    const totalOpens = list.reduce((n, r) => n + (r.open_count ?? 0), 0);

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

    const stats = {
      total: list.length,
      national_city: list.filter((r) => r.source_detail === "national_city").length,
      south_bay_fallback: list.filter((r) => r.source_detail === "south_bay_fallback").length,
      not_sent: list.filter((r) => r.campaign_status === "not_sent").length,
      sent: list.filter((r) => r.campaign_status === "sent").length,
      opened: list.filter((r) => r.campaign_status === "opened").length,
      clicked: list.filter((r) => r.campaign_status === "clicked").length,
      bounced: list.filter((r) => r.campaign_status === "bounced").length,
      unsubscribed: list.filter((r) => r.campaign_status === "unsubscribed").length,
    };

    const monitoring = {
      attempted: attempted.length,
      sent_ok: attempted.filter((r) => r.campaign_status !== "bounced").length,
      delivered: deliveredRows.length,
      bounced: list.filter((r) => r.campaign_status === "bounced").length,
      opened_unique: openedRows.length,
      reopened: reopenedRows.length,
      total_opens: totalOpens,
      clicked: list.filter((r) => (r.click_count ?? 0) > 0 || r.campaign_status === "clicked").length,
      delivery_rate: pct(deliveredRows.length, attempted.length),
      open_rate: pct(openedRows.length, deliveredRows.length || attempted.length),
      reopen_rate: pct(reopenedRows.length, openedRows.length),
      last_event_at:
        list
          .map((r) => r.last_event_at)
          .filter((d): d is string => !!d)
          .sort()
          .pop() ?? null,
    };


    const cities = Array.from(new Set(list.map((r) => r.city).filter((c): c is string => !!c))).sort();
    const categories = Array.from(new Set(list.map((r) => r.industry_category).filter((c): c is string => !!c))).sort();
    const years = Array.from(new Set(list.map((r) => r.founded_year).filter((y): y is number => !!y))).sort();

    return { stats, monitoring, leads: list, filters: { cities, categories, years } };
  });
