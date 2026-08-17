import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { AD_PLANS } from "@/lib/biz-utils";
import { DESIGN_PRICE_CENTS } from "@/lib/design.functions";
import { membershipActivatedFields, membershipPendingFields } from "@/lib/membership-lifecycle";

const ZELLE_PHONE = "619-707-0467";

// Window (in ms) during which a repeat createAdCheckout call from the same
// email+plan reuses the previously-created pending Stripe session instead of
// creating a new one. Guards against double-click / back-button duplicate charges.
const DUPLICATE_CHECKOUT_WINDOW_MS = 5 * 60 * 1000;

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
    designAddon?: boolean;
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
      designAddon: z.boolean().optional(),
    });
    return schema.parse(data);
  })
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const stripe = createStripeClient(data.environment);

      const agreedAt = new Date().toISOString();
      const disclosureVersion = data.disclosureVersion ?? DISCLOSURE_VERSION;
      const ipAddress = getClientIp();

      // Single source of truth for pricing.
      const planMeta = AD_PLANS[data.plan];
      const productName = `Get Biz Music — ${planMeta.label}`;
      const baseAmount = planMeta.price * 100;

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

      // Optional done-for-you ad design add-on (flat rate, never discounted).
      const designAddon = data.designAddon === true;
      const designCents = designAddon ? DESIGN_PRICE_CENTS : 0;
      const totalAmount = chargeAmount + designCents;

      // Duplicate-payment guard: if the same email+plan started a checkout very
      // recently and it's still pending, reuse that Stripe session's clientSecret
      // instead of creating another one.
      const sinceIso = new Date(Date.now() - DUPLICATE_CHECKOUT_WINDOW_MS).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("ad_payments")
        .select("stripe_session_id, amount_cents, created_at")
        .eq("customer_email", data.customerEmail)
        .eq("plan", data.plan)
        .eq("status", "pending")
        .eq("environment", data.environment)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent?.stripe_session_id && (recent.amount_cents ?? 0) === totalAmount) {
        try {
          const existing = await stripe.checkout.sessions.retrieve(recent.stripe_session_id);
          if (existing.status === "open" && existing.client_secret) {
            return { clientSecret: existing.client_secret };
          }
        } catch (e) {
          // Session missing/expired — fall through and create a fresh one.
        }
      }

      const metadata: Record<string, string> = {
        plan: data.plan,
        customer_email: data.customerEmail,
        agreed_terms: "true",
        agreed_no_refund: "true",
        agreed_at: agreedAt,
        disclosure_version: disclosureVersion,
        disclosure_text: DISCLOSURE_SUMMARY,
        design_addon: designAddon ? "true" : "false",
        ...(repCode ? { rep_code: repCode, rep_id: repId ?? "", commission_percent: String(commissionPercent ?? 0), commission_cents: String(commissionCents), discount_cents: String(discountCents) } : {}),
      };

      const lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: { name: productName },
            unit_amount: chargeAmount,
          },
          quantity: 1,
        },
        ...(designAddon
          ? [{
              price_data: {
                currency: "usd",
                product_data: { name: "Pro Ad Design — done-for-you artwork" },
                unit_amount: designCents,
              },
              quantity: 1,
            }]
          : []),
      ];

      const descriptionParts = [
        productName,
        `${planMeta.seconds}s rotation`,
        ...(designAddon ? ["+ Pro Ad Design"] : []),
        data.customerEmail,
      ];
      if (repCode) descriptionParts.push(`rep:${repCode}`);
      const description = descriptionParts.join(" — ").slice(0, 350);

      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: data.customerEmail,
        metadata,
        payment_intent_data: {
          description,
          receipt_email: data.customerEmail,
          statement_descriptor_suffix: "GETBIZMUSIC AD",
          metadata,
        },
      });

      // Persist consent immediately (pending payment). Webhook flips to paid later.
      const { error: insertError } = await supabaseAdmin.from("ad_payments").insert({
        stripe_session_id: session.id,
        customer_email: data.customerEmail,
        plan: data.plan,
        amount_cents: totalAmount,
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
        design_addon: designAddon,
        ...membershipPendingFields("card", agreedAt),
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
  | { found: true; token: string; plan: "image_5" | "slider_10"; email: string; tokenUsed: boolean; freeReligious: boolean; designAddon: boolean }
  | { found: false; reason: string };

export const getPaymentByToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<TokenLookupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ad_payments")
      .select("submission_token, plan, customer_email, token_used, status, amount_cents, design_addon")
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
      freeReligious: Number(row.amount_cents ?? 0) === 0,
      designAddon: row.design_addon === true,
    };
  });

const RELIGIOUS_INDUSTRIES = ["church", "religious_services", "ministry"] as const;

export const createFreeReligiousSubmission = createServerFn({ method: "POST" })
  .inputValidator((data: {
    industry: string;
    customerEmail: string;
    agreedTerms: boolean;
    agreedNovelty: boolean;
    environment: StripeEnv;
  }) =>
    z.object({
      industry: z.enum(RELIGIOUS_INDUSTRIES),
      customerEmail: z.string().trim().email().max(255),
      agreedTerms: z.literal(true, { message: "You must agree to the terms" }),
      agreedNovelty: z.literal(true, { message: "You must acknowledge the novelty terms" }),
      environment: z.enum(["sandbox", "live"]),
    }).parse(data)
  )
  .handler(async ({ data }): Promise<{ token: string } | { error: string }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const agreedAt = new Date().toISOString();
      const ipAddress = getClientIp();
      const syntheticSession = `free-religious-${crypto.randomUUID()}`;
      const { data: inserted, error } = await supabaseAdmin
        .from("ad_payments")
        .insert({
          stripe_session_id: syntheticSession,
          customer_email: data.customerEmail,
          plan: "slider_10",
          amount_cents: 0,
          status: "paid",
          paid_at: agreedAt,
          // Use the caller's real environment (live vs sandbox) so free-religious
          // rows don't pollute prod reporting with a hardcoded "sandbox" tag.
          environment: data.environment,
          agreed_terms: true,
          agreed_no_refund: true,
          agreed_at: agreedAt,
          disclosure_version: DISCLOSURE_VERSION,
          ip_address: ipAddress,
          payment_method: "card",
          terms_accepted_at: agreedAt,
          ...membershipActivatedFields(agreedAt),
        })
        .select("submission_token")
        .maybeSingle();
      if (error || !inserted?.submission_token) {
        return { error: error?.message ?? "Could not create free ministry spot" };
      }
      return { token: inserted.submission_token as string };
    } catch (e) {
      console.error("createFreeReligiousSubmission error:", e);
      return { error: e instanceof Error ? e.message : "Unexpected error" };
    }
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
      const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
        expand: ["payment_intent", "payment_intent.latest_charge"],
      });
      if (session.payment_status === "paid") {
        const { data: updated } = await supabaseAdmin
          .from("ad_payments")
          .update((() => { const nowIso = new Date().toISOString(); return { status: "paid", paid_at: nowIso, ...membershipActivatedFields(nowIso) }; })())
          .eq("stripe_session_id", session.id)
          .select("id, submission_token, customer_email, plan, amount_cents")
          .maybeSingle();
        if (updated) {
          // Fallback: if the webhook hasn't landed yet, send the receipt from here too.
          // enqueueTransactionalEmailInternal is safe to call twice — the queue idempotency
          // key derived from sessionId prevents duplicate sends.
          try {
            const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
            const { sendPaidOrderNotificationToProcessing } = await import("@/lib/email/paid-order-notification.server");
            const plan = updated.plan as string;
            const planLabels: Record<string, string> = {
              image_5: "Standard Image Ad",
              slider_10: "Featured Slider Ad",
            };
            const planSeconds: Record<string, number> = {
              image_5: 7,
              slider_10: 10,
            };

            const paymentIntent: any =
              typeof session.payment_intent === "string" ? null : session.payment_intent;
            const charge: any =
              paymentIntent?.latest_charge && typeof paymentIntent.latest_charge === "object"
                ? paymentIntent.latest_charge
                : null;
            const paidAtIso = typeof charge?.created === "number"
              ? new Date(charge.created * 1000).toISOString()
              : new Date().toISOString();
            const paymentDate = new Date(paidAtIso).toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "America/Los_Angeles",
            }) + " PT";
            const cardDetails = charge?.payment_method_details?.card;
            const customerEmail = (updated.customer_email as string) || session.customer_email || session.customer_details?.email;

            // Membership receipt (card) — idempotent via the stored receipt number.
            if (customerEmail && updated.id) {
              try {
                const { sendMembershipReceiptEmail } = await import(
                  "@/lib/email/membership-emails.server"
                );
                await sendMembershipReceiptEmail({
                  paymentId: updated.id as string,
                  email: customerEmail,
                  paidAtIso,
                  paymentMethodLabel: "Card",
                });
              } catch (e) {
                console.error("membership receipt email failed:", e);
              }
            }
            await enqueueTransactionalEmailInternal({
              templateName: "payment-receipt",
              recipientEmail: customerEmail as string,
              idempotencyKey: `payment-receipt-${session.id}`,
              templateData: {
                planLabel: planLabels[plan] ?? plan,
                rotationSeconds: planSeconds[plan] ?? undefined,
                amountFormatted: `$${(((updated.amount_cents as number) ?? 0) / 100).toFixed(2)}`,
                currency: session.currency ?? "usd",
                orderNumber: session.id,
                paymentIntentId: paymentIntent?.id ?? (typeof session.payment_intent === "string" ? session.payment_intent : undefined),
                paymentDate,
                cardholderName: charge?.billing_details?.name ?? session.customer_details?.name ?? undefined,
                cardBrand: cardDetails?.brand ?? undefined,
                cardLast4: cardDetails?.last4 ?? undefined,
                billingEmail: customerEmail,
                submitUrl: `https://www.getbizmusic.com/submit?token=${updated.submission_token}`,
                receiptUrl: charge?.receipt_url ?? undefined,
              },
            });

            // Notify processing team for paid ad orders (skip free religious spots).
            const amountCents = (updated.amount_cents as number) ?? 0;
            if (amountCents > 0 && !session.id.startsWith("free-religious-")) {
              await sendPaidOrderNotificationToProcessing({
                orderType: "ad",
                email: customerEmail as string,
                plan,
                amountCents,
                currency: session.currency ?? null,
                sessionId: session.id,
                submissionToken: updated.submission_token as string,
                paymentIntentId: paymentIntent?.id ?? (typeof session.payment_intent === "string" ? session.payment_intent : null),
                receiptUrl: charge?.receipt_url ?? null,
                cardholderName: charge?.billing_details?.name ?? session.customer_details?.name ?? null,
                cardBrand: cardDetails?.brand ?? null,
                cardLast4: cardDetails?.last4 ?? null,
                paidAtIso,
              });
            }
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

/* ============================================================
   Zelle payment path — completely independent of Stripe.
   Buyer submits contact info + optional rep code, we create a
   pending order + submission token immediately, email the Zelle
   payment instructions, and admin reconciles later in /admin.
   ============================================================ */

const zelleInputSchema = z.object({
  plan: z.enum(["image_5", "slider_10"]),
  ownerName: z.string().trim().min(1).max(120),
  businessName: z.string().trim().min(1).max(160),
  customerEmail: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(40),
  agreedTerms: z.literal(true, { message: "You must agree to the terms" }),
  agreedNoRefund: z.literal(true, { message: "You must agree to the no-refund policy" }),
  environment: z.enum(["sandbox", "live"]),
  repCode: z.string().trim().max(24).optional(),
  designAddon: z.boolean().optional(),
});

type ZelleOrderResult =
  | {
      ok: true;
      token: string;
      memoCode: string;
      amountCents: number;
      amountFormatted: string;
      zellePhone: string;
      submitUrl: string;
    }
  | { ok: false; error: string };

export const createZelleAdOrder = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof zelleInputSchema>) => zelleInputSchema.parse(d))
  .handler(async ({ data }): Promise<ZelleOrderResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const agreedAt = new Date().toISOString();
      const ipAddress = getClientIp();

      // Pricing from single source of truth.
      const planMeta = AD_PLANS[data.plan];
      const baseAmount = planMeta.price * 100;
      const productName = `Get Biz Music — ${planMeta.label}`;

      // Rep code validation (same rules as Stripe path).
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

      // Optional done-for-you ad design add-on (flat rate, never discounted).
      const designAddon = data.designAddon === true;
      const designCents = designAddon ? DESIGN_PRICE_CENTS : 0;
      const totalAmount = chargeAmount + designCents;

      // Duplicate-order guard: reuse an in-flight Zelle order from the same
      // email+plan within the last 15 minutes to prevent double-clicks
      // creating two pending orders.
      const DUP_WINDOW_MS = 15 * 60 * 1000;
      const sinceIso = new Date(Date.now() - DUP_WINDOW_MS).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("ad_payments")
        .select("stripe_session_id, submission_token, amount_cents")
        .eq("customer_email", data.customerEmail)
        .eq("plan", data.plan)
        .eq("payment_method", "zelle")
        .eq("status", "awaiting_zelle")
        .eq("environment", data.environment)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent?.submission_token && (recent.amount_cents ?? 0) === totalAmount) {
        const memo = String(recent.stripe_session_id).replace(/^zelle-/, "").slice(0, 8).toUpperCase();
        return {
          ok: true,
          token: recent.submission_token as string,
          memoCode: memo,
          amountCents: totalAmount,
          amountFormatted: `$${(totalAmount / 100).toFixed(2)}`,
          zellePhone: ZELLE_PHONE,
          submitUrl: `https://www.getbizmusic.com/submit?token=${recent.submission_token}`,
        };
      }

      const syntheticSession = `zelle-${crypto.randomUUID()}`;
      const memoCode = syntheticSession.replace(/^zelle-/, "").slice(0, 8).toUpperCase();

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("ad_payments")
        .insert({
          stripe_session_id: syntheticSession,
          customer_email: data.customerEmail,
          plan: data.plan,
          amount_cents: totalAmount,
          status: "awaiting_zelle",
          design_addon: designAddon,
          environment: data.environment,

          owner_name: data.ownerName,
          business_name: data.businessName,
          phone: data.phone,
          agreed_terms: true,
          agreed_no_refund: true,
          agreed_at: agreedAt,
          disclosure_version: DISCLOSURE_VERSION,
          ip_address: ipAddress,
          rep_id: repId,
          rep_code: repCode,
          discount_cents: discountCents,
          commission_cents: commissionCents,
          commission_percent: commissionPercent,
          ...membershipPendingFields("zelle", agreedAt),
        })
        .select("submission_token")
        .maybeSingle();

      if (insertError || !inserted?.submission_token) {
        console.error("createZelleAdOrder insert failed:", insertError);
        return { ok: false, error: insertError?.message ?? "Could not create Zelle order" };
      }

      const token = inserted.submission_token as string;
      const submitUrl = `https://www.getbizmusic.com/submit?token=${token}`;
      const designUrl = `https://www.getbizmusic.com/design`;
      const amountFormatted = `$${(totalAmount / 100).toFixed(2)}`;

      // Fire-and-forget instructions email — never block order creation.
      try {
        const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
        await enqueueTransactionalEmailInternal({
          templateName: "zelle-instructions",
          recipientEmail: data.customerEmail,
          idempotencyKey: `zelle-instructions-${syntheticSession}`,
          templateData: {
            contactName: data.ownerName,
            planLabel: productName,
            rotationSeconds: planMeta.seconds,
            amountFormatted,
            designAddon,
            adSpotFormatted: `$${(chargeAmount / 100).toFixed(2)}`,
            zellePhone: ZELLE_PHONE,
            memoCode,
            submitUrl,
            designUrl,
            designPriceFormatted: `$${(DESIGN_PRICE_CENTS / 100).toFixed(2)}`,
            repCode,
            discountFormatted: discountCents > 0 ? `$${(discountCents / 100).toFixed(2)}` : null,
            ownerName: data.ownerName,
            businessName: data.businessName,
            phone: data.phone,
            billingEmail: data.customerEmail,
            zelleQrUrl: "https://www.getbizmusic.com/__l5e/assets-v1/9a996bbf-8aeb-48a7-8ac5-1db406351740/zelle-qr.jpeg",
          },
        });
      } catch (e) {
        console.error("zelle-instructions enqueue failed (order still created):", e);
      }

      // Stage 1 membership acknowledgment — payment verification pending.
      try {
        const { sendMembershipPendingVerificationEmail } = await import(
          "@/lib/email/membership-emails.server"
        );
        await sendMembershipPendingVerificationEmail({
          email: data.customerEmail,
          ownerName: data.ownerName,
          businessName: data.businessName,
          paymentMethodLabel: "Zelle",
          amountFormatted,
          memoCode,
          idempotencyKey: `membership-pending-${syntheticSession}`,
        });
      } catch (e) {
        console.error("membership pending-verification email failed:", e);
      }

      return {
        ok: true,
        token,
        memoCode,
        amountCents: totalAmount,
        amountFormatted,
        zellePhone: ZELLE_PHONE,
        submitUrl,
      };
    } catch (e) {
      console.error("createZelleAdOrder error:", e);
      return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
    }
  });

// ---- Pay Later (Bill Me) -------------------------------------------------

const payLaterInputSchema = zelleInputSchema; // same fields as Zelle

type PayLaterOrderResult =
  | {
      ok: true;
      token: string;
      invoiceNumber: string;
      amountCents: number;
      amountFormatted: string;
      dueDateFormatted: string;
      payNowUrl: string;
      submitUrl: string;
    }
  | { ok: false; error: string };

export const createPayLaterOrder = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof payLaterInputSchema>) => payLaterInputSchema.parse(d))
  .handler(async ({ data }): Promise<PayLaterOrderResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { industryLabel } = await import("@/lib/business-categories");
      const agreedAt = new Date().toISOString();
      const ipAddress = getClientIp();

      // Rep code validation (same rules as Zelle).
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

      const designAddon = data.designAddon === true;
      const designCents = designAddon ? DESIGN_PRICE_CENTS : 0;
      const totalAmount = chargeAmount + designCents;
      const amountFormatted = `$${(totalAmount / 100).toFixed(2)}`;

      // Duplicate-order guard (same window logic as Zelle).
      const DUP_WINDOW_MS = 15 * 60 * 1000;
      const sinceIso = new Date(Date.now() - DUP_WINDOW_MS).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("ad_payments")
        .select("stripe_session_id, submission_token, amount_cents")
        .eq("customer_email", data.customerEmail)
        .eq("plan", data.plan)
        .eq("payment_method", "pay_later")
        .eq("status", "awaiting_payment")
        .eq("environment", data.environment)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent?.submission_token && (recent.amount_cents ?? 0) === totalAmount) {
        const invoice = String(recent.stripe_session_id).replace(/^pay-later-/, "").slice(0, 8).toUpperCase();
        const token = recent.submission_token as string;
        return {
          ok: true,
          token,
          invoiceNumber: invoice,
          amountCents: totalAmount,
          amountFormatted,
          dueDateFormatted: new Date(Date.now() + 7 * 86400_000).toLocaleDateString("en-US", {
            dateStyle: "long",
            timeZone: "America/Los_Angeles",
          }),
          payNowUrl: `https://www.getbizmusic.com/pricing`,
          submitUrl: `https://www.getbizmusic.com/submit?token=${token}`,
        };
      }

      const syntheticSession = `pay-later-${crypto.randomUUID()}`;
      const invoiceNumber = syntheticSession.replace(/^pay-later-/, "").slice(0, 8).toUpperCase();
      const dueDate = new Date(Date.now() + 7 * 86400_000);
      const dueDateFormatted = dueDate.toLocaleDateString("en-US", {
        dateStyle: "long",
        timeZone: "America/Los_Angeles",
      });

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("ad_payments")
        .insert({
          stripe_session_id: syntheticSession,
          customer_email: data.customerEmail,
          plan: data.plan,
          amount_cents: totalAmount,
          status: "awaiting_payment",
          design_addon: designAddon,
          environment: data.environment,
          owner_name: data.ownerName,
          business_name: data.businessName,
          phone: data.phone,
          agreed_terms: true,
          agreed_no_refund: true,
          agreed_at: agreedAt,
          disclosure_version: DISCLOSURE_VERSION,
          ip_address: ipAddress,
          rep_id: repId,
          rep_code: repCode,
          discount_cents: discountCents,
          commission_cents: commissionCents,
          commission_percent: commissionPercent,
          ...membershipPendingFields("pay_later", agreedAt),
        })
        .select("submission_token")
        .maybeSingle();

      if (insertError || !inserted?.submission_token) {
        console.error("createPayLaterOrder insert failed:", insertError);
        return { ok: false, error: insertError?.message ?? "Could not create Pay Later order" };
      }

      const token = inserted.submission_token as string;
      const submitUrl = `https://www.getbizmusic.com/submit?token=${token}`;
      const payNowUrl = `https://www.getbizmusic.com/pricing`;
      const categoryLabel = industryLabel(data.industry) || undefined;

      // Send the Pay Later confirmation email.
      try {
        const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
        await enqueueTransactionalEmailInternal({
          templateName: "membership-pay-later",
          recipientEmail: data.customerEmail,
          idempotencyKey: `pay-later-${syntheticSession}`,
          templateData: {
            ownerName: data.ownerName,
            businessName: data.businessName,
            categoryLabel,
            amountFormatted,
            invoiceNumber,
            dueDateFormatted,
            payNowUrl,
            zellePhone: ZELLE_PHONE,
            venmoHandle: "@RTPosadas",
          },
        });
      } catch (e) {
        console.error("pay-later confirmation email failed (order still created):", e);
      }

      return {
        ok: true,
        token,
        invoiceNumber,
        amountCents: totalAmount,
        amountFormatted,
        dueDateFormatted,
        payNowUrl,
        submitUrl,
      };
    } catch (e) {
      console.error("createPayLaterOrder error:", e);
      return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
    }
  });

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

export type ZelleOrderAdminRow = {
  id: string;
  stripe_session_id: string;
  customer_email: string;
  owner_name: string | null;
  business_name: string | null;
  phone: string | null;
  plan: string;
  amount_cents: number;
  status: string;
  environment: string;
  rep_code: string | null;
  discount_cents: number;
  submission_token: string;
  token_used: boolean;
  created_at: string;
  paid_at: string | null;
};

export const listZelleOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ZelleOrderAdminRow[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ad_payments")
      .select("id, stripe_session_id, customer_email, owner_name, business_name, phone, plan, amount_cents, status, environment, rep_code, discount_cents, submission_token, token_used, created_at, paid_at")
      .eq("payment_method", "zelle")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ZelleOrderAdminRow[];
  });

export const markZelleOrderPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: boolean; error?: string }> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("ad_payments")
      .select("id, stripe_session_id, customer_email, plan, amount_cents, submission_token, status, payment_method, business_name, owner_name")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr || !row) return { ok: false, error: fetchErr?.message ?? "Order not found" };
    if (row.payment_method !== "zelle" && row.payment_method !== "venmo") {
      return { ok: false, error: "Not a manual (Zelle/Venmo) order" };
    }
    const methodLabel = row.payment_method === "venmo" ? "Venmo" : "Zelle";
    if (row.status === "paid") return { ok: true };

    const paidAtIso = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin
      .from("ad_payments")
      .update({ status: "paid", paid_at: paidAtIso, ...membershipActivatedFields(paidAtIso, context.userId) })
      .eq("id", data.id);
    if (updateErr) return { ok: false, error: updateErr.message };

    // Send the same receipt + processing notification the Stripe path sends.
    try {
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      const { sendPaidOrderNotificationToProcessing } = await import("@/lib/email/paid-order-notification.server");

      const plan = row.plan as string;
      const planLabels: Record<string, string> = {
        image_5: "Standard Image Ad",
        slider_10: "Featured Slider Ad",
      };
      const planSeconds: Record<string, number> = { image_5: 7, slider_10: 10 };
      const amountCents = (row.amount_cents as number) ?? 0;
      const customerEmail = row.customer_email as string;
      const paymentDate = new Date(paidAtIso).toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Los_Angeles",
      }) + " PT";

      await enqueueTransactionalEmailInternal({
        templateName: "payment-receipt",
        recipientEmail: customerEmail,
        idempotencyKey: `payment-receipt-${row.stripe_session_id}`,
        templateData: {
          contactName: (row.owner_name as string) || undefined,
          planLabel: planLabels[plan] ?? plan,
          rotationSeconds: planSeconds[plan] ?? undefined,
          amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
          currency: "usd",
          orderNumber: row.stripe_session_id as string,
          paymentDate,
          cardBrand: methodLabel,
          billingEmail: customerEmail,
          submitUrl: `https://www.getbizmusic.com/submit?token=${row.submission_token}`,
        },
      });

      await sendPaidOrderNotificationToProcessing({
        orderType: "ad",
        email: customerEmail,
        plan,
        amountCents,
        currency: "usd",
        sessionId: row.stripe_session_id as string,
        submissionToken: row.submission_token as string,
        cardBrand: methodLabel,
        paidAtIso,
      });

      // Stage 2 — payment verified receipt with the personalized Terms PDF.
      const { sendMembershipReceiptEmail } = await import("@/lib/email/membership-emails.server");
      await sendMembershipReceiptEmail({
        paymentId: row.id as string,
        email: customerEmail,
        paidAtIso,
        paymentMethodLabel: methodLabel,
        verified: true,
      });
    } catch (e) {
      console.error("markZelleOrderPaid email enqueue failed:", e);
    }

    return { ok: true };
  });

export const cancelZelleOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: boolean; error?: string }> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ad_payments")
      .update({ status: "cancelled", token_used: true })
      .eq("id", data.id)
      .in("payment_method", ["zelle", "venmo"]);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });


/* ================= Venmo orders (admin) ================= */

export type VenmoOrderAdminRow = {
  /** Row id in its source table. */
  id: string;
  /** Which table the order came from. */
  source: "ad" | "activation";
  reference: string;
  business_name: string | null;
  owner_name: string | null;
  customer_email: string;
  phone: string | null;
  plan_label: string;
  amount_cents: number;
  status: string;
  rep_code: string | null;
  submit_url: string | null;
  created_at: string;
  paid_at: string | null;
};

export const listVenmoOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VenmoOrderAdminRow[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: payments }, { data: activations }] = await Promise.all([
      supabaseAdmin
        .from("ad_payments")
        .select("id, stripe_session_id, customer_email, owner_name, business_name, phone, plan, amount_cents, status, rep_code, submission_token, created_at, paid_at")
        .eq("payment_method", "venmo")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("activation_codes")
        .select("id, code, memo_code, business_name, customer_business_name, contact_name, contact_email, customer_email, phone_voice, customer_phone_voice, ad_type, price_cents, status, created_at, paid_at")
        .eq("payment_method", "venmo")
        .order("created_at", { ascending: false }),
    ]);

    const planLabel = (plan: string | null) =>
      plan === "slider_10" ? "Featured Slider (10s)" : plan === "image_5" ? "Standard Image (7s)" : plan || "—";

    const rows: VenmoOrderAdminRow[] = [
      ...(payments ?? []).map((p) => ({
        id: p.id as string,
        source: "ad" as const,
        reference: String(p.stripe_session_id ?? "").replace(/^venmo-/, "").slice(0, 8).toUpperCase(),
        business_name: (p.business_name as string) ?? null,
        owner_name: (p.owner_name as string) ?? null,
        customer_email: (p.customer_email as string) ?? "",
        phone: (p.phone as string) ?? null,
        plan_label: planLabel(p.plan as string),
        amount_cents: (p.amount_cents as number) ?? 0,
        status: (p.status as string) ?? "",
        rep_code: (p.rep_code as string) ?? null,
        submit_url: p.submission_token ? `/submit?token=${p.submission_token}` : null,
        created_at: p.created_at as string,
        paid_at: (p.paid_at as string) ?? null,
      })),
      ...(activations ?? []).map((a) => ({
        id: a.id as string,
        source: "activation" as const,
        reference: (a.memo_code as string) || (a.code as string) || "",
        business_name: (a.customer_business_name as string) || (a.business_name as string) || null,
        owner_name: (a.contact_name as string) ?? null,
        customer_email: (a.customer_email as string) || (a.contact_email as string) || "",
        phone: (a.customer_phone_voice as string) || (a.phone_voice as string) || null,
        plan_label: planLabel(a.ad_type as string),
        amount_cents: (a.price_cents as number) ?? 0,
        status: (a.status as string) ?? "",
        rep_code: null,
        submit_url: a.code ? `/activate?code=${encodeURIComponent(a.code as string)}` : null,
        created_at: a.created_at as string,
        paid_at: (a.paid_at as string) ?? null,
      })),
    ];

    rows.sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
    return rows;
  });
