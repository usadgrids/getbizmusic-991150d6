import { membershipActivatedFields } from "@/lib/membership-lifecycle";
import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { sendPaidOrderNotificationToProcessing } from "@/lib/email/paid-order-notification.server";

const PLAN_LABELS: Record<string, string> = {
  image_5: 'Standard Image Ad',
  slider_10: 'Featured Slider Ad',
};

const PLAN_SECONDS: Record<string, number> = {
  image_5: 7,
  slider_10: 10,
};

const SITE_URL = 'https://www.getbizmusic.com';

async function sendPaymentReceipt(params: {
  email: string;
  plan: string;
  amountCents: number;
  currency?: string | null;
  submissionToken: string;
  sessionId: string;
  paymentIntentId?: string | null;
  receiptUrl?: string | null;
  cardholderName?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  paidAtIso?: string | null;
  contactName?: string | null;
}) {
  try {
    const { enqueueTransactionalEmailInternal } = await import('@/lib/email/enqueue.server');
    const paymentDate = params.paidAtIso
      ? new Date(params.paidAtIso).toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Los_Angeles',
        }) + ' PT'
      : undefined;
    await enqueueTransactionalEmailInternal({
      templateName: 'payment-receipt',
      recipientEmail: params.email,
      idempotencyKey: `payment-receipt-${params.sessionId}`,
      templateData: {
        contactName: params.contactName ?? undefined,
        planLabel: PLAN_LABELS[params.plan] ?? params.plan,
        rotationSeconds: PLAN_SECONDS[params.plan] ?? undefined,
        amountFormatted: `$${(params.amountCents / 100).toFixed(2)}`,
        currency: params.currency ?? 'usd',
        orderNumber: params.sessionId,
        paymentIntentId: params.paymentIntentId ?? undefined,
        paymentDate,
        cardholderName: params.cardholderName ?? undefined,
        cardBrand: params.cardBrand ?? undefined,
        cardLast4: params.cardLast4 ?? undefined,
        billingEmail: params.email,
        submitUrl: `${SITE_URL}/submit?token=${params.submissionToken}`,
        receiptUrl: params.receiptUrl ?? undefined,
      },
    });
  } catch (e) {
    console.error('payment-receipt email enqueue failed:', e);
  }
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = session.customer_email ?? session.customer_details?.email ?? session.metadata?.customer_email ?? "";
  const plan = (session.metadata?.plan as string) ?? "image_5";
  const amount = session.amount_total ?? 0;

  const currency: string | null = session.currency ?? null;

  // Extract card + cardholder details from the underlying charge.
  let receiptUrl: string | null = null;
  let cardholderName: string | null = session.customer_details?.name ?? null;
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  let paidAtIso: string | null = null;
  let paymentIntentId: string | null =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;

  try {
    if (paymentIntentId) {
      const { createStripeClient } = await import('@/lib/stripe.server');
      const stripe = createStripeClient(env);
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
      const charge: any = pi.latest_charge;
      if (charge && typeof charge === 'object') {
        if (charge.receipt_url) receiptUrl = charge.receipt_url;
        if (charge.billing_details?.name) cardholderName = charge.billing_details.name;
        const cardDetails = charge.payment_method_details?.card;
        if (cardDetails) {
          cardBrand = cardDetails.brand ?? null;
          cardLast4 = cardDetails.last4 ?? null;
        }
        if (typeof charge.created === 'number') {
          paidAtIso = new Date(charge.created * 1000).toISOString();
        }
      }
    }
  } catch (e) {
    console.error('receipt/card lookup failed:', e);
  }
  if (!paidAtIso) paidAtIso = new Date().toISOString();

  // Prefer update (pre-inserted at checkout create), fall back to upsert.
  const { data: existing } = await supabaseAdmin
    .from("ad_payments")
    .select("id, submission_token, customer_email")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  let submissionToken: string | null = null;
  let recipientEmail = email;

  if (existing) {
    await supabaseAdmin
      .from("ad_payments")
      .update({ status: "paid", paid_at: paidAtIso, amount_cents: amount, customer_email: email || existing.customer_email, ...membershipActivatedFields(paidAtIso) })
      .eq("id", existing.id);
    submissionToken = (existing.submission_token as string) ?? null;
    recipientEmail = email || (existing.customer_email as string);
  } else {
    const { data: upserted } = await supabaseAdmin.from("ad_payments").upsert(
      {
        stripe_session_id: session.id,
        customer_email: email,
        plan,
        amount_cents: amount,
        status: "paid",
        environment: env,
        paid_at: paidAtIso,
        payment_method: "card",
        terms_accepted_at: session.metadata?.agreed_at ?? paidAtIso,
        ...membershipActivatedFields(paidAtIso),
        agreed_terms: session.metadata?.agreed_terms === "true",
        agreed_no_refund: session.metadata?.agreed_no_refund === "true",
        agreed_at: session.metadata?.agreed_at ?? null,
        disclosure_version: session.metadata?.disclosure_version ?? null,
      },
      { onConflict: "stripe_session_id" }
    ).select("submission_token").maybeSingle();
    submissionToken = (upserted?.submission_token as string) ?? null;
  }

  // Pro Ad Design add-on bought together with the ad spot → create the linked
  // design order so it shows up in the admin design queue and the buyer gets
  // the intake link.
  if (session.metadata?.design_addon === "true") {
    try {
      const { DESIGN_PRICE_CENTS } = await import("@/lib/design.functions");
      const { data: payRow } = await supabaseAdmin
        .from("ad_payments")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      await supabaseAdmin.from("design_orders").upsert(
        {
          stripe_session_id: session.id,
          customer_email: recipientEmail,
          amount_cents: DESIGN_PRICE_CENTS,
          status: "paid",
          environment: env,
          paid_at: paidAtIso,
          agreed_terms: true,
          agreed_no_refund: true,
          agreed_at: session.metadata?.agreed_at ?? paidAtIso,
          disclosure_version: session.metadata?.disclosure_version ?? null,
          ad_payment_id: payRow?.id ?? null,
          source: "ad_addon",
        },
        { onConflict: "stripe_session_id" }
      );

      if (recipientEmail) {
        const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
        await enqueueTransactionalEmailInternal({
          templateName: "design-intake-link",
          recipientEmail,
          idempotencyKey: `design-addon-intake-${session.id}`,
          templateData: {
            intakeUrl: `${SITE_URL}/design/return?session_id=${session.id}`,
          },
        });
      }
    } catch (e) {
      console.error("design add-on provisioning failed:", e);
    }
  }

  if (recipientEmail) {
    // Membership confirmation receipt (card) with the personalized Terms PDF.
    try {
      const { data: payRow } = await supabaseAdmin
        .from("ad_payments")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      if (payRow?.id) {
        const { sendMembershipReceiptEmail } = await import("@/lib/email/membership-emails.server");
        await sendMembershipReceiptEmail({
          paymentId: payRow.id as string,
          email: recipientEmail,
          paidAtIso,
          paymentMethodLabel: "Card",
        });
      }
    } catch (e) {
      console.error("membership receipt email failed:", e);
    }
  }

  if (recipientEmail && submissionToken) {
    await sendPaymentReceipt({
      email: recipientEmail,
      plan,
      amountCents: amount,
      currency,
      submissionToken,
      sessionId: session.id,
      paymentIntentId,
      receiptUrl,
      cardholderName,
      cardBrand,
      cardLast4,
      paidAtIso,
    });

    // Notify processing team for all paid ad orders (skip free religious spots).
    if (amount > 0 && !session.id.startsWith('free-religious-')) {
      await sendPaidOrderNotificationToProcessing({
        orderType: 'ad',
        email: recipientEmail,
        plan,
        amountCents: amount,
        currency,
        sessionId: session.id,
        submissionToken,
        paymentIntentId,
        receiptUrl,
        cardholderName,
        cardBrand,
        cardLast4,
        paidAtIso,
      });
    }
  } else {
    console.warn('payment-receipt skipped — missing email or submission_token', {
      hasEmail: !!recipientEmail,
      hasToken: !!submissionToken,
    });
  }
}

async function handleDisputeCreated(dispute: any, env: StripeEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const chargeId: string | undefined = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  const paymentIntentId: string | undefined =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;

  // Look up the ad_payment via charge → session.
  let adPayment: any = null;
  try {
    const { createStripeClient } = await import("@/lib/stripe.server");
    const stripe = createStripeClient(env);
    let sessionId: string | undefined;
    if (paymentIntentId) {
      const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
      sessionId = sessions.data[0]?.id;
    }
    if (sessionId) {
      const { data } = await supabaseAdmin
        .from("ad_payments")
        .select("*, submission:ad_submissions(business_name, contact_name, ad_type, industry, tagline, website_url, created_at)")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      adPayment = data;
    }
  } catch (e) {
    console.error("dispute lookup failed:", e);
  }

  const receiptUrl: string | null = dispute.evidence?.receipt ?? null;
  const submission = adPayment?.submission?.[0] ?? adPayment?.submission ?? null;

  const evidenceText = [
    `DISPUTE RESPONSE — Draft for admin review`,
    `Dispute: ${dispute.id}`,
    `Amount: ${((dispute.amount ?? 0) / 100).toFixed(2)} ${String(dispute.currency ?? "usd").toUpperCase()}`,
    `Reason: ${dispute.reason ?? "unknown"}`,
    ``,
    `ORDER DETAILS`,
    adPayment
      ? `- Customer email: ${adPayment.customer_email}
- Plan: ${adPayment.plan}
- Amount paid: $${((adPayment.amount_cents ?? 0) / 100).toFixed(2)}
- Purchased: ${adPayment.paid_at ?? adPayment.created_at}
- Environment: ${adPayment.environment}
- Stripe session: ${adPayment.stripe_session_id}
- Submission token: ${adPayment.submission_token}`
      : `- No matching ad_payments row found for charge ${chargeId}`,
    submission
      ? `
AD CONTENT
- Business: ${submission.business_name}
- Contact: ${submission.contact_name}
- Industry: ${submission.industry}
- Ad type: ${submission.ad_type}
- Tagline: ${submission.tagline ?? "(none)"}
- Website: ${submission.website_url ?? "(none)"}
- Submitted: ${submission.created_at}`
      : ``,
    ``,
    `BUYER CONSENT (captured at checkout)`,
    `- Agreed to novelty/no-guarantee terms: ${adPayment?.agreed_terms ? "YES" : "unknown"}`,
    `- Agreed to no-refund policy: ${adPayment?.agreed_no_refund ? "YES" : "unknown"}`,
    `- Agreed at: ${adPayment?.agreed_at ?? "unknown"}`,
    `- Disclosure version: ${adPayment?.disclosure_version ?? "unknown"}`,
    `- IP address: ${adPayment?.ip_address ?? "unknown"}`,
    ``,
    `DISCLOSURE TEXT PRESENTED TO BUYER BEFORE PAYMENT`,
    `A one-year novelty ad spot on our National City business ad display. The buyer was shown, and`,
    `explicitly acknowledged via checkbox, the following disclosures before payment:`,
    `  1. This is a fun novelty ad spot — NO guaranteed views, plays, impressions, sales, leads,`,
    `     or foot traffic. Not a performance-based marketing campaign.`,
    `  2. All sales are final. No refunds. Buyer's spot was reserved for the full year at time of`,
    `     purchase.`,
    `  3. As required by California Civil Code § 1723, the no-refund policy was disclosed BEFORE`,
    `     the purchase was completed.`,
    ``,
    `CUSTOMER COMMUNICATION`,
    `- Receipt sent by Stripe to: ${adPayment?.customer_email ?? "buyer"}`,
    receiptUrl ? `- Stripe receipt URL: ${receiptUrl}` : `- Stripe receipt URL: (not provided in dispute payload)`,
    `- Confirmation email including a repeat of the disclosure and no-refund policy was sent`,
    `  post-purchase via our transactional email pipeline.`,
    ``,
    `CONCLUSION`,
    `The buyer received the goods purchased (a one-year ad spot), explicitly acknowledged the`,
    `no-refund policy in writing before payment, and this dispute is therefore not consistent with`,
    `the terms accepted at checkout.`,
  ].join("\n");

  const { error } = await supabaseAdmin.from("dispute_evidence_log").upsert(
    {
      dispute_id: dispute.id,
      charge_id: chargeId ?? null,
      payment_intent_id: paymentIntentId ?? null,
      stripe_session_id: adPayment?.stripe_session_id ?? null,
      ad_payment_id: adPayment?.id ?? null,
      amount_cents: dispute.amount ?? null,
      currency: dispute.currency ?? null,
      reason: dispute.reason ?? null,
      evidence_text: evidenceText,
      evidence_json: {
        dispute,
        ad_payment_id: adPayment?.id ?? null,
        submission: submission ?? null,
      },
      status: "pending_review",
      environment: env,
    },
    { onConflict: "dispute_id" }
  );
  if (error) console.error("dispute_evidence_log upsert failed:", error);
}

async function handleDesignCheckoutCompleted(session: any, env: StripeEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email =
    session.customer_email ??
    session.customer_details?.email ??
    session.metadata?.customer_email ??
    "";
  const amount = session.amount_total ?? 4995;

  await supabaseAdmin
    .from("design_orders")
    .upsert(
      {
        stripe_session_id: session.id,
        customer_email: email,
        amount_cents: amount,
        status: "paid",
        environment: env,
        paid_at: new Date().toISOString(),
        agreed_terms: session.metadata?.agreed_terms === "true",
        agreed_no_refund: session.metadata?.agreed_no_refund === "true",
        agreed_at: session.metadata?.agreed_at ?? null,
        disclosure_version: session.metadata?.disclosure_version ?? null,
      },
      { onConflict: "stripe_session_id" }
    );

  if (!email) {
    console.warn("design-receipt skipped — no recipient email on session", session.id);
    return;
  }

  try {
    const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
    await enqueueTransactionalEmailInternal({
      templateName: "design-receipt",
      recipientEmail: email,
      idempotencyKey: `design-receipt-${session.id}`,
      templateData: {
        amountFormatted: `$${(amount / 100).toFixed(2)}`,
        orderNumber: session.id,
        billingEmail: email,
        intakeUrl: `https://www.getbizmusic.com/design/return?session_id=${session.id}`,
      },
    });
  } catch (e) {
    console.error("design-receipt enqueue failed:", e);
  }

  // Notify processing team for all paid design orders.
  await sendPaidOrderNotificationToProcessing({
    orderType: 'design',
    email,
    amountCents: amount,
    currency: session.currency ?? null,
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    receiptUrl: null,
    paidAtIso: new Date().toISOString(),
  });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session?.metadata?.order_type === "design") {
        await handleDesignCheckoutCompleted(session, env);
      } else {
        await handleCheckoutCompleted(session, env);
      }
      break;
    }
    case "charge.dispute.created":
      await handleDisputeCreated(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
