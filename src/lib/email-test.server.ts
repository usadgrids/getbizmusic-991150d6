// Server-side sender for the admin QA email test page.
//
// This is a *test harness only*: it renders an existing registered template with
// its own sample preview data and sends it to an admin-specified address. It never
// touches, changes or triggers the real email flows — those keep their own logic.
import * as React from "react";
import { render } from "react-email";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { sendResendEmail } from "@/lib/email/resend.server";

/**
 * Pseudo template keys used only by the test page, mapped to a real registry
 * template plus extra sample data (e.g. the verified Zelle/Venmo stage-2 receipt).
 */
const TEST_ALIASES: Record<string, { template: string; extra?: Record<string, unknown> }> = {
  "membership-receipt-verified": {
    template: "membership-receipt",
    extra: {
      verified: true,
      paymentMethodLabel: "Zelle",
      paymentDate: "August 17, 2026 at 8:05 PM PT",
    },
  },
  "membership-receipt": {
    template: "membership-receipt",
    extra: { verified: false, paymentMethodLabel: "Card" },
  },
};

/** Templates that carry the personalized Terms & Conditions PDF on real sends. */
const PDF_TEMPLATES = new Set(["membership-receipt", "membership-receipt-verified"]);

export async function sendTestEmailInternal(input: {
  templateKey: string;
  recipientEmail: string;
}): Promise<{ ok: boolean; subject?: string; attachment?: string; error?: string }> {
  const alias = TEST_ALIASES[input.templateKey];
  const templateName = alias?.template ?? input.templateKey;
  const template = TEMPLATES[templateName];
  if (!template) return { ok: false, error: `Unknown template: ${input.templateKey}` };

  const data: Record<string, unknown> = {
    ...(template.previewData ?? {}),
    ...(alias?.extra ?? {}),
  };

  const element = React.createElement(template.component, data);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function" ? template.subject(data) : template.subject;

  let attachments: Array<{ filename: string; content: string; contentType: string }> = [];
  let attachmentName: string | undefined;
  if (PDF_TEMPLATES.has(input.templateKey)) {
    try {
      const { buildMembershipTermsPdfBase64, membershipTermsPdfFilename } = await import(
        "@/lib/membership-pdf.server"
      );
      const receiptNumber = (data.receiptNumber as string) || "GBM-TEST-000001";
      const content = await buildMembershipTermsPdfBase64({
        businessName: (data.businessName as string) ?? null,
        ownerName: (data.ownerName as string) ?? null,
        receiptNumber,
        paymentDate: data.paymentDate as string,
        amountFormatted: data.amountFormatted as string,
        paymentMethodLabel: data.paymentMethodLabel as string,
      });
      attachmentName = membershipTermsPdfFilename(receiptNumber);
      attachments = [{ filename: attachmentName, content, contentType: "application/pdf" }];
    } catch (e) {
      console.error("test email PDF generation failed:", e);
    }
  }

  try {
    // Sent directly (not through the normal enqueue path) so internal-notification
    // templates with a fixed recipient still land in the tester's inbox, and so a
    // repeated test send is never deduped as "already sent".
    const result = await sendResendEmail({
      to: input.recipientEmail,
      subject: `[TEST] ${subject}`,
      html,
      text,
      tags: [{ name: "template", value: `test-${templateName}`.slice(0, 50) }],
      ...(attachments.length ? { attachments } : {}),
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("email_send_log").insert({
      message_id: `test-${crypto.randomUUID()}`,
      template_name: templateName,
      recipient_email: input.recipientEmail,
      status: "sent",
      provider_message_id: result.id || null,
      metadata: { test_send: true, template_key: input.templateKey },
    });

    return { ok: true, subject, attachment: attachmentName };
  } catch (err) {
    return { ok: false, subject, error: err instanceof Error ? err.message : String(err) };
  }
}
