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
    repCode?: string;
  }) => {
    const schema = z.object({
      plan: z.enum(["image_5", "slider_10"]),
      customerEmail: z.string().email(),
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
      agreedTerms: z.literal(true, { message: "You must agree to the terms" }),
      agreedNoRefund: z.literal(true, { message: "You must agree to the no-refund policy" }),
      disclosureVersion: z.string().optional(),
      repCode: z.string().trim().max(24).optional(),
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
      const baseAmount = stripePrice.unit_amount ?? 0;

      // Validate rep code server-side
      let repId: string | null = null;
      let repCode: string | null = null;
      let commissionPercent: number | null = null;
      let discountCents = 0;
      let chargeAmount = baseAmount;
      if (data.repCode && data.repCode.trim().length > 0) {
        const codeNorm = data.repCode.toUpperCase().replace(/\s+/g, "");
        const { data: rep } = await supabaseAdmin
          .from("ad_reps")
          .select("id, code, commission_percent, active")
          .eq("code", codeNorm)
          .maybeSingle();
        if (rep && rep.active) {
          repId = rep.id;
          repCode = rep.code;
          commissionPercent = Number(rep.commission_percent);
          chargeAmount = Math.round(baseAmount * 0.5);
          discountCents = baseAmount - chargeAmount;
        }
      }
      const commissionCents = commissionPercent != null
        ? Math.round(chargeAmount * (commissionPercent / 100))
        : 0;

      const metadata: Record<string, string> = {
        plan: data.plan,
        customer_email: data.customerEmail,
        agreed_terms: "true",
        agreed_no_refund: "true",
        agreed_at: agreedAt,
        disclosure_version: disclosureVersion,
        disclosure_text: DISCLOSURE_SUMMARY,
        ...(repCode ? { rep_code: repCode, rep_id: repId ?? "", commission_percent: String(commissionPercent ?? 0), commission_cents: String(commissionCents), discount_cents: String(discountCents) } : {}),
      };

      // If a rep discount applies, use price_data so the discounted amount
      // shows on the Stripe checkout page too. Otherwise use the fixed price.
      const lineItem = discountCents > 0
        ? {
            price_data: {
              currency: stripePrice.currency,
              product_data: { name: product.name },
              unit_amount: chargeAmount,
            },
            quantity: 1,
          }
        : { price: stripePrice.id, quantity: 1 };

      const session = await stripe.checkout.sessions.create({
        line_items: [lineItem],
        mode: isRecurring && discountCents === 0 ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: data.customerEmail,
        metadata,
        ...(isRecurring && discountCents === 0
          ? { subscription_data: { metadata, description: product.name } }
          : {
              payment_intent_data: {
                description: product.name,
                receipt_email: data.customerEmail,
                statement_descriptor_suffix: "GETBIZMUSIC AD",
                metadata,
              },
            }),
      });

      // Persist consent immediately (pending payment). Webhook flips to paid later.
      const { error: insertError } = await supabaseAdmin.from("ad_payments").insert({
        stripe_session_id: session.id,
        customer_email: data.customerEmail,
        plan: data.plan,
        amount_cents: chargeAmount,
        status: "pending",
        environment: data.environment,
        agreed_terms: true,
        agreed_no_refund: true,
        agreed_at: agreedAt,
        disclosure_version: disclosureVersion,
        ip_address: ipAddress,
        rep_id: repId,
        rep_code: repCode,
        discount_cents: discountCents,
        commission_cents: commissionCents,
        commission_percent: commissionPercent,
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
          .select("submission_token, customer_email, plan, amount_cents")
          .maybeSingle();
        if (updated) {
          // Fallback: if the webhook hasn't landed yet, send the receipt from here too.
          // enqueueTransactionalEmailInternal is safe to call twice — the queue idempotency
          // key derived from sessionId prevents duplicate sends.
          try {
            const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
            const planLabels: Record<string, string> = {
              image_5: "Standard Image Ad",
              slider_10: "Featured Slider Ad",
            };
            await enqueueTransactionalEmailInternal({
              templateName: "payment-receipt",
              recipientEmail: updated.customer_email as string,
              idempotencyKey: `payment-receipt-${session.id}`,
              templateData: {
                planLabel: planLabels[updated.plan as string] ?? (updated.plan as string),
                amountFormatted: `$${(((updated.amount_cents as number) ?? 0) / 100).toFixed(2)}`,
                submitUrl: `https://www.getbizmusic.com/submit?token=${updated.submission_token}`,
              },
            });
          } catch (e) {
            console.error("fallback payment-receipt enqueue failed:", e);
          }
          return { token: updated.submission_token as string, email: updated.customer_email as string, status: "paid" };
        }
      }
      return { status: session.payment_status ?? "pending" };
    } catch (e) {
      console.error("lookupCheckoutBySession fallback failed:", e);
      return { status: "pending" };
    }
  });
