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
              owner_name: p.name ?? [p.first_name, p.last_name].filter(Boolean).join(" ") || null,
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

// ---------- Brevo helpers ----------
const BREVO_GATEWAY = "https://connector-gateway.lovable.dev/brevo";

async function brevoFetch(path: string, init: RequestInit = {}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  if (!lovableKey || !brevoKey) throw new Error("Brevo credentials missing.");
  const res = await fetch(`${BREVO_GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": brevoKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

async function ensureBrevoList(): Promise<number> {
  // List existing lists (paginated). Look for our name.
  let offset = 0;
  const limit = 50;
  while (true) {
    const res = await brevoFetch(`/v3/contacts/lists?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error(`Brevo list lookup failed (${res.status}): ${await res.text()}`);
    const body = (await res.json()) as { lists?: Array<{ id: number; name: string }>; count?: number };
    const found = body.lists?.find((l) => l.name === BREVO_LIST_NAME);
    if (found) return found.id;
    const total = body.count ?? 0;
    offset += limit;
    if (offset >= total) break;
  }
  // Create it — Brevo requires a folderId. Use folder 1 (default).
  const create = await brevoFetch(`/v3/contacts/lists`, {
    method: "POST",
    body: JSON.stringify({ name: BREVO_LIST_NAME, folderId: 1 }),
  });
  if (!create.ok) throw new Error(`Brevo list create failed (${create.status}): ${await create.text()}`);
  const created = (await create.json()) as { id: number };
  return created.id;
}

// ---------- Server fn: sync leads to Brevo list ----------
export const syncLeadsToBrevo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminEmail(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const listId = await ensureBrevoList();

    // Pull leads that are not_sent and have no brevo_contact_id yet.
    const { data: rows, error } = await supabaseAdmin
      .from("leads")
      .select("id, email, business_name, owner_name, industry_category, city, state, founded_year")
      .eq("campaign_status", "not_sent")
      .is("brevo_contact_id", null)
      .limit(1000);
    if (error) throw new Error(error.message);
    const leads = rows ?? [];
    if (!leads.length) return { ok: true as const, list_id: listId, synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    // Batch via createContacts endpoint (up to 100 per request).
    const CHUNK = 100;
    for (let i = 0; i < leads.length; i += CHUNK) {
      const chunk = leads.slice(i, i + CHUNK);
      // createContacts is import-style; use per-contact upsert for reliability + id capture.
      for (const lead of chunk) {
        const payload = {
          email: lead.email,
          updateEnabled: true,
          listIds: [listId],
          attributes: {
            BUSINESS_NAME: lead.business_name ?? "",
            OWNER_NAME: lead.owner_name ?? "",
            INDUSTRY_CATEGORY: lead.industry_category ?? "",
            CITY: lead.city ?? "",
            STATE: lead.state ?? "",
            FOUNDED_YEAR: lead.founded_year ?? "",
          },
        };
        const res = await brevoFetch(`/v3/contacts`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok && res.status !== 204) {
          failed++;
          continue;
        }
        let contactId: number | null = null;
        try {
          const body = (await res.json()) as { id?: number };
          contactId = body?.id ?? null;
        } catch {
          contactId = null;
        }
        if (!contactId) {
          // fetch by email
          const get = await brevoFetch(`/v3/contacts/${encodeURIComponent(lead.email)}`);
          if (get.ok) {
            const b = (await get.json()) as { id?: number };
            contactId = b?.id ?? null;
          }
        }
        await supabaseAdmin
          .from("leads")
          .update({ brevo_contact_id: contactId })
          .eq("id", lead.id);
        synced++;
      }
    }

    return { ok: true as const, list_id: listId, synced, failed };
  });

// ---------- Server fn: send campaign ----------
export const sendBrevoCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subject: string; htmlContent: string; campaignName?: string }) => {
    if (!input?.subject?.trim()) throw new Error("Subject required.");
    if (!input?.htmlContent?.trim()) throw new Error("HTML content required.");
    return {
      subject: input.subject.trim(),
      htmlContent: input.htmlContent,
      campaignName: input.campaignName?.trim() || `NC 2026 — ${new Date().toISOString().slice(0, 10)}`,
    };
  })
  .handler(async ({ data, context }) => {
    await requireAdminEmail(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ensure only not_sent leads are targeted: create a fresh Brevo list for THIS send.
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const perSendListName = `NC-2026 send ${stamp}`;

    const createList = await brevoFetch(`/v3/contacts/lists`, {
      method: "POST",
      body: JSON.stringify({ name: perSendListName, folderId: 1 }),
    });
    if (!createList.ok) throw new Error(`Brevo list create failed (${createList.status}): ${await createList.text()}`);
    const { id: sendListId } = (await createList.json()) as { id: number };

    // Fetch not_sent leads with a brevo_contact_id.
    const { data: rows, error } = await supabaseAdmin
      .from("leads")
      .select("id, email, brevo_contact_id")
      .eq("campaign_status", "not_sent")
      .not("brevo_contact_id", "is", null)
      .limit(10000);
    if (error) throw new Error(error.message);
    const leads = rows ?? [];
    if (!leads.length) {
      return { ok: false as const, reason: "No un-sent leads with Brevo contacts. Run Sync first." };
    }

    // Add contacts to the per-send list, 150 emails per call.
    const CHUNK = 150;
    for (let i = 0; i < leads.length; i += CHUNK) {
      const emails = leads.slice(i, i + CHUNK).map((l) => l.email);
      const addRes = await brevoFetch(`/v3/contacts/lists/${sendListId}/contacts/add`, {
        method: "POST",
        body: JSON.stringify({ emails }),
      });
      if (!addRes.ok && addRes.status !== 400) {
        throw new Error(`Brevo add-to-list failed (${addRes.status}): ${await addRes.text()}`);
      }
    }

    // Append CAN-SPAM footer + unsubscribe token.
    const footer = `
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.5;">
        <p style="margin:0 0 6px;">You are receiving this because your business was identified as a newly founded ${PRIMARY_CITY}-area business.</p>
        <p style="margin:0 0 6px;"><strong>${SENDER_NAME}</strong> · ${MAILING_ADDRESS}</p>
        <p style="margin:0;"><a href="{{ unsubscribe }}" style="color:#2563eb;">Unsubscribe</a></p>
      </div>`;
    const finalHtml = /\{\{\s*unsubscribe\s*\}\}/i.test(data.htmlContent)
      ? data.htmlContent
      : `${data.htmlContent}${footer}`;

    // Create the campaign.
    const createCampaign = await brevoFetch(`/v3/emailCampaigns`, {
      method: "POST",
      body: JSON.stringify({
        name: data.campaignName,
        subject: data.subject,
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        htmlContent: finalHtml,
        recipients: { listIds: [sendListId] },
        inlineImageActivation: false,
      }),
    });
    if (!createCampaign.ok) {
      throw new Error(`Brevo campaign create failed (${createCampaign.status}): ${await createCampaign.text()}`);
    }
    const { id: campaignId } = (await createCampaign.json()) as { id: number };

    // Send it now.
    const sendNow = await brevoFetch(`/v3/emailCampaigns/${campaignId}/sendNow`, { method: "POST" });
    if (!sendNow.ok && sendNow.status !== 204) {
      throw new Error(`Brevo sendNow failed (${sendNow.status}): ${await sendNow.text()}`);
    }

    // Optimistically mark as sent.
    const ids = leads.map((l) => l.id);
    await supabaseAdmin
      .from("leads")
      .update({ campaign_status: "sent", last_event_at: new Date().toISOString() })
      .in("id", ids);

    return {
      ok: true as const,
      campaign_id: campaignId,
      send_list_id: sendListId,
      recipients: leads.length,
    };
  });

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
      .select("id, campaign_status, source_detail, city, industry_category, founded_year, business_name, owner_name, email, created_at, last_event_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.city) query = query.eq("city", data.city);
    if (data.industryCategory) query = query.eq("industry_category", data.industryCategory);
    if (data.foundedYear) query = query.eq("founded_year", data.foundedYear);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];

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

    const cities = Array.from(new Set(list.map((r) => r.city).filter((c): c is string => !!c))).sort();
    const categories = Array.from(new Set(list.map((r) => r.industry_category).filter((c): c is string => !!c))).sort();
    const years = Array.from(new Set(list.map((r) => r.founded_year).filter((y): y is number => !!y))).sort();

    return { stats, leads: list, filters: { cities, categories, years } };
  });
