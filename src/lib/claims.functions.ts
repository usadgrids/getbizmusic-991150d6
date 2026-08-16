import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkRateLimit } from "./rate-limit.server";

const claimSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  businessCategory: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
  website: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
  googlePlaceId: z.string().trim().max(200).optional(),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email().max(255),
  ownerPhone: z.string().trim().max(40).optional(),
  wantsAiAudit: z.boolean().default(false),
  wantsAdDesign: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional(),
  sourceCategoryPage: z.string().trim().max(60).optional(),
  launchCode: z.string().trim().max(40).optional(),
});

export const submitBusinessClaim = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => claimSchema.parse(data))
  .handler(async ({ data }) => {
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!checkRateLimit(`claim:${ip}`, 5, 300_000)) {
      return { ok: false as const, error: "Too many submissions. Please try again shortly." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Launch code: redeem atomically. Never blocks the claim — an invalid,
    // deactivated or fully-redeemed code simply isn't applied.
    let launchApplied = false;
    let lockedPrice: number | null = null;
    if (data.launchCode) {
      const { data: redeemed } = await supabaseAdmin.rpc("redeem_launch_code", {
        _code: data.launchCode,
      });
      const row = Array.isArray(redeemed) ? redeemed[0] : redeemed;
      if (row?.applied) {
        launchApplied = true;
        lockedPrice = row.locked_price ?? null;
      }
    }

    const { error } = await supabaseAdmin.from("business_claims").insert({
      launch_code_used: launchApplied ? data.launchCode!.trim().toUpperCase() : null,
      founding_member: launchApplied,
      priority: launchApplied,
      locked_price: lockedPrice,
      business_name: data.businessName,
      business_category: data.businessCategory ?? null,
      address: data.address ?? null,
      website: data.website ?? null,
      phone: data.phone ?? null,
      google_place_id: data.googlePlaceId ?? null,
      owner_name: data.ownerName,
      owner_email: data.ownerEmail.toLowerCase(),
      owner_phone: data.ownerPhone ?? null,
      wants_ai_audit: data.wantsAiAudit,
      wants_ad_design: data.wantsAdDesign,
      notes: data.notes ?? null,
      source_category_page: data.sourceCategoryPage ?? null,
    });

    if (error) {
      console.error("business claim insert failed", error.message);
      return { ok: false as const, error: "We couldn't save your claim. Please try again." };
    }

    try {
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmailInternal({
        templateName: "business-claim-confirmation",
        recipientEmail: data.ownerEmail,
        templateData: {
          ownerName: data.ownerName,
          businessName: data.businessName,
          businessCategory: data.businessCategory,
          address: data.address,
          wantsAiAudit: data.wantsAiAudit,
          wantsAdDesign: data.wantsAdDesign,
        },
      });
    } catch (err) {
      console.error("claim confirmation email failed", err);
    }

    return {
      ok: true as const,
      launchApplied,
      lockedPrice,
      launchMessage:
        data.launchCode && !launchApplied
          ? "This launch code is no longer active, but you can still submit your claim."
          : null,
    };
  });
