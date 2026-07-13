import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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

      // Duplicate-payment guard: reuse a recent pending design session's
      // clientSecret if the same email started one within the window.
      const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
      const sinceIso = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("design_orders")
        .select("stripe_session_id, created_at")
        .eq("customer_email", data.customerEmail)
        .eq("status", "pending")
        .eq("environment", data.environment)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent?.stripe_session_id) {
        try {
          const existing = await stripe.checkout.sessions.retrieve(recent.stripe_session_id);
          if (existing.status === "open" && existing.client_secret) {
            return { clientSecret: existing.client_secret };
          }
        } catch {
          // fall through
        }
      }

      const metadata: Record<string, string> = {
        order_type: "design",
        customer_email: data.customerEmail,
        agreed_terms: "true",
        agreed_no_refund: "true",
        agreed_at: agreedAt,
        disclosure_version: DESIGN_DISCLOSURE_VERSION,
      };

      const productName = "Get Biz Music Pro Ad Design";
      const description = `${productName} — ${data.customerEmail}`.slice(0, 350);

      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: productName },
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
          description,
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
            const { sendPaidOrderNotificationToProcessing } = await import("@/lib/email/paid-order-notification.server");
            const customerEmail = (updated.customer_email as string) || session.customer_email || "";
            await enqueueTransactionalEmailInternal({
              templateName: "design-receipt",
              recipientEmail: customerEmail,
              idempotencyKey: `design-receipt-${session.id}`,
              templateData: {
                amountFormatted: `$${(DESIGN_PRICE_CENTS / 100).toFixed(2)}`,
                orderNumber: session.id,
                billingEmail: customerEmail,
                intakeUrl: `https://www.getbizmusic.com/design/return?session_id=${session.id}`,
              },
            });

            // Notify processing team for paid design orders.
            await sendPaidOrderNotificationToProcessing({
              orderType: "design",
              email: customerEmail,
              amountCents: DESIGN_PRICE_CENTS,
              currency: session.currency ?? null,
              sessionId: session.id,
              paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
              paidAtIso: new Date().toISOString(),
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
        templateName: "design-order-notification",
        recipientEmail: "ralphposadas29@gmail.com",
        idempotencyKey: `design-intake-${data.sessionId}`,
        templateData: {
          businessName: data.intake.business_name,
          ownerName: data.intake.owner_name,
          ownerEmail: data.intake.owner_email,
          businessEmail: data.intake.business_email || "",
          customerEmail: row.customer_email as string,
          phone: data.intake.phone,
          websiteUrl: data.intake.website_url || "",
          services: data.intake.services,
          tagline: data.intake.tagline || "",
          colorPreferences: data.intake.color_preferences || "",
          logoPath: data.intake.logo_path || "",
          imagePaths: data.intake.image_paths ?? [],
          designBrief: data.intake.design_brief || "",
          notes: data.intake.notes || "",
          sessionId: data.sessionId,
          submittedAt: new Date().toISOString(),
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

// Admin: list all custom design orders (paid + intake_submitted), with signed URLs for uploaded assets.
export type DesignOrderRow = {
  id: string;
  stripe_session_id: string;
  customer_email: string;
  amount_cents: number;
  status: string;
  environment: string;
  paid_at: string | null;
  created_at: string;
  intake_submitted_at: string | null;
  completed_at: string | null;
  intake: {
    business_name?: string;
    owner_name?: string;
    owner_email?: string;
    business_email?: string;
    phone?: string;
    website_url?: string;
    services?: string;
    tagline?: string;
    color_preferences?: string;
    logo_path?: string;
    image_paths?: string[];
    design_brief?: string;
    notes?: string;
  } | null;
  logo_url?: string | null;
  image_urls?: string[];
};

export const listDesignOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DesignOrderRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Verify admin
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden: admin role required");

    const { data, error } = await supabaseAdmin
      .from("design_orders")
      .select("id, stripe_session_id, customer_email, amount_cents, status, environment, paid_at, created_at, intake_submitted_at, completed_at, intake")
      .in("status", ["paid", "intake_submitted"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const TTL = 60 * 60 * 24 * 7;
    const signOne = async (path?: string | null) => {
      if (!path) return null;
      const { data: s } = await supabaseAdmin.storage.from("ad-uploads").createSignedUrl(path, TTL);
      return s?.signedUrl ?? null;
    };

    return await Promise.all(
      (data ?? []).map(async (row) => {
        const intake = (row.intake ?? null) as DesignOrderRow["intake"];
        const logo_url = await signOne(intake?.logo_path);
        const image_urls = await Promise.all((intake?.image_paths ?? []).map((p) => signOne(p)));
        return {
          ...(row as any),
          intake,
          logo_url,
          image_urls: image_urls.filter((u): u is string => !!u),
        };
      }),
    );
  });

export const deleteDesignOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("id")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin role required");
    const { error } = await supabaseAdmin.from("design_orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDesignOrderCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; completed: boolean }) =>
    z.object({ id: z.string().uuid(), completed: z.boolean() }).parse(d)
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("id")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin role required");
    const { error } = await supabaseAdmin
      .from("design_orders")
      .update({ completed_at: data.completed ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
