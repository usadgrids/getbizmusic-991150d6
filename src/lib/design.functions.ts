import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

export const DESIGN_PRICE_CENTS = 4995;
export const DESIGN_DISCLOSURE_VERSION = "v1";

type CheckoutResult = { clientSecret: string } | { error: string };

function getClientIp(): string | null {
  try {
    const req = getRequest();
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]?.trim() ?? null;
    return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip");
  } catch {
    return null;
  }
}

export const createDesignCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: {
    customerEmail: string;
    returnUrl: string;
    environment: StripeEnv;
    agreedTerms: boolean;
    agreedNoRefund: boolean;
  }) =>
    z.object({
      customerEmail: z.string().email(),
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
      agreedTerms: z.literal(true, { message: "You must agree to the terms" }),
      agreedNoRefund: z.literal(true, { message: "You must agree to the no-refund policy" }),
    }).parse(data)
  )
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const stripe = createStripeClient(data.environment);
      const agreedAt = new Date().toISOString();
      const ipAddress = getClientIp();

      const metadata: Record<string, string> = {
        order_type: "design",
        customer_email: data.customerEmail,
        agreed_terms: "true",
        agreed_no_refund: "true",
        agreed_at: agreedAt,
        disclosure_version: DESIGN_DISCLOSURE_VERSION,
      };

      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: "Get Biz Music Pro Ad Design" },
            unit_amount: DESIGN_PRICE_CENTS,
          },
          quantity: 1,
        }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: data.customerEmail,
        metadata,
        payment_intent_data: {
          description: "Get Biz Music Pro Ad Design",
          receipt_email: data.customerEmail,
          statement_descriptor_suffix: "GETBIZMUSIC DSGN",
          metadata,
        },
      });

      const { error: insertError } = await supabaseAdmin.from("design_orders").insert({
        stripe_session_id: session.id,
        customer_email: data.customerEmail,
        amount_cents: DESIGN_PRICE_CENTS,
        status: "pending",
        environment: data.environment,
        agreed_terms: true,
        agreed_no_refund: true,
        agreed_at: agreedAt,
        disclosure_version: DESIGN_DISCLOSURE_VERSION,
        ip_address: ipAddress,
      });
      if (insertError) console.error("design_orders pre-insert failed:", insertError);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("createDesignCheckout error:", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

type DesignLookupResult = {
  status: string;
  id?: string;
  email?: string;
  intakeSubmitted?: boolean;
};

export const lookupDesignBySession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) =>
    z.object({ sessionId: z.string().min(1), environment: z.enum(["sandbox", "live"]) }).parse(data)
  )
  .handler(async ({ data }): Promise<DesignLookupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("design_orders")
      .select("id, customer_email, status, intake_submitted_at")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();

    if (row && (row.status === "paid" || row.status === "intake_submitted")) {
      return {
        status: row.status as string,
        id: row.id as string,
        email: row.customer_email as string,
        intakeSubmitted: !!row.intake_submitted_at,
      };
    }

    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (session.payment_status === "paid") {
        const { data: updated } = await supabaseAdmin
          .from("design_orders")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id)
          .select("id, customer_email, intake_submitted_at")
          .maybeSingle();

        if (updated) {
          // Fallback receipt send in case webhook hasn't landed
          try {
            const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
            await enqueueTransactionalEmailInternal({
              templateName: "design-receipt",
              recipientEmail: (updated.customer_email as string) || session.customer_email || "",
              idempotencyKey: `design-receipt-${session.id}`,
              templateData: {
                amountFormatted: `$${(DESIGN_PRICE_CENTS / 100).toFixed(2)}`,
                orderNumber: session.id,
                billingEmail: (updated.customer_email as string) || session.customer_email,
                intakeUrl: `https://www.getbizmusic.com/design/return?session_id=${session.id}`,
              },
            });
          } catch (e) {
            console.error("fallback design-receipt enqueue failed:", e);
          }
          return {
            status: "paid",
            id: updated.id as string,
            email: updated.customer_email as string,
            intakeSubmitted: !!updated.intake_submitted_at,
          };
        }
      }
      return { status: session.payment_status ?? "pending" };
    } catch (e) {
      console.error("lookupDesignBySession fallback failed:", e);
      return { status: "pending" };
    }
  });

const intakeSchema = z.object({
  sessionId: z.string().min(1),
  intake: z.object({
    business_name: z.string().trim().min(1).max(120),
    owner_name: z.string().trim().min(1).max(120),
    owner_email: z.string().trim().email().max(255),
    business_email: z.string().trim().max(255).optional().or(z.literal("")),
    phone: z.string().trim().min(7).max(40),
    website_url: z.string().trim().max(255).optional().or(z.literal("")),
    services: z.string().trim().min(1).max(500),
    tagline: z.string().trim().max(120).optional().or(z.literal("")),
    color_preferences: z.string().trim().max(300).optional().or(z.literal("")),
    logo_path: z.string().trim().max(500).optional().or(z.literal("")),
    image_paths: z.array(z.string().trim().max(500)).max(3).optional().default([]),
    design_brief: z.string().trim().max(2000).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  }),
});

export const submitDesignIntake = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof intakeSchema>) => intakeSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("design_orders")
      .select("id, status, customer_email")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (!row) return { ok: false, error: "Order not found" };
    if (row.status === "pending") return { ok: false, error: "Payment not yet confirmed" };

    const { error } = await supabaseAdmin
      .from("design_orders")
      .update({
        intake: data.intake,
        intake_submitted_at: new Date().toISOString(),
        status: "intake_submitted",
      })
      .eq("id", row.id as string);
    if (error) return { ok: false, error: error.message };

    // Notify admin via internal email
    try {
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmailInternal({
        templateName: "city-request-notification",
        recipientEmail: "ralphposadas29@gmail.com",
        idempotencyKey: `design-intake-${data.sessionId}`,
        templateData: {
          cityName: `DESIGN ORDER: ${data.intake.business_name}`,
          stateCode: `Customer: ${row.customer_email}`,
          requesterEmail: row.customer_email,
          notes: [
            `Owner: ${data.intake.owner_name}`,
            `Owner email: ${data.intake.owner_email}`,
            `Business email: ${data.intake.business_email || "n/a"}`,
            `Phone: ${data.intake.phone}`,
            `Website: ${data.intake.website_url || "n/a"}`,
            `Services: ${data.intake.services}`,
            `Tagline: ${data.intake.tagline || "n/a"}`,
            `Colors: ${data.intake.color_preferences || "n/a"}`,
            `Logo path: ${data.intake.logo_path || "n/a"}`,
            `Image paths: ${(data.intake.image_paths ?? []).join(", ") || "n/a"}`,
            `Design brief: ${data.intake.design_brief || "n/a"}`,
            `Notes: ${data.intake.notes || "n/a"}`,
          ].join("\n"),
        },
      });
    } catch (e) {
      console.error("design intake admin notification failed:", e);
    }

    return { ok: true };
  });

export const emailDesignIntakeLink = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) =>
    z.object({ sessionId: z.string().min(1), environment: z.enum(["sandbox", "live"]) }).parse(data)
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("design_orders")
      .select("id, status, customer_email")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (!row) return { ok: false, error: "Order not found" };
    if (row.status === "pending") return { ok: false, error: "Payment not yet confirmed" };

    try {
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmailInternal({
        templateName: "design-intake-link",
        recipientEmail: row.customer_email as string,
        idempotencyKey: `design-intake-link-${data.sessionId}`,
        templateData: {
          intakeUrl: `https://www.getbizmusic.com/design/return?session_id=${data.sessionId}`,
        },
      });
      return { ok: true };
    } catch (e) {
      console.error("emailDesignIntakeLink failed:", e);
      return { ok: false, error: e instanceof Error ? e.message : "Email failed" };
    }
  });
