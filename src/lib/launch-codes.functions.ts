import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LaunchCodeRow = {
  id: string;
  code: string;
  is_active: boolean;
  redemption_count: number;
  redemption_limit: number;
  locked_price: number;
};

export type ClaimRow = {
  id: string;
  business_name: string;
  business_category: string | null;
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
  status: string;
  priority: boolean;
  founding_member: boolean;
  launch_code_used: string | null;
  locked_price: number | null;
  submitted_at: string;
};

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

export const adminListLaunchCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("launch_codes")
      .select("id, code, is_active, redemption_count, redemption_limit, locked_price")
      .order("code");
    return (data ?? []) as LaunchCodeRow[];
  });

export const adminUpdateLaunchCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        isActive: z.boolean().optional(),
        redemptionLimit: z.number().int().min(0).max(1_000_000).optional(),
      })
      .parse(d),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { is_active?: boolean; redemption_limit?: number } = {};
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.redemptionLimit !== undefined) patch.redemption_limit = data.redemptionLimit;
    const { error } = await supabaseAdmin.from("launch_codes").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Claims queue — priority (launch-code) submissions first. */
export const adminListClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("business_claims")
      .select(
        "id, business_name, business_category, owner_name, owner_email, owner_phone, status, priority, founding_member, launch_code_used, locked_price, submitted_at",
      )
      .order("priority", { ascending: false })
      .order("submitted_at", { ascending: false })
      .limit(200);
    return (data ?? []) as ClaimRow[];
  });

/**
 * Mark a claim's AI Visibility Audit as complete and notify the owner by email.
 * Idempotent: if the audit is already complete, it just re-sends the notification.
 */
export const markClaimAuditComplete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      claimId: z.string().uuid(),
      auditScore: z.string().trim().max(20).optional(),
    }).parse(d),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("business_claims")
      .select("id, business_name, business_category, owner_name, owner_email, status")
      .eq("id", data.claimId)
      .maybeSingle();
    if (error || !row) throw new Error(error?.message ?? "Claim not found");

    // Update status so admins can see which claims have been audited.
    if (row.status !== "audit_complete") {
      await supabaseAdmin
        .from("business_claims")
        .update({ status: "audit_complete", updated_at: new Date().toISOString() })
        .eq("id", data.claimId);
    }

    // Send the notification email.
    try {
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmailInternal({
        templateName: "claim-audit-complete",
        recipientEmail: row.owner_email as string,
        idempotencyKey: `claim-audit-complete-${row.id}-${Date.now()}`,
        templateData: {
          ownerName: (row.owner_name as string) || undefined,
          businessName: (row.business_name as string) || undefined,
          businessCategory: (row.business_category as string) || undefined,
          auditScore: data.auditScore || undefined,
          hubUrl: "https://www.getbizmusic.com/sdcounty",
        },
      });
    } catch (e) {
      console.error("claim audit complete email failed:", e);
      throw new Error("Claim marked complete, but notification email failed to send.");
    }

    return { ok: true as const };
  });
