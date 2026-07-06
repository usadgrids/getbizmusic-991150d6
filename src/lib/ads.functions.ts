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

export const getActiveAds = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ads")
    .select("id,ad_number,business_name,website_url,tagline,industry,ad_type,image_url,duration_seconds")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const withUrls = (await attachUrls((data ?? []) as PublicAd[])) as PublicAd[];
  return fairShuffle(withUrls);
});

// Public: fetch a single ad by its human-friendly ad_number (for share landing pages).
export const getAdByNumber = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ ad_number: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ads")
      .select("id,ad_number,business_name,website_url,tagline,industry,ad_type,image_url,duration_seconds,status,expires_at,created_at")
      .eq("ad_number", data.ad_number)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const [withUrl] = await attachUrls([row as unknown as PublicAd]);
    return {
      ...(withUrl as PublicAd),
      status: (row as { status: string }).status,
      expires_at: (row as { expires_at: string }).expires_at,
      created_at: (row as { created_at: string }).created_at,
    };
  });

// Ask Facebook (and thereby other consumers of OG) to (re)scrape the share URL.
// Fire-and-forget: failures never block the caller. No-op when FB creds absent.
async function warmSocialPreview(adNumber: number | null) {
  if (adNumber == null) return;
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const shareUrl = `https://bizspotmusicad.lovable.app/ad/${adNumber}`;
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
});

export const createSubmission = createServerFn({ method: "POST" })
  .inputValidator((d) => submissionSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("ad_payments")
      .update({ token_used: true })
      .eq("id", pay.id);

    return { ok: true as const };
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
      .select("*, payment:ad_payments(id, stripe_session_id, customer_email, plan, amount_cents, status, environment, paid_at, created_at)")
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
      .select("*")
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

    const seconds = planSeconds(sub.ad_type as AdPlan);
    const now = new Date();
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + 1);

    const { data: inserted, error: insErr } = await supabaseAdmin.from("ads").insert({
      submission_id: sub.id,
      business_name: sub.business_name,
      website_url: sub.website_url,
      tagline: sub.tagline,
      industry: sub.industry,
      ad_type: sub.ad_type,
      image_url: sub.image_path, // stored as storage path; signed on read
      duration_seconds: seconds,
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      status: "active",
    }).select("ad_number").maybeSingle();
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("ad_submissions")
      .update({ status: "approved" })
      .eq("id", sub.id);
    void warmSocialPreview(inserted?.ad_number ?? null);
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
      tagline: string | null;
      industry: string;
      ad_type: "image_5" | "slider_10";
      duration_seconds: number;
      image_url?: string;
    } = {
      business_name: data.business_name,
      website_url: data.website_url || null,
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
  industry: z.string().trim().min(1).max(40),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  ad_type: z.enum(["image_5", "slider_10"]),
  image_path: z.string().trim().min(1).max(500),
  auto_approve: z.boolean().optional().default(true),
});

export const createManualSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => manualSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const status = data.auto_approve ? "approved" : "pending";
    const { data: sub, error } = await supabaseAdmin
      .from("ad_submissions")
      .insert({
        business_name: data.business_name,
        contact_name: data.contact_name,
        email: data.email,
        phone: data.phone,
        website_url: data.website_url || null,
        industry: data.industry,
        tagline: data.tagline || null,
        ad_type: data.ad_type,
        image_path: data.image_path,
        status,
        payment_id: null,
      })
      .select("id")
      .maybeSingle();
    if (error || !sub) throw new Error(error?.message ?? "Insert failed");

    if (data.auto_approve) {
      const seconds = planSeconds(data.ad_type);
      const now = new Date();
      const expires = new Date(now);
      expires.setFullYear(expires.getFullYear() + 1);
      const { data: adRow, error: adErr } = await supabaseAdmin.from("ads").insert({
        submission_id: sub.id,
        business_name: data.business_name,
        website_url: data.website_url || null,
        tagline: data.tagline || null,
        industry: data.industry,
        ad_type: data.ad_type,
        image_url: data.image_path,
        duration_seconds: seconds,
        starts_at: now.toISOString(),
        expires_at: expires.toISOString(),
        status: "active",
      }).select("ad_number").maybeSingle();
      if (adErr) throw new Error(adErr.message);
      void warmSocialPreview(adRow?.ad_number ?? null);
    }
    return { ok: true as const, id: sub.id, status };
  });
