import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const SIGNED_URL_TTL = 60 * 60;
const SITE_URL = "https://www.getbizmusic.com";

export const ZELLE_PHONE = "619-707-0467";
export const VENMO_HANDLE = "@RTPosadas";

export type ActivationPaymentMethod = "stripe" | "zelle" | "venmo";

export type ActivationProof = {
  code: string;
  businessName: string;
  industry: string;
  tagline: string | null;
  cityLabel: string | null;
  websiteUrl: string | null;
  youtubeUrl: string | null;
  adType: string;
  imageUrl: string | null;
  priceCents: number;
  priceNote: string | null;
  contactName: string | null;
  businessAddress: string | null;
  contactEmail: string | null;
  phoneVoice: string | null;
  phoneSms: string | null;
  status: string;
  paid: boolean;
  paymentMethod: string | null;
  memoCode: string | null;
};

type LookupResult = { found: true; proof: ActivationProof } | { found: false; reason: string };

function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/\s+/g, "");
}

async function signImage(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("ad-uploads").createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

/* ============ Public: look up a code and return the ad proof ============ */

export const lookupActivationCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) =>
    z.object({ code: z.string().trim().min(2).max(48) }).parse(d),
  )
  .handler(async ({ data }): Promise<LookupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = normalizeCode(data.code);

    const { data: row } = await supabaseAdmin
      .from("activation_codes")
      .select("*, cities:city_id(name, state)")
      .eq("code", code)
      .maybeSingle();

    if (!row) return { found: false, reason: "That activation code was not found. Please check the code on your flyer or email." };
    if (row.status === "deactivated") return { found: false, reason: "This activation code is no longer active. Please contact your representative." };
    if (row.expires_at && new Date(row.expires_at as string).getTime() < Date.now()) {
      return { found: false, reason: "This activation code has expired. Please contact your representative for a new one." };
    }

    if (row.status === "unused") {
      await supabaseAdmin
        .from("activation_codes")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    const city = (row as unknown as { cities?: { name: string; state: string } | null }).cities;

    return {
      found: true,
      proof: {
        code: row.code as string,
        businessName: (row.customer_business_name as string) || (row.business_name as string),
        industry: row.industry as string,
        tagline: (row.tagline as string) ?? null,
        cityLabel: city ? `${city.name}, ${city.state}` : null,
        websiteUrl: (row.website_url as string) ?? null,
        youtubeUrl: (row.youtube_url as string) ?? null,
        adType: row.ad_type as string,
        imageUrl: await signImage(row.image_path as string),
        priceCents: Number(row.price_cents ?? 0),
        priceNote: (row.price_note as string) ?? null,
        contactName: (row.contact_name as string) ?? null,
        businessAddress: (row.customer_business_address as string) ?? (row.business_address as string) ?? null,
        contactEmail: (row.customer_email as string) ?? (row.contact_email as string) ?? null,
        phoneVoice: (row.customer_phone_voice as string) ?? (row.phone_voice as string) ?? null,
        phoneSms: (row.customer_phone_sms as string) ?? (row.phone_sms as string) ?? null,
        status: row.status as string,
        paid: row.status === "paid",
        paymentMethod: (row.payment_method as string) ?? null,
        memoCode: (row.memo_code as string) ?? null,
      },
    };
  });

/* ============ Public: confirm the proof and start payment ============ */

const submitSchema = z.object({
  code: z.string().trim().min(2).max(48),
  confirmedCorrect: z.boolean(),
  correctionNotes: z.string().trim().max(4000).optional(),
  businessName: z.string().trim().min(1, "Please enter your business name.").max(160),
  businessAddress: z.string().trim().max(300).optional(),
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  phoneVoice: z.string().trim().max(40).optional(),
  phoneSms: z.string().trim().max(40).optional(),
  agreedTerms: z.literal(true, { message: "You must agree to the terms" }),
  paymentMethod: z.enum(["stripe", "zelle", "venmo", "bill_later"]),
  artworkChoice: z.enum(["ours", "customer", "later"]).default("ours"),
  customerImagePath: z.string().trim().max(400).optional(),
  environment: z.enum(["sandbox", "live"]),
  returnUrl: z.string().url("Could not determine the page address. Please reload and try again."),
});

export type ActivationSubmitResult =
  | { ok: true; method: "stripe"; clientSecret: string }
  | { ok: true; method: "zelle" | "venmo"; memoCode: string; amountFormatted: string; zellePhone: string; venmoHandle: string }
  | {
      ok: true;
      method: "bill_later";
      invoiceNumber: string;
      amountFormatted: string;
      dueDateFormatted: string;
      zellePhone: string;
      venmoHandle: string;
    }
  | { ok: false; error: string };

const FIELD_LABELS: Record<string, string> = {
  businessName: "Business name",
  email: "Customer support email",
  phoneVoice: "Customer support number (voice)",
  phoneSms: "Text/SMS number",
  businessAddress: "Business address",
  returnUrl: "Page address",
};

export const submitActivation = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof submitSchema>) => {
    const parsed = submitSchema.safeParse(d);
    if (parsed.success) return parsed.data;
    const issue = parsed.error.issues[0];
    const label = FIELD_LABELS[String(issue?.path?.[0] ?? "")];
    throw new Error(label ? `${label}: ${issue.message}` : (issue?.message ?? "Please check your details and try again."));
  })

  .handler(async ({ data }): Promise<ActivationSubmitResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const code = normalizeCode(data.code);

      const { data: row } = await supabaseAdmin
        .from("activation_codes")
        .select("id, code, status, price_cents, ad_type, business_name, expires_at, upload_token")
        .eq("code", code)
        .maybeSingle();

      if (!row) return { ok: false, error: "Activation code not found." };
      if (row.status === "paid") return { ok: false, error: "This activation code has already been paid." };
      if (row.status === "deactivated") return { ok: false, error: "This activation code is no longer active." };
      if (row.expires_at && new Date(row.expires_at as string).getTime() < Date.now()) {
        return { ok: false, error: "This activation code has expired." };
      }

      const amount = Number(row.price_cents ?? 0);
      if (amount < 50) return { ok: false, error: "This activation code has no valid price set. Please contact your representative." };

      const now = new Date().toISOString();
      const baseUpdate = {
        confirmed_correct: data.confirmedCorrect,
        correction_notes: data.correctionNotes?.trim() || null,
        customer_business_name: data.businessName,
        customer_business_address: data.businessAddress?.trim() || null,
        customer_email: data.email,
        customer_phone_voice: data.phoneVoice?.trim() || null,
        customer_phone_sms: data.phoneSms?.trim() || null,
        agreed_terms: true,
        agreed_at: now,
        submitted_at: now,
        payment_method: data.paymentMethod,
        artwork_choice: data.artworkChoice,
        customer_image_path: data.artworkChoice === "customer" ? (data.customerImagePath ?? null) : null,
        chosen_image: data.artworkChoice === "customer" ? "customer" : "ours",
      };

      if (data.artworkChoice === "customer" && !data.customerImagePath) {
        return { ok: false, error: "Please upload your ad image, or choose to send it later." };
      }

      if (data.paymentMethod === "stripe") {
        const stripe = createStripeClient(data.environment);
        const productName = `Get Biz Music — Ad Activation ${row.code}`;
        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: { name: productName },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          ui_mode: "embedded_page",
          return_url: data.returnUrl,
          customer_email: data.email,
          metadata: {
            activation_code: row.code as string,
            business_name: data.businessName,
            confirmed_correct: String(data.confirmedCorrect),
          },
          payment_intent_data: {
            description: `${productName} — ${data.businessName} — ${data.email}`.slice(0, 350),
            receipt_email: data.email,
            statement_descriptor_suffix: "GETBIZMUSIC AD",
          },
        });

        await supabaseAdmin
          .from("activation_codes")
          .update({ ...baseUpdate, status: "awaiting_payment", stripe_session_id: session.id })
          .eq("id", row.id);

        return { ok: true, method: "stripe", clientSecret: session.client_secret ?? "" };
      }

      // Pay later — bill me
      if (data.paymentMethod === "bill_later") {
        const invoiceNumber = `INV-${row.code}-${Math.floor(1000 + Math.random() * 9000)}`;
        const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await supabaseAdmin
          .from("activation_codes")
          .update({
            ...baseUpdate,
            status: data.artworkChoice === "later" ? "awaiting_artwork" : "billed",
            memo_code: invoiceNumber,
            invoice_number: invoiceNumber,
            due_at: dueAt.toISOString(),
          })
          .eq("id", row.id);

        const amountDue = `$${(amount / 100).toFixed(2)}`;
        const dueDateFormatted = dueAt.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "America/Los_Angeles" });

        await sendActivationInvoiceEmails({
          code: row.code as string,
          email: data.email,
          businessName: data.businessName,
          amountFormatted: amountDue,
          invoiceNumber,
          dueDateFormatted,
          artworkPending: data.artworkChoice === "later",
          uploadToken: (row.upload_token as string) ?? null,
          correctionsRequested: !data.confirmedCorrect,
          correctionNotes: data.correctionNotes?.trim() || null,
        });

        return {
          ok: true,
          method: "bill_later",
          invoiceNumber,
          amountFormatted: amountDue,
          dueDateFormatted,
          zellePhone: ZELLE_PHONE,
          venmoHandle: VENMO_HANDLE,
        };
      }

      // Manual payment (Zelle / Venmo)
      const memoCode = (row.code as string).slice(0, 6) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      await supabaseAdmin
        .from("activation_codes")
        .update({ ...baseUpdate, status: "awaiting_manual", memo_code: memoCode })
        .eq("id", row.id);

      const amountFormatted = `$${(amount / 100).toFixed(2)}`;
      try {
        const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
        await enqueueTransactionalEmailInternal({
          templateName: "activation-instructions",
          recipientEmail: data.email,
          idempotencyKey: `activation-instructions-${row.code}-${memoCode}`,
          templateData: {
            businessName: data.businessName,
            amountFormatted,
            memoCode,
            method: data.paymentMethod,
            zellePhone: ZELLE_PHONE,
            venmoHandle: VENMO_HANDLE,
            zelleQrUrl: "https://www.getbizmusic.com/__l5e/assets-v1/9a996bbf-8aeb-48a7-8ac5-1db406351740/zelle-qr.jpeg",
          },
        });
      } catch (e) {
        console.error("activation-instructions enqueue failed:", e);
      }

      try {
        const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
        await enqueueTransactionalEmailInternal({
          templateName: "paid-order-notification",
          recipientEmail: "processing@getbizmusic.com",
          idempotencyKey: `activation-manual-${row.code}-${memoCode}`,
          templateData: {
            orderTypeLabel: `Activation ${row.code} — ${data.paymentMethod.toUpperCase()} pending`,
            customerEmail: data.email,
            planLabel: data.confirmedCorrect ? "Proof approved as-is" : "CORRECTIONS REQUESTED",
            amountFormatted,
            orderNumber: memoCode,
          },
        });
      } catch (e) {
        console.error("activation manual notification failed:", e);
      }

      return {
        ok: true,
        method: data.paymentMethod,
        memoCode,
        amountFormatted,
        zellePhone: ZELLE_PHONE,
        venmoHandle: VENMO_HANDLE,
      };
    } catch (error) {
      console.error("submitActivation error:", error);
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });

/* ============ Public: confirm a Stripe session after return ============ */

export const confirmActivationSession = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; environment: StripeEnv }) =>
    z.object({ sessionId: z.string().min(1).max(200), environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ status: "paid" | "pending"; businessName?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("activation_codes")
      .select("id, code, status, price_cents, customer_email, customer_business_name, business_name, confirmed_correct, correction_notes")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (!row) return { status: "pending" };
    if (row.status === "paid") {
      return { status: "paid", businessName: (row.customer_business_name as string) || (row.business_name as string) };
    }

    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (session.payment_status !== "paid") return { status: "pending" };
    } catch (e) {
      console.error("confirmActivationSession retrieve failed:", e);
      return { status: "pending" };
    }

    await markActivationPaidInternal(row.id as string, "stripe");
    return { status: "paid", businessName: (row.customer_business_name as string) || (row.business_name as string) };
  });

async function markActivationPaidInternal(id: string, method: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paidAt = new Date().toISOString();
  const { data: row } = await supabaseAdmin
    .from("activation_codes")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", id)
    .select("code, price_cents, customer_email, contact_email, customer_business_name, business_name, confirmed_correct, correction_notes, memo_code, stripe_session_id")
    .maybeSingle();
  if (!row) return;

  const email = (row.customer_email as string) || (row.contact_email as string);
  const businessName = (row.customer_business_name as string) || (row.business_name as string);
  const amountFormatted = `$${(Number(row.price_cents ?? 0) / 100).toFixed(2)}`;
  const orderNumber = (row.stripe_session_id as string) || (row.memo_code as string) || (row.code as string);

  try {
    const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
    if (email) {
      await enqueueTransactionalEmailInternal({
        templateName: "activation-receipt",
        recipientEmail: email,
        idempotencyKey: `activation-receipt-${orderNumber}`,
        templateData: {
          businessName,
          activationCode: row.code,
          amountFormatted,
          paymentMethod: method,
          orderNumber,
          correctionsRequested: row.confirmed_correct === false,
          correctionNotes: (row.correction_notes as string) ?? null,
        },
      });
    }
    await enqueueTransactionalEmailInternal({
      templateName: "paid-order-notification",
      recipientEmail: "processing@getbizmusic.com",
      idempotencyKey: `activation-paid-${orderNumber}`,
      templateData: {
        orderTypeLabel: `Activation ${row.code} — PAID (${method})`,
        customerEmail: email,
        planLabel: row.confirmed_correct === false ? "CORRECTIONS REQUESTED" : "Proof approved as-is",
        amountFormatted,
        orderNumber,
      },
    });
  } catch (e) {
    console.error("activation paid emails failed:", e);
  }
}

/* ============ Bill Me (Pay Later) helpers ============ */

const ZELLE_QR_URL = "https://www.getbizmusic.com/__l5e/assets-v1/9a996bbf-8aeb-48a7-8ac5-1db406351740/zelle-qr.jpeg";

async function sendActivationInvoiceEmails(params: {
  code: string;
  email: string;
  businessName: string;
  amountFormatted: string;
  invoiceNumber: string;
  dueDateFormatted: string;
  artworkPending: boolean;
  uploadToken: string | null;
  correctionsRequested: boolean;
  correctionNotes: string | null;
}): Promise<void> {
  try {
    const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
    await enqueueTransactionalEmailInternal({
      templateName: "activation-invoice",
      recipientEmail: params.email,
      idempotencyKey: `activation-invoice-${params.invoiceNumber}`,
      templateData: {
        businessName: params.businessName,
        activationCode: params.code,
        amountFormatted: params.amountFormatted,
        invoiceNumber: params.invoiceNumber,
        dueDateFormatted: params.dueDateFormatted,
        payNowUrl: `${SITE_URL}/activate?code=${encodeURIComponent(params.code)}&pay=1`,
        zellePhone: ZELLE_PHONE,
        venmoHandle: VENMO_HANDLE,
        zelleQrUrl: ZELLE_QR_URL,
        artworkPending: params.artworkPending,
        artworkUploadUrl: params.uploadToken ? `${SITE_URL}/activate/artwork?token=${params.uploadToken}` : undefined,
        correctionsRequested: params.correctionsRequested,
        correctionNotes: params.correctionNotes,
      },
    });

    await enqueueTransactionalEmailInternal({
      templateName: "paid-order-notification",
      recipientEmail: "processing@getbizmusic.com",
      idempotencyKey: `activation-billed-${params.invoiceNumber}`,
      templateData: {
        orderTypeLabel: `Activation ${params.code} — BILLED / UNPAID (due ${params.dueDateFormatted})`,
        customerEmail: params.email,
        planLabel: `${params.correctionsRequested ? "CORRECTIONS REQUESTED" : "Proof approved as-is"}${params.artworkPending ? " — ARTWORK OWED BY CUSTOMER" : ""}`,
        amountFormatted: params.amountFormatted,
        orderNumber: params.invoiceNumber,
      },
    });
  } catch (e) {
    console.error("activation invoice emails failed:", e);
  }
}

/** Public: start a card payment for an already-billed activation code. */
export const payActivationInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; environment: StripeEnv; returnUrl: string }) =>
    z
      .object({
        code: z.string().trim().min(2).max(48),
        environment: z.enum(["sandbox", "live"]),
        returnUrl: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; clientSecret: string } | { ok: false; error: string }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const code = normalizeCode(data.code);
      const { data: row } = await supabaseAdmin
        .from("activation_codes")
        .select("id, code, status, price_cents, customer_email, contact_email, customer_business_name, business_name")
        .eq("code", code)
        .maybeSingle();

      if (!row) return { ok: false, error: "Activation code not found." };
      if (row.status === "paid") return { ok: false, error: "This invoice has already been paid." };

      const amount = Number(row.price_cents ?? 0);
      if (amount < 50) return { ok: false, error: "This activation code has no valid price set." };

      const email = (row.customer_email as string) || (row.contact_email as string) || undefined;
      const businessName = (row.customer_business_name as string) || (row.business_name as string);
      const productName = `Get Biz Music — Ad Activation ${row.code}`;
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          { price_data: { currency: "usd", product_data: { name: productName }, unit_amount: amount }, quantity: 1 },
        ],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: email,
        metadata: { activation_code: row.code as string, business_name: businessName },
        payment_intent_data: {
          description: `${productName} — ${businessName}`.slice(0, 350),
          receipt_email: email,
          statement_descriptor_suffix: "GETBIZMUSIC AD",
        },
      });

      await supabaseAdmin
        .from("activation_codes")
        .update({ stripe_session_id: session.id })
        .eq("id", row.id);

      return { ok: true, clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("payActivationInvoice error:", error);
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });

/* ============ Late artwork upload (token link) ============ */

export const lookupActivationArtworkToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ found: boolean; businessName?: string; code?: string; uploaded?: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("activation_codes")
      .select("code, business_name, customer_business_name, customer_image_path")
      .eq("upload_token", data.token)
      .maybeSingle();
    if (!row) return { found: false };
    return {
      found: true,
      code: row.code as string,
      businessName: (row.customer_business_name as string) || (row.business_name as string),
      uploaded: Boolean(row.customer_image_path),
    };
  });

export const saveActivationArtwork = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; imagePath: string }) =>
    z.object({ token: z.string().uuid(), imagePath: z.string().trim().min(1).max(400) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("activation_codes")
      .select("id, code, status")
      .eq("upload_token", data.token)
      .maybeSingle();
    if (!row) return { ok: false, error: "This upload link is no longer valid." };

    const { error } = await supabaseAdmin
      .from("activation_codes")
      .update({
        customer_image_path: data.imagePath,
        artwork_choice: "customer",
        chosen_image: "customer",
        status: row.status === "awaiting_artwork" ? "billed" : (row.status as string),
      })
      .eq("id", row.id);
    if (error) return { ok: false, error: error.message };

    try {
      const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmailInternal({
        templateName: "paid-order-notification",
        recipientEmail: "processing@getbizmusic.com",
        idempotencyKey: `activation-artwork-${row.id}-${Date.now()}`,
        templateData: {
          orderTypeLabel: `Activation ${row.code} — CUSTOMER ARTWORK UPLOADED`,
          planLabel: "Customer sent their own ad image",
          amountFormatted: "—",
          orderNumber: row.code as string,
        },
      });
    } catch (e) {
      console.error("artwork notification failed:", e);
    }
    return { ok: true };
  });

/* ============ Admin ============ */

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

export type ActivationCodeRow = {
  id: string;
  code: string;
  business_name: string;
  industry: string;
  tagline: string | null;
  city_id: string | null;
  website_url: string | null;
  youtube_url: string | null;
  image_path: string;
  image_url: string | null;
  ad_type: string;
  price_cents: number;
  price_note: string | null;
  contact_name: string | null;
  business_address: string | null;
  contact_email: string | null;
  phone_voice: string | null;
  phone_sms: string | null;
  status: string;
  viewed_at: string | null;
  confirmed_correct: boolean | null;
  correction_notes: string | null;
  customer_business_name: string | null;
  customer_business_address: string | null;
  customer_email: string | null;
  customer_phone_voice: string | null;
  customer_phone_sms: string | null;
  payment_method: string | null;
  memo_code: string | null;
  paid_at: string | null;
  submitted_at: string | null;
  expires_at: string | null;
  created_at: string;
  share_url: string;
};

export const listActivationCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivationCodeRow[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("activation_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as ActivationCodeRow[];
    return Promise.all(
      rows.map(async (r) => ({
        ...r,
        image_url: await signImage(r.image_path),
        share_url: `${SITE_URL}/activate?code=${encodeURIComponent(r.code)}`,
      })),
    );
  });

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(2).max(48),
  businessName: z.string().trim().min(1).max(160),
  industry: z.string().trim().min(1).max(64),
  tagline: z.string().trim().max(200).optional(),
  cityId: z.string().uuid().nullable().optional(),
  websiteUrl: z.string().trim().max(300).optional(),
  youtubeUrl: z.string().trim().max(300).optional(),
  imagePath: z.string().trim().min(1).max(400),
  adType: z.enum(["image_5", "slider_10"]),
  priceCents: z.number().int().min(0).max(1000000),
  priceNote: z.string().trim().max(200).optional(),
  contactName: z.string().trim().max(160).optional(),
  businessAddress: z.string().trim().max(300).optional(),
  contactEmail: z.string().trim().max(255).optional(),
  phoneVoice: z.string().trim().max(40).optional(),
  phoneSms: z.string().trim().max(40).optional(),
  expiresAt: z.string().trim().max(40).nullable().optional(),
});

export const saveActivationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof saveSchema>) => saveSchema.parse(d))
  .handler(async ({ context, data }): Promise<{ ok: boolean; error?: string }> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      code: normalizeCode(data.code),
      business_name: data.businessName,
      industry: data.industry,
      tagline: data.tagline?.trim() || null,
      city_id: data.cityId || null,
      website_url: data.websiteUrl?.trim() || null,
      youtube_url: data.youtubeUrl?.trim() || null,
      image_path: data.imagePath,
      ad_type: data.adType,
      price_cents: data.priceCents,
      price_note: data.priceNote?.trim() || null,
      contact_name: data.contactName?.trim() || null,
      business_address: data.businessAddress?.trim() || null,
      contact_email: data.contactEmail?.trim() || null,
      phone_voice: data.phoneVoice?.trim() || null,
      phone_sms: data.phoneSms?.trim() || null,
      expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("activation_codes").update(payload).eq("id", data.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    const { error } = await supabaseAdmin
      .from("activation_codes")
      .insert({ ...payload, created_by: context.userId });
    if (error) {
      return {
        ok: false,
        error: error.message.includes("duplicate") ? "That activation code already exists." : error.message,
      };
    }
    return { ok: true };
  });

export const setActivationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "unused" | "deactivated" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["unused", "deactivated"]) }).parse(d),
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean; error?: string }> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("activation_codes")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const markActivationPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: boolean; error?: string }> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("activation_codes")
      .select("id, status, payment_method")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: false, error: "Not found" };
    if (row.status === "paid") return { ok: true };
    await markActivationPaidInternal(row.id as string, (row.payment_method as string) || "manual");
    return { ok: true };
  });

export const deleteActivationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: boolean; error?: string }> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("activation_codes").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
