import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

export const QUICK_PAY_CENTS = 4995;
export const QUICK_PAY_DESCRIPTION =
  "GetBizMusic.com AI Business Alliance — One Year Membership. No recurring charges. No subscriptions. One-time payment.";

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
