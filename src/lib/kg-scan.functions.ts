import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Run the full 6-step Knowledge Graph scan for one business. */
export const adminRunKnowledgeScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        businessName: z.string().min(2).max(160),
        city: z.string().max(80).nullish(),
        state: z.string().max(40).nullish(),
        website: z.string().max(300).nullish(),
        businessId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { assertAdminUser, runKnowledgeScan } = await import("@/lib/kg-scan.server");
    await assertAdminUser(context.userId);
    try {
      const result = await runKnowledgeScan(data);
      return { ok: true as const, result };
    } catch (err) {
      console.error("[kg-scan] failed", err);
      return { ok: false as const, error: err instanceof Error ? err.message : "Scan failed." };
    }
  });

/** Admin review list. */
export const adminListKnowledgeBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminUser } = await import("@/lib/kg-scan.server");
    await assertAdminUser(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("kg_businesses")
      .select(
        "id, name, city, state, website, score, grade, score_completeness, score_schema, score_answerability, score_reviews, weakest_component, weakest_summary, status, schema_valid, needs_manual_validation, last_scanned_at",
      )
      .order("last_scanned_at", { ascending: false, nullsFirst: false })
      .limit(200);
    return { businesses: data ?? [] };
  });

/** Full record for the review drawer. */
export const adminGetKnowledgeBusiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { assertAdminUser } = await import("@/lib/kg-scan.server");
    await assertAdminUser(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: business }, { data: facts }, { data: qa }] = await Promise.all([
      supabaseAdmin.from("kg_businesses").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("business_facts").select("*").eq("business_id", data.id).maybeSingle(),
      supabaseAdmin.from("qa_pairs").select("*").eq("business_id", data.id).order("sort_order"),
    ]);
    return { business, facts, qa: qa ?? [] };
  });

/** Edit a generated answer before it goes live. */
export const adminUpdateQaPair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        question: z.string().min(3).max(300),
        answer: z.string().max(2000).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { assertAdminUser } = await import("@/lib/kg-scan.server");
    await assertAdminUser(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const answer = data.answer?.trim() || null;
    const { error } = await supabaseAdmin
      .from("qa_pairs")
      .update({
        question: data.question,
        answer,
        answered: Boolean(answer),
        flag: answer ? "ok" : "insufficient_data",
      })
      .eq("id", data.id);
    return { ok: !error, error: error?.message ?? null };
  });

/** Publish / unpublish a reviewed listing. */
export const adminSetKnowledgeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "published"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { assertAdminUser } = await import("@/lib/kg-scan.server");
    await assertAdminUser(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("kg_businesses")
      .update({ status: data.status })
      .eq("id", data.id);
    return { ok: !error, error: error?.message ?? null };
  });

export const adminDeleteKnowledgeBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { assertAdminUser } = await import("@/lib/kg-scan.server");
    await assertAdminUser(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("kg_businesses").delete().eq("id", data.id);
    return { ok: !error, error: error?.message ?? null };
  });
