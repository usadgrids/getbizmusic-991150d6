import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AD_PLANS, type AdPlan } from "@/lib/biz-utils";

// Single source of truth for rotation seconds per plan. All server writes
// MUST go through this so the slider's countdown always matches the plan.
const planSeconds = (t: AdPlan): number => AD_PLANS[t].seconds;

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days; refreshed per load

export type PublicAd = {
  id: string;
  ad_number: number | null;
  business_name: string;
  website_url: string | null;
  youtube_url: string | null;
  tagline: string | null;
  industry: string;
  ad_type: "image_5" | "slider_10";
  image_url: string;
  duration_seconds: number;
};

async function attachUrls<T extends { image_url: string }>(items: T[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(
    items.map(async (item) => {
      // image_url is already a URL when it starts with http(s) or "/" (CDN asset).
      // Otherwise treat it as a storage path inside the ad-uploads bucket.
      if (/^(https?:)?\//i.test(item.image_url)) return item;
      const { data } = await supabaseAdmin.storage
        .from("ad-uploads")
        .createSignedUrl(item.image_url, SIGNED_URL_TTL);
      return { ...item, image_url: data?.signedUrl ?? "" };
    }),
  );
}

function fairShuffle(ads: PublicAd[]): PublicAd[] {
  // Weight Featured Slider ($24) ads 2x vs Standard ($12) so paid tier gets
  // more air time, then Fisher-Yates shuffle for per-load fairness.
  const weighted: PublicAd[] = [];
  for (const a of ads) {
    weighted.push(a);
    if (a.ad_type === "slider_10") weighted.push(a);
  }
  for (let i = weighted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }
  return weighted;
}

export const getActiveAds = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ city_slug: z.string().min(1).max(120).optional() }).optional().parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let cityId: string | null = null;
    if (data?.city_slug) {
      const { data: city } = await supabaseAdmin
        .from("cities")
        .select("id")
        .eq("slug", data.city_slug)
        .maybeSingle();
      if (!city) return [];
      cityId = (city as { id: string }).id;
    }
    let query = supabaseAdmin
      .from("ads")
      .select("id,ad_number,business_name,website_url,youtube_url,tagline,industry,ad_type,image_url,duration_seconds")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (cityId) query = query.eq("city_id", cityId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const withUrls = (await attachUrls((rows ?? []) as PublicAd[])) as PublicAd[];
    return fairShuffle(withUrls);
  });


// Public: fetch a single ad by its human-friendly ad_number (for share landing pages).
export const getAdByNumber = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ ad_number: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ads")
      .select("id,ad_number,business_name,website_url,youtube_url,tagline,industry,ad_type,image_url,duration_seconds,status,expires_at,created_at,cities:city_id(name,state,slug)")
      .eq("ad_number", data.ad_number)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const [withUrl] = await attachUrls([row as unknown as PublicAd]);
    const city = (row as { cities: { name: string; state: string; slug: string } | null }).cities ?? null;
    return {
      ...(withUrl as PublicAd),
      status: (row as { status: string }).status,
      expires_at: (row as { expires_at: string }).expires_at,
      created_at: (row as { created_at: string }).created_at,
      city_name: city?.name ?? null,
      city_state: city?.state ?? null,
      city_slug: city?.slug ?? null,
    };
  });

// Ask Facebook (and thereby other consumers of OG) to (re)scrape the share URL.
// Fire-and-forget: failures never block the caller. No-op when FB creds absent.
async function warmSocialPreview(adNumber: number | null) {
  if (adNumber == null) return;
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const shareUrl = `https://www.getbizmusic.com/ad/${adNumber}`;
  try {
    if (appId && appSecret) {
      const token = `${appId}|${appSecret}`;
      await fetch(
        `https://graph.facebook.com/v19.0/?id=${encodeURIComponent(shareUrl)}&scrape=true&access_token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
    } else {
      // Fallback: unauthenticated scrape endpoint still nudges the cache.
      await fetch(
        `https://graph.facebook.com/?id=${encodeURIComponent(shareUrl)}&scrape=true`,
        { method: "POST" },
      );
    }
  } catch {
    // ignore – never block approval on FB call
  }
}

// Resolve target city by (name, stateCode); create it if missing so the
// buyer's chosen city page exists after admin approval. Reuses existing
// row on a case-insensitive (name, state) match.
async function resolveOrCreateCity(name: string, stateCode: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { slugifyCity } = await import("@/lib/us-cities");
  const cleanName = name.trim();
  const cleanState = stateCode.trim().toUpperCase();

  const { data: existing } = await supabaseAdmin
    .from("cities")
    .select("id")
    .ilike("name", cleanName)
    .eq("state", cleanState)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const base = slugifyCity(cleanName, cleanState);
  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data: inserted, error } = await supabaseAdmin
      .from("cities")
      .insert({ slug, name: cleanName, state: cleanState, is_active: true, sort_order: 999 })
      .select("id")
      .maybeSingle();
    if (!error && inserted) return (inserted as { id: string }).id;
    // Retry on unique violation; bail on anything else.
    if (error && !/duplicate key|unique/i.test(error.message)) {
      // Name+state uniqueness collision — try to find & reuse.
      const { data: retry } = await supabaseAdmin
        .from("cities")
        .select("id")
        .ilike("name", cleanName)
        .eq("state", cleanState)
        .maybeSingle();
      if (retry) return (retry as { id: string }).id;
      throw new Error(error.message);
    }
  }
  return null;
}


const submissionSchema = z.object({
  business_name: z.string().trim().min(1).max(120),
  contact_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(40),
  website_url: z.string().trim().url().max(255).optional().or(z.literal("")),
  industry: z.string().trim().min(1).max(40),
  tagline: z.string().trim().max(80).optional().or(z.literal("")),
  image_path: z.string().trim().min(1).max(500),
  submission_token: z.string().uuid(),
  requested_city_name: z.string().trim().min(1).max(120),
  requested_state_code: z.string().trim().length(2).regex(/^[A-Za-z]{2}$/),
});

export const createSubmission = createServerFn({ method: "POST" })
  .inputValidator((d) => submissionSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Server-side validate that requested city+state is a real US pair.
    const { isValidUsCity } = await import("@/lib/us-cities");
    const stateCode = data.requested_state_code.toUpperCase();
    if (!(await isValidUsCity(data.requested_city_name, stateCode))) {
      throw new Error("Invalid US city / state selection");
    }

    // Verify the payment token: must exist, be paid, and not already used.
    const { data: pay, error: payErr } = await supabaseAdmin
      .from("ad_payments")
      .select("id, plan, status, token_used")
      .eq("submission_token", data.submission_token)
      .maybeSingle();
    if (payErr || !pay) throw new Error("Invalid submission token");
    if (pay.status !== "paid") throw new Error("Payment not confirmed");
    if (pay.token_used) throw new Error("This submission link has already been used");

    const { error } = await supabaseAdmin.from("ad_submissions").insert({
      business_name: data.business_name,
      contact_name: data.contact_name,
      email: data.email,
      phone: data.phone,
      website_url: data.website_url || null,
      industry: data.industry,
      tagline: data.tagline || null,
      ad_type: pay.plan,
      image_path: data.image_path,
      status: "pending",
      payment_id: pay.id,
      requested_city_name: data.requested_city_name,
      requested_state_code: stateCode,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("ad_payments")
      .update({ token_used: true })
      .eq("id", pay.id);

    // Confirmation email — admins will send the "your ad is live" email later.
    try {
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmailInternal({
        templateName: "submission-received",
        recipientEmail: data.email,
        idempotencyKey: `submission-received-${data.submission_token}`,
        templateData: { contactName: data.contact_name, businessName: data.business_name },
      });
    } catch (e) {
      console.error("submission-received enqueue failed:", e);
    }

    return { ok: true as const };
  });

// Submitter isn't ready yet — email them their private submission link so
// they can come back later. Token stays valid until used.
export const scheduleSubmissionReminder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pay, error } = await supabaseAdmin
      .from("ad_payments")
      .select("customer_email, status, token_used")
      .eq("submission_token", data.token)
      .maybeSingle();
    if (error || !pay) throw new Error("Invalid submission token");
    if (pay.status !== "paid") throw new Error("Payment not confirmed");
    if (pay.token_used) throw new Error("This submission link has already been used");

    const submitUrl = `https://www.getbizmusic.com/submit?token=${data.token}`;
    const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
    const res = await enqueueTransactionalEmailInternal({
      templateName: "submit-reminder",
      recipientEmail: pay.customer_email as string,
      idempotencyKey: `submit-reminder-${data.token}`,
      templateData: { submitUrl },
    });
    if (!res.ok) throw new Error(res.reason ?? "Failed to send reminder");
    return { ok: true as const, email: pay.customer_email as string };
  });


// ---------- Admin-only ----------

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

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      // Already have an admin — only existing admin can grant more
      const { data: me } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!me) throw new Error("Admin already exists. Ask the owner to grant access.");
      return { ok: true as const, alreadyAdmin: true };
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true as const, alreadyAdmin: false };
  });

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { admin: !!data };
  });

export const listPendingSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ad_submissions")
      .select("*, payment:ad_payments(id, stripe_session_id, customer_email, plan, amount_cents, status, environment, paid_at, created_at), ad:ads!ad_submissions_ad_id_fkey(ad_number)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const withUrls = await Promise.all(
      (data ?? []).map(async (s) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("ad-uploads")
          .createSignedUrl(s.image_path, SIGNED_URL_TTL);
        return { ...s, preview_url: signed?.signedUrl ?? "" };
      }),
    );
    return withUrls;
  });

export const listActiveAdsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ads")
      .select("*, cities:city_id(name, state, slug)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return await attachUrls(data ?? []);
  });

export const approveSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("ad_submissions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (subErr || !sub) throw new Error("Submission not found");

    // Idempotency guard: if this submission was already approved (double-click,
    // duplicate request), return the existing ad instead of inserting again.
    if (sub.status === "approved") {
      const { data: existingAd } = await supabaseAdmin
        .from("ads")
        .select("ad_number, edit_token")
        .eq("submission_id", sub.id)
        .maybeSingle();
      if (existingAd) {
        return { ok: true as const, alreadyApproved: true, adNumber: existingAd.ad_number };
      }
    }

    const seconds = planSeconds(sub.ad_type as AdPlan);
    let adNumber: number | null = null;
    let editToken: string | null = null;
    const isEdit = !!sub.ad_id;

    if (isEdit) {
      // Edit flow — update the existing live ad in place; keep ad_number & expires_at.
      const { data: updated, error: updErr } = await supabaseAdmin
        .from("ads")
        .update({
          business_name: sub.business_name,
          website_url: sub.website_url,
          youtube_url: (sub as { youtube_url?: string | null }).youtube_url ?? null,
          tagline: sub.tagline,
          industry: sub.industry,
          ad_type: sub.ad_type,
          image_url: sub.image_path,
          duration_seconds: seconds,
        })
        .eq("id", sub.ad_id as string)
        .select("ad_number, edit_token")
        .maybeSingle();
      if (updErr || !updated) throw new Error(updErr?.message ?? "Ad not found for edit");
      adNumber = (updated.ad_number as number) ?? null;
      editToken = (updated.edit_token as string) ?? null;
    } else {
      // Resolve target city: use existing (name+state) if present, else auto-create.
      let cityId: string | null = (sub as { city_id: string | null }).city_id ?? null;
      const reqCity = (sub as { requested_city_name: string | null }).requested_city_name;
      const reqState = (sub as { requested_state_code: string | null }).requested_state_code;
      if (!cityId && reqCity && reqState) {
        cityId = await resolveOrCreateCity(reqCity, reqState.toUpperCase());
      }

      const now = new Date();
      const expires = new Date(now);
      expires.setFullYear(expires.getFullYear() + 1);
      const { data: inserted, error: insErr } = await supabaseAdmin.from("ads").insert({
        submission_id: sub.id,
        business_name: sub.business_name,
        website_url: sub.website_url,
        youtube_url: (sub as { youtube_url?: string | null }).youtube_url ?? null,
        tagline: sub.tagline,
        industry: sub.industry,
        ad_type: sub.ad_type,
        image_url: sub.image_path,
        duration_seconds: seconds,
        starts_at: now.toISOString(),
        expires_at: expires.toISOString(),
        status: "active",
        city_id: cityId,
      }).select("ad_number, edit_token").maybeSingle();
      if (insErr) throw new Error(insErr.message);
      adNumber = inserted?.ad_number ?? null;
      editToken = (inserted?.edit_token as string) ?? null;
    }

    await supabaseAdmin
      .from("ad_submissions")
      .update({ status: "approved" })
      .eq("id", sub.id);
    void warmSocialPreview(adNumber);

    // "Your ad is live" email with unique shareable URL + Edit link.
    if (adNumber != null && sub.email) {
      try {
        const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
        await enqueueTransactionalEmailInternal({
          templateName: "ad-approved",
          recipientEmail: sub.email as string,
          idempotencyKey: `ad-approved-${sub.id}`,
          templateData: {
            contactName: sub.contact_name,
            businessName: sub.business_name,
            adNumber,
            shareUrl: `https://www.getbizmusic.com/ad/${adNumber}`,
            editUrl: editToken ? `https://www.getbizmusic.com/edit-ad?token=${editToken}` : undefined,
            isEdit,
          },
        });
      } catch (e) {
        console.error("ad-approved enqueue failed:", e);
      }
    }

    return { ok: true as const };
  });


export const rejectSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), reason: z.string().max(1000).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("ad_submissions")
      .update({ status: "rejected", reject_reason: data.reason ?? null })
      .eq("id", data.id)
      .select("id, business_name, contact_name, email, ad_type")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, submission: updated };
  });

const updateAdSchema = z.object({
  id: z.string().uuid(),
  business_name: z.string().trim().min(1).max(120),
  website_url: z.string().trim().url().max(255).optional().or(z.literal("")),
  youtube_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  industry: z.string().trim().min(1).max(40),
  ad_type: z.enum(["image_5", "slider_10"]),
  image_path: z.string().trim().min(1).max(500).optional(),
});

export const updateAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateAdSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      business_name: string;
      website_url: string | null;
      youtube_url: string | null;
      tagline: string | null;
      industry: string;
      ad_type: "image_5" | "slider_10";
      duration_seconds: number;
      image_url?: string;
    } = {
      business_name: data.business_name,
      website_url: data.website_url || null,
      youtube_url: data.youtube_url || null,
      tagline: data.tagline || null,
      industry: data.industry,
      ad_type: data.ad_type,
      duration_seconds: planSeconds(data.ad_type),
    };
    if (data.image_path) patch.image_url = data.image_path;
    const { error } = await supabaseAdmin.from("ads").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removeAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ads")
      .update({ status: "removed" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Admin-only manual submission that bypasses payment. Optionally auto-approves.
const manualSchema = z.object({
  business_name: z.string().trim().min(1).max(120),
  contact_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(1).max(40),
  website_url: z.string().trim().url().max(255).optional().or(z.literal("")),
  youtube_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  industry: z.string().trim().min(1).max(40),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  ad_type: z.enum(["image_5", "slider_10"]),
  image_path: z.string().trim().min(1).max(500),
  auto_approve: z.boolean().optional().default(true),
  city_ids: z.array(z.string().uuid()).min(1).max(50),
});

export const createManualSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => manualSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const status = data.auto_approve ? "approved" : "pending";
    const seconds = planSeconds(data.ad_type);
    const now = new Date();
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + 1);

    let created = 0;
    for (const city_id of data.city_ids) {
      const { data: sub, error } = await supabaseAdmin
        .from("ad_submissions")
        .insert({
          business_name: data.business_name,
          contact_name: data.contact_name,
          email: data.email,
          phone: data.phone,
          website_url: data.website_url || null,
          youtube_url: data.youtube_url || null,
          industry: data.industry,
          tagline: data.tagline || null,
          ad_type: data.ad_type,
          image_path: data.image_path,
          status,
          payment_id: null,
          city_id,
        })
        .select("id")
        .maybeSingle();
      if (error || !sub) throw new Error(error?.message ?? "Insert failed");

      if (data.auto_approve) {
        const { data: adRow, error: adErr } = await supabaseAdmin.from("ads").insert({
          submission_id: sub.id,
          business_name: data.business_name,
          website_url: data.website_url || null,
          youtube_url: data.youtube_url || null,
          tagline: data.tagline || null,
          industry: data.industry,
          ad_type: data.ad_type,
          image_url: data.image_path,
          duration_seconds: seconds,
          starts_at: now.toISOString(),
          expires_at: expires.toISOString(),
          status: "active",
          city_id,
        }).select("ad_number").maybeSingle();
        if (adErr) throw new Error(adErr.message);
        void warmSocialPreview(adRow?.ad_number ?? null);
      }
      created += 1;
    }
    return { ok: true as const, status, count: created };
  });

// ---------- Post-approval edit flow (public, token-gated) ----------

export const getAdForEdit = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ad, error } = await supabaseAdmin
      .from("ads")
      .select("id, ad_number, submission_id, business_name, website_url, youtube_url, tagline, industry, ad_type, image_url, status")
      .eq("edit_token", data.token)
      .maybeSingle();
    if (error || !ad) return { found: false as const, reason: "Invalid or unknown edit link" };
    const adId = (ad as { id: string }).id;
    const originalSubmissionId = (ad as { submission_id: string | null }).submission_id;

    // Grab latest submission for contact info (phone/contact_name/email).
    const { data: sub } = await supabaseAdmin
      .from("ad_submissions")
      .select("contact_name, email, phone, status")
      .eq("ad_id", adId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let contact = sub;
    if (!contact && originalSubmissionId) {
      const { data: orig } = await supabaseAdmin
        .from("ad_submissions")
        .select("contact_name, email, phone, status")
        .eq("id", originalSubmissionId)
        .maybeSingle();
      contact = orig ?? null;
    }

    // Sign the current image so the editor can preview it.
    let previewUrl = "";
    const path = (ad as { image_url: string }).image_url;
    if (path && !/^(https?:)?\//i.test(path)) {
      const { data: signed } = await supabaseAdmin.storage
        .from("ad-uploads")
        .createSignedUrl(path, SIGNED_URL_TTL);
      previewUrl = signed?.signedUrl ?? "";
    } else {
      previewUrl = path;
    }

    const pendingEdit = contact?.status === "pending";

    return {
      found: true as const,
      ad: {
        id: adId,
        ad_number: (ad as { ad_number: number }).ad_number,
        business_name: (ad as { business_name: string }).business_name,
        website_url: (ad as { website_url: string | null }).website_url,
        youtube_url: (ad as { youtube_url: string | null }).youtube_url,
        tagline: (ad as { tagline: string | null }).tagline,
        industry: (ad as { industry: string }).industry,
        ad_type: (ad as { ad_type: "image_5" | "slider_10" }).ad_type,
        preview_url: previewUrl,
      },
      contact: {
        contact_name: (contact?.contact_name as string) ?? "",
        email: (contact?.email as string) ?? "",
        phone: (contact?.phone as string) ?? "",
      },
      pendingEdit,
    };
  });

const editSchema = z.object({
  token: z.string().uuid(),
  business_name: z.string().trim().min(1).max(120),
  contact_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(40),
  website_url: z.string().trim().url().max(255).optional().or(z.literal("")),
  industry: z.string().trim().min(1).max(40),
  tagline: z.string().trim().max(80).optional().or(z.literal("")),
  image_path: z.string().trim().min(1).max(500).optional(),
});

export const submitAdEdit = createServerFn({ method: "POST" })
  .inputValidator((d) => editSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ad, error } = await supabaseAdmin
      .from("ads")
      .select("id, ad_type, image_url")
      .eq("edit_token", data.token)
      .maybeSingle();
    if (error || !ad) throw new Error("Invalid edit link");

    const adId = (ad as { id: string }).id;
    const adType = (ad as { ad_type: "image_5" | "slider_10" }).ad_type;

    // Reject if there's already a pending edit for this ad — avoid queue spam.
    const { data: existingPending } = await supabaseAdmin
      .from("ad_submissions")
      .select("id")
      .eq("ad_id", adId)
      .eq("status", "pending")
      .maybeSingle();
    if (existingPending) {
      throw new Error("You already have an edit awaiting review. Please wait for admin approval.");
    }

    const imagePath = data.image_path ?? (ad as { image_url: string }).image_url;

    const { error: insErr } = await supabaseAdmin.from("ad_submissions").insert({
      business_name: data.business_name,
      contact_name: data.contact_name,
      email: data.email,
      phone: data.phone,
      website_url: data.website_url || null,
      industry: data.industry,
      tagline: data.tagline || null,
      ad_type: adType,
      image_path: imagePath,
      status: "pending",
      payment_id: null,
      ad_id: adId,
    });
    if (insErr) throw new Error(insErr.message);

    // Send an "edit received — pending review" confirmation.
    try {
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmailInternal({
        templateName: "submission-received",
        recipientEmail: data.email,
        idempotencyKey: `edit-received-${adId}-${Date.now()}`,
        templateData: {
          contactName: data.contact_name,
          businessName: data.business_name,
          isEdit: true,
        },
      });
    } catch (e) {
      console.error("edit submission-received enqueue failed:", e);
    }

    return { ok: true as const };
  });
