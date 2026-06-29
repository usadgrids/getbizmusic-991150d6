import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const PLAN_TO_PRICE = {
  image_5: "ad_7s_annual",
  slider_10: "ad_10s_annual",
} as const;

type CheckoutResult = { clientSecret: string } | { error: string };

export const createAdCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: { plan: "image_5" | "slider_10"; customerEmail: string; returnUrl: string; environment: StripeEnv }) => {
    const schema = z.object({
      plan: z.enum(["image_5", "slider_10"]),
      customerEmail: z.string().email(),
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
    });
    return schema.parse(data);
  })
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const lookupKey = PLAN_TO_PRICE[data.plan];
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey] });
      if (!prices.data.length) throw new Error(`Price ${lookupKey} not found`);
      const stripePrice = prices.data[0];

      const productId = typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: stripePrice.type === "recurring" ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: data.customerEmail,
        metadata: { plan: data.plan, customer_email: data.customerEmail },
        ...(stripePrice.type === "recurring"
          ? { subscription_data: { metadata: { plan: data.plan, customer_email: data.customerEmail } } }
          : { payment_intent_data: { description: product.name } }),
      });

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
    // Try our DB first (webhook may have already run)
    const { data: row } = await supabaseAdmin
      .from("ad_payments")
      .select("submission_token, customer_email, status")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (row && row.status === "paid") {
      return { token: row.submission_token as string, email: row.customer_email as string, status: "paid" };
    }
    // Fall back to Stripe (in case webhook hasn't arrived yet)
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (session.payment_status === "paid") {
        // Upsert manually so the return page works even before webhook
        const plan = (session.metadata?.plan as "image_5" | "slider_10") ?? "image_5";
        const email = session.customer_email ?? session.customer_details?.email ?? session.metadata?.customer_email ?? "";
        const amount = session.amount_total ?? 0;
        const { data: upserted } = await supabaseAdmin
          .from("ad_payments")
          .upsert(
            {
              stripe_session_id: session.id,
              customer_email: email,
              plan,
              amount_cents: amount,
              status: "paid",
              environment: data.environment,
              paid_at: new Date().toISOString(),
            },
            { onConflict: "stripe_session_id" }
          )
          .select("submission_token, customer_email")
          .maybeSingle();
        if (upserted) {
          return { token: upserted.submission_token as string, email: upserted.customer_email as string, status: "paid" };
        }
      }
      return { status: session.payment_status ?? "pending" };
    } catch (e) {
      console.error("lookupCheckoutBySession fallback failed:", e);
      return { status: "pending" };
    }
  });
