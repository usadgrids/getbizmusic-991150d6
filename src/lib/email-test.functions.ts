import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only QA test send of any registered email template. */
export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { templateKey: string; recipientEmail: string }) =>
    z
      .object({
        templateKey: z.string().min(1).max(80),
        recipientEmail: z.string().email().max(255),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden: admin role required");

    const { sendTestEmailInternal } = await import("@/lib/email-test.server");
    return await sendTestEmailInternal(data);
  });
