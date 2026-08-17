// Membership payment notification emails (card + Zelle/Venmo two-stage flow).
import { CATEGORY_LABELS } from "@/lib/business-categories";

const PT = "America/Los_Angeles";

function fmtDateTime(iso: string) {
  return (
    new Date(iso).toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: PT,
    }) + " PT"
  );
}

function fmtDate(value?: string | null) {
  if (!value) return undefined;
  const d = value.length <= 10 ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return d.toLocaleDateString("en-US", { dateStyle: "long", timeZone: PT });
}

function randomSuffix() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .slice(0, 6);
}

/**
 * Returns the payment's receipt number, generating and persisting a unique one
 * on first use. Safe to call repeatedly — later calls reuse the stored value.
 */
export async function ensureReceiptNumber(paymentId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("ad_payments")
    .select("receipt_number")
    .eq("id", paymentId)
    .maybeSingle();
  if (existing?.receipt_number) return existing.receipt_number as string;

  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `GBM-${year}-${randomSuffix()}`;
    const { error } = await supabaseAdmin
      .from("ad_payments")
      .update({ receipt_number: candidate })
      .eq("id", paymentId)
      .is("receipt_number", null);
    if (!error) {
      const { data: row } = await supabaseAdmin
        .from("ad_payments")
        .select("receipt_number")
        .eq("id", paymentId)
        .maybeSingle();
      if (row?.receipt_number) return row.receipt_number as string;
    }
  }
  return `GBM-${year}-${randomSuffix()}`;
}

/** Business category label for a payment, resolved from its ad submission if present. */
async function resolveCategoryLabel(paymentId: string): Promise<string | undefined> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("ad_submissions")
    .select("industry")
    .eq("payment_id", paymentId)
    .maybeSingle();
  const industry = data?.industry as string | undefined;
  if (!industry) return undefined;
  return (CATEGORY_LABELS as Record<string, string>)[industry] ?? industry;
}

/**
 * Final receipt email — card payments (immediately) and Zelle/Venmo (on admin
 * verification). Attaches the personalized Terms & Conditions PDF.
 */
export async function sendMembershipReceiptEmail(opts: {
  paymentId: string;
  email: string;
  paidAtIso: string;
  paymentMethodLabel: string;
  verified?: boolean;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { enqueueTransactionalEmailInternal } = await import("./enqueue.server");
  const { buildMembershipTermsPdfBase64, membershipTermsPdfFilename } = await import(
    "@/lib/membership-pdf.server"
  );

  const { data: row } = await supabaseAdmin
    .from("ad_payments")
    .select(
      "id, owner_name, business_name, amount_cents, membership_start_date, membership_due_date",
    )
    .eq("id", opts.paymentId)
    .maybeSingle();
  if (!row) return;

  const receiptNumber = await ensureReceiptNumber(opts.paymentId);
  const categoryLabel = await resolveCategoryLabel(opts.paymentId);
  const amountFormatted = `$${(((row.amount_cents as number) ?? 0) / 100).toFixed(2)}`;
  const paymentDate = fmtDateTime(opts.paidAtIso);

  let attachments: Array<{ filename: string; content: string; contentType: string }> = [];
  try {
    const content = await buildMembershipTermsPdfBase64({
      businessName: row.business_name as string | null,
      ownerName: row.owner_name as string | null,
      receiptNumber,
      paymentDate,
      amountFormatted,
      paymentMethodLabel: opts.paymentMethodLabel,
    });
    attachments = [
      {
        filename: membershipTermsPdfFilename(receiptNumber),
        content,
        contentType: "application/pdf",
      },
    ];
  } catch (e) {
    // A PDF failure must never block the receipt itself.
    console.error("membership terms PDF generation failed:", e);
  }

  await enqueueTransactionalEmailInternal({
    templateName: "membership-receipt",
    recipientEmail: opts.email,
    idempotencyKey: `membership-receipt-${receiptNumber}`,
    attachments,
    templateData: {
      ownerName: (row.owner_name as string) || undefined,
      businessName: (row.business_name as string) || undefined,
      categoryLabel,
      membershipStart: fmtDate(row.membership_start_date as string | null),
      membershipDue: fmtDate(row.membership_due_date as string | null),
      amountFormatted,
      paymentMethodLabel: opts.paymentMethodLabel,
      receiptNumber,
      paymentDate,
      verified: opts.verified === true,
    },
  });
}

/** Stage 1 — Zelle/Venmo submission acknowledgment, before manual verification. */
export async function sendMembershipPendingVerificationEmail(opts: {
  email: string;
  ownerName?: string | null;
  businessName?: string | null;
  paymentMethodLabel: string;
  amountFormatted?: string;
  memoCode?: string;
  idempotencyKey: string;
}): Promise<void> {
  const { enqueueTransactionalEmailInternal } = await import("./enqueue.server");
  await enqueueTransactionalEmailInternal({
    templateName: "membership-pending-verification",
    recipientEmail: opts.email,
    idempotencyKey: opts.idempotencyKey,
    templateData: {
      ownerName: opts.ownerName || undefined,
      businessName: opts.businessName || undefined,
      paymentMethodLabel: opts.paymentMethodLabel,
      amountFormatted: opts.amountFormatted,
      memoCode: opts.memoCode,
    },
  });
}
