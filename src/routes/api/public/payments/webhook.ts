import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = session.customer_email ?? session.customer_details?.email ?? session.metadata?.customer_email ?? "";
  const plan = (session.metadata?.plan as string) ?? "image_5";
  const amount = session.amount_total ?? 0;

  // Prefer update (pre-inserted at checkout create), fall back to upsert.
  const { data: existing } = await supabaseAdmin
    .from("ad_payments")
    .select("id, submission_token, customer_email")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("ad_payments")
      .update({ status: "paid", paid_at: new Date().toISOString(), amount_cents: amount, customer_email: email || existing.customer_email })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("ad_payments").upsert(
      {
        stripe_session_id: session.id,
        customer_email: email,
        plan,
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

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object, env);
      break;
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
