import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Advertisers/listings an admin can audit with one click. */
export const adminListAuditTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminUser } = await import("@/lib/ai-audit.server");
    await assertAdminUser(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: ads }, { data: places }] = await Promise.all([
      supabaseAdmin
        .from("ads")
        .select("id, business_name, website_url, status, cities(name, state)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(300),
      supabaseAdmin
        .from("food_places")
        .select("id, name, city, state, website, ad_id")
        .order("name", { ascending: true })
        .limit(300),
    ]);

    const byAd = new Map(
      (places ?? []).map((p) => [
        p.ad_id as string,
        { city: p.city as string | null, state: p.state as string | null, website: p.website as string | null },
      ]),
    );

    return {
      targets: (ads ?? []).map((a) => {
        const city = (a as { cities?: { name?: string; state?: string } | null }).cities ?? null;
        const extra = byAd.get(a.id as string);
        return {
          id: a.id as string,
          name: a.business_name as string,
          city: city?.name ?? extra?.city ?? null,
          state: city?.state ?? extra?.state ?? null,
          website: (a.website_url as string | null) ?? extra?.website ?? null,
        };
      }),
    };
  });

export const adminRunVisibilityAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        businessName: z.string().min(2).max(160),
        city: z.string().max(80).nullish(),
        state: z.string().max(40).nullish(),
        website: z.string().max(300).nullish(),
        prompt: z.string().max(4000).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { assertAdminUser, runVisibilityAudit } = await import("@/lib/ai-audit.server");
    await assertAdminUser(context.userId);
    try {
      const audit = await runVisibilityAudit(data);
      return { ok: true as const, audit };
    } catch (err) {
      console.error("[ai-audit] failed", err);
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Audit failed.",
      };
    }
  });
