import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { QUICK_PAY_CENTS, QUICK_PAY_DESCRIPTION } from "@/lib/quickpay";

type QuickPayResult = { clientSecret: string } | { error: string };


export const createQuickPayCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: {
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    returnUrl: string;
    environment: StripeEnv;
  }) =>
    z
      .object({
        businessName: z.string().trim().min(1).max(160),
        ownerName: z.string().trim().min(1).max(160),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().min(7).max(32),
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<QuickPayResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const metadata = {
        source: "quick_pay",
        business_name: data.businessName,
        owner_name: data.ownerName,
        customer_email: data.email,
        phone: data.phone,
      };
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "AI Business Alliance — One Year Membership",
                description: QUICK_PAY_DESCRIPTION,
              },
              unit_amount: QUICK_PAY_CENTS,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: data.email,
        metadata,
        payment_intent_data: {
          description: `AI Business Alliance 1-Year Membership — ${data.businessName} (${data.ownerName})`,
          receipt_email: data.email,
          statement_descriptor_suffix: "GETBIZMUSIC",
          metadata,
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type ReceiptResult = { ok: boolean };

/** Sends the membership receipt after a successful Quick Pay checkout. Idempotent per session. */
export const sendQuickPayReceipt = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) =>
    z
      .object({
        sessionId: z.string().trim().min(5).max(200),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<ReceiptResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (session.payment_status !== "paid") return { ok: false };
      const email =
        session.customer_email ?? session.customer_details?.email ?? "";
      if (!email) return { ok: false };
      const md = (session.metadata ?? {}) as Record<string, string>;
      const now = new Date();
      const due = new Date(now);
      due.setFullYear(due.getFullYear() + 1);
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmailInternal({
        templateName: "quickpay-receipt",
        recipientEmail: email,
        idempotencyKey: `quickpay-receipt-${session.id}`,
        templateData: {
          ownerName: md["owner_name"] || undefined,
          businessName: md["business_name"] || undefined,
          amountFormatted: `$${((session.amount_total ?? QUICK_PAY_CENTS) / 100).toFixed(2)}`,
          orderNumber: session.id,
          paymentDate:
            now.toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "America/Los_Angeles",
            }) + " PT",
          membershipDue: due.toLocaleDateString("en-US", {
            dateStyle: "long",
            timeZone: "America/Los_Angeles",
          }),
        },
      });
      return { ok: true };
    } catch (error) {
      console.error("quickpay receipt failed:", getStripeErrorMessage(error));
      return { ok: false };
    }
  });
