import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days; refreshed per load

export type PublicAd = {
  id: string;
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

export const getActiveAds = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ads")
    .select("id,business_name,website_url,tagline,industry,ad_type,image_url,duration_seconds")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (await attachUrls((data ?? []) as PublicAd[])) as PublicAd[];
});

const submissionSchema = z.object({
  business_name: z.string().trim().min(1).max(120),
  contact_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(40),
  website_url: z.string().trim().url().max(255).optional().or(z.literal("")),
  industry: z.string().trim().min(1).max(40),
  tagline: z.string().trim().max(80).optional().or(z.literal("")),
  ad_type: z.enum(["image_5", "slider_10"]),
  image_path: z.string().trim().min(1).max(500),
});

export const createSubmission = createServerFn({ method: "POST" })
  .inputValidator((d) => submissionSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ad_submissions").insert({
      business_name: data.business_name,
      contact_name: data.contact_name,
      email: data.email,
      phone: data.phone,
      website_url: data.website_url || null,
      industry: data.industry,
      tagline: data.tagline || null,
      ad_type: data.ad_type,
      image_path: data.image_path,
      status: "pending",
    });
    if (error) throw new Error(error.message);
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
      .select("*")
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

    const seconds = sub.ad_type === "slider_10" ? 10 : 5;
    const now = new Date();
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + 1);

    const { error: insErr } = await supabaseAdmin.from("ads").insert({
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
    });
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("ad_submissions")
      .update({ status: "approved" })
      .eq("id", sub.id);
    return { ok: true as const };
  });

export const rejectSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), reason: z.string().max(280).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ad_submissions")
      .update({ status: "rejected", reject_reason: data.reason ?? null })
      .eq("id", data.id);
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
