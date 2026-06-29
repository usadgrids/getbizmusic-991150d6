import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = session.customer_email ?? session.customer_details?.email ?? session.metadata?.customer_email ?? "";
  const plan = (session.metadata?.plan as string) ?? "image_5";
  const amount = session.amount_total ?? 0;

  const { data: row, error } = await supabaseAdmin
    .from("ad_payments")
    .upsert(
      {
        stripe_session_id: session.id,
        customer_email: email,
        plan,
        amount_cents: amount,
        status: "paid",
        environment: env,
        paid_at: new Date().toISOString(),
      },
      { onConflict: "stripe_session_id" }
    )
    .select("submission_token, customer_email")
    .maybeSingle();

  if (error) {
    console.error("ad_payments upsert error:", error);
    return;
  }

  // Best-effort receipt email via Lovable Emails (will no-op silently if infra not set up yet)
  try {
    if (row?.submission_token && row.customer_email) {
      const origin = process.env.PUBLIC_SITE_URL ?? "https://bizspotmusicad.lovable.app";
      const link = `${origin}/submit?token=${row.submission_token}`;
      console.log(`[ad_payments] paid: ${row.customer_email} → ${link}`);
    }
  } catch (e) {
    console.error("post-payment receipt log error:", e);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object, env);
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
