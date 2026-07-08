import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

const normalizeCode = (c: string) => c.toUpperCase().replace(/\s+/g, "");

export type RepRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  code: string;
  commission_percent: number;
  active: boolean;
  created_at: string;
  sales_count: number;
  gross_cents: number;
  discount_cents: number;
  commission_cents: number;
};

export const listReps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RepRow[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reps, error } = await supabaseAdmin
      .from("ad_reps")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: pays } = await supabaseAdmin
      .from("ad_payments")
      .select("rep_id, amount_cents, discount_cents, commission_cents, status")
      .not("rep_id", "is", null)
      .eq("status", "paid");

    const agg = new Map<string, { count: number; gross: number; disc: number; comm: number }>();
    for (const p of pays ?? []) {
      const key = p.rep_id as string;
      const cur = agg.get(key) ?? { count: 0, gross: 0, disc: 0, comm: 0 };
      cur.count += 1;
      cur.gross += p.amount_cents ?? 0;
      cur.disc += p.discount_cents ?? 0;
      cur.comm += p.commission_cents ?? 0;
      agg.set(key, cur);
    }

    return (reps ?? []).map((r) => {
      const a = agg.get(r.id) ?? { count: 0, gross: 0, disc: 0, comm: 0 };
      return {
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        phone: r.phone,
        email: r.email,
        code: r.code,
        commission_percent: Number(r.commission_percent),
        active: r.active,
        created_at: r.created_at,
        sales_count: a.count,
        gross_cents: a.gross,
        discount_cents: a.disc,
        commission_cents: a.comm,
      };
    });
  });

const repInputSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  code: z.string().trim().min(3).max(24).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
  commission_percent: z.number().min(0).max(100),
  active: z.boolean(),
});

export const createRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof repInputSchema>) => repInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ad_reps")
      .insert({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        email: data.email || null,
        code: normalizeCode(data.code),
        commission_percent: data.commission_percent,
        active: data.active,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message.includes("duplicate") ? "That code is already taken" : error.message);
    return row;
  });

export const updateRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof repInputSchema> & { id: string }) =>
    repInputSchema.extend({ id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ad_reps")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        email: data.email || null,
        code: normalizeCode(data.code),
        commission_percent: data.commission_percent,
        active: data.active,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message.includes("duplicate") ? "That code is already taken" : error.message);
    return { ok: true };
  });

export const deleteRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ad_reps").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRepOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { repId: string }) => z.object({ repId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("ad_payments")
      .select("id, created_at, paid_at, plan, amount_cents, discount_cents, commission_cents, commission_percent, customer_email, status")
      .eq("rep_id", data.repId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Public: validate a rep code without leaking identity.
export const validateRepCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => z.object({ code: z.string().trim().min(1).max(24) }).parse(d))
  .handler(async ({ data }): Promise<{ valid: boolean; discountPercent?: number; code?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = normalizeCode(data.code);
    const { data: rep } = await supabaseAdmin
      .from("ad_reps")
      .select("id, active")
      .eq("code", code)
      .maybeSingle();
    if (!rep || !rep.active) return { valid: false };
    return { valid: true, discountPercent: 50, code };
  });
