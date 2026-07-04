import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const PLAN_TO_PRICE = {
  image_5: "ad_7s_annual",
  slider_10: "ad_10s_annual",
} as const;

export const DISCLOSURE_VERSION = "v1";
export const DISCLOSURE_SUMMARY =
  "Novelty 1-year ad display, no performance guarantee, no refunds per CA Civil Code 1723. Buyer confirmed via checkbox before payment.";

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

export const createAdCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: {
    plan: "image_5" | "slider_10";
    customerEmail: string;
    returnUrl: string;
    environment: StripeEnv;
    agreedTerms: boolean;
    agreedNoRefund: boolean;
    disclosureVersion?: string;
  }) => {
    const schema = z.object({
      plan: z.enum(["image_5", "slider_10"]),
      customerEmail: z.string().email(),
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
      agreedTerms: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
      agreedNoRefund: z.literal(true, { errorMap: () => ({ message: "You must agree to the no-refund policy" }) }),
      disclosureVersion: z.string().optional(),
    });
    return schema.parse(data);
  })
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const stripe = createStripeClient(data.environment);
      const lookupKey = PLAN_TO_PRICE[data.plan];
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey] });
      if (!prices.data.length) throw new Error(`Price ${lookupKey} not found`);
      const stripePrice = prices.data[0];

      const productId = typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);

      const agreedAt = new Date().toISOString();
      const disclosureVersion = data.disclosureVersion ?? DISCLOSURE_VERSION;
      const ipAddress = getClientIp();
      const isRecurring = stripePrice.type === "recurring";

      const metadata: Record<string, string> = {
        plan: data.plan,
        customer_email: data.customerEmail,
        agreed_terms: "true",
        agreed_no_refund: "true",
        agreed_at: agreedAt,
        disclosure_version: disclosureVersion,
        disclosure_text: DISCLOSURE_SUMMARY,
      };

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: data.customerEmail,
        metadata,
        ...(isRecurring
          ? { subscription_data: { metadata, description: product.name } }
          : {
              payment_intent_data: {
                description: product.name,
                receipt_email: data.customerEmail,
                statement_descriptor_suffix: "WINALL MEDIA AD",
                metadata,
              },
            }),
      });

      // Persist consent immediately (pending payment). Webhook flips to paid later.
      const { error: insertError } = await supabaseAdmin.from("ad_payments").insert({
        stripe_session_id: session.id,
        customer_email: data.customerEmail,
        plan: data.plan,
        amount_cents: stripePrice.unit_amount ?? 0,
        status: "pending",
        environment: data.environment,
        agreed_terms: true,
        agreed_no_refund: true,
        agreed_at: agreedAt,
        disclosure_version: disclosureVersion,
        ip_address: ipAddress,
      });
      if (insertError) {
        console.error("ad_payments pre-insert failed:", insertError);
      }

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("createAdCheckout error:", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

type TokenLookupResult =
  | { found: true; token: string; plan: "image_5" | "slider_10"; email: string; tokenUsed: boolean }
  | { found: false; reason: string };

export const getPaymentByToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<TokenLookupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ad_payments")
      .select("submission_token, plan, customer_email, token_used, status")
      .eq("submission_token", data.token)
      .maybeSingle();
    if (error || !row) return { found: false, reason: "Invalid or unknown token" };
    if (row.status !== "paid") return { found: false, reason: "Payment not yet confirmed" };
    return {
      found: true,
      token: row.submission_token as string,
      plan: row.plan as "image_5" | "slider_10",
      email: row.customer_email as string,
      tokenUsed: row.token_used as boolean,
    };
  });

export const lookupCheckoutBySession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) =>
    z.object({ sessionId: z.string().min(1), environment: z.enum(["sandbox", "live"]) }).parse(data)
  )
  .handler(async ({ data }): Promise<{ token?: string; email?: string; status: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("ad_payments")
      .select("submission_token, customer_email, status")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (row && row.status === "paid") {
      return { token: row.submission_token as string, email: row.customer_email as string, status: "paid" };
    }
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (session.payment_status === "paid") {
        const { data: updated } = await supabaseAdmin
          .from("ad_payments")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id)
          .select("submission_token, customer_email")
          .maybeSingle();
        if (updated) {
          return { token: updated.submission_token as string, email: updated.customer_email as string, status: "paid" };
        }
      }
      return { status: session.payment_status ?? "pending" };
    } catch (e) {
      console.error("lookupCheckoutBySession fallback failed:", e);
      return { status: "pending" };
    }
  });
