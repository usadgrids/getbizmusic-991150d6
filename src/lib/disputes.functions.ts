import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

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

export const listDisputes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("dispute_evidence_log")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateDisputeEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; evidenceText: string }) =>
    z.object({ id: z.string().uuid(), evidenceText: z.string().min(10).max(20000) }).parse(data)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("dispute_evidence_log")
      .update({ evidence_text: data.evidenceText })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitDisputeEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("dispute_evidence_log")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Dispute record not found");
    if (row.status === "submitted") throw new Error("Already submitted");

    const stripe = createStripeClient(row.environment as StripeEnv);
    try {
      await stripe.disputes.update(row.dispute_id as string, {
        evidence: { uncategorized_text: row.evidence_text as string },
        submit: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe submission failed";
      throw new Error(msg);
    }

    await supabaseAdmin
      .from("dispute_evidence_log")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", data.id);

    return { ok: true };
  });
