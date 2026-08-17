import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Read-only helper used purely for error messaging: tells the UI which code
 * system a mistyped code actually belongs to. No redemption or state change.
 */
export const classifyCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data }): Promise<{ kind: "priority" | "activation" | "unknown" }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();

    const { data: launch } = await supabaseAdmin
      .from("launch_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (launch) return { kind: "priority" };

    const { data: activation } = await supabaseAdmin
      .from("activation_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (activation) return { kind: "activation" };

    return { kind: "unknown" };
  });
