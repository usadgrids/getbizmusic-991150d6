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
    const patch: Record<string, unknown> = {};
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
