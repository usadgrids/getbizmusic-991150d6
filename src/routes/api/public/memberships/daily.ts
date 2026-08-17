import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily membership maintenance (called by pg_cron).
 *
 * 1. Sends the manual-renewal reminder email 30 days before membership_due_date
 *    (once per term — guarded by renewal_reminder_sent_at).
 * 2. Lapses active memberships whose due date has passed and expires their live ads.
 * 3. Cancels Pay Later submissions that blew past their 7-day bill_later_due_date,
 *    clearing founding-member / priority / locked-price perks on the related claim.
 */
async function runDailyMaintenance() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { enqueueTransactionalEmailInternal } = await import("@/lib/email/enqueue.server");

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const in30 = new Date(today.getTime() + 30 * 86400_000);

  const result = { remindersSent: 0, lapsed: 0, cancelled: 0, errors: [] as string[] };

  // 1) Renewal reminders — exactly 30 days out, not yet reminded.
  const { data: dueSoon, error: dueErr } = await supabaseAdmin
    .from("ad_payments")
    .select("id, customer_email, owner_name, business_name, amount_cents, membership_due_date")
    .eq("membership_status", "active")
    .is("renewal_reminder_sent_at", null)
    .eq("membership_due_date", iso(in30));
  if (dueErr) result.errors.push(`due-soon: ${dueErr.message}`);

  for (const row of dueSoon ?? []) {
    try {
      await enqueueTransactionalEmailInternal({
        templateName: "membership-renewal-reminder",
        recipientEmail: row.customer_email as string,
        idempotencyKey: `membership-renewal-${row.id}-${row.membership_due_date}`,
        templateData: {
          ownerName: (row.owner_name as string) || undefined,
          businessName: (row.business_name as string) || undefined,
          dueDate: new Date(`${row.membership_due_date}T12:00:00Z`).toLocaleDateString("en-US", {
            dateStyle: "long",
          }),
          amountFormatted: row.amount_cents
            ? `$${((row.amount_cents as number) / 100).toFixed(2)}`
            : undefined,
          renewUrl: "https://getbizmusic.com/pricing",
        },
      });
      await supabaseAdmin
        .from("ad_payments")
        .update({ renewal_reminder_sent_at: new Date().toISOString() })
        .eq("id", row.id);
      result.remindersSent += 1;
    } catch (err) {
      result.errors.push(`reminder ${row.id}: ${String(err)}`);
    }
  }

  // 2) Lapse memberships past their due date.
  const { data: lapsedRows, error: lapseErr } = await supabaseAdmin
    .from("ad_payments")
    .update({ membership_status: "lapsed" })
    .eq("membership_status", "active")
    .lt("membership_due_date", iso(today))
    .select("id");
  if (lapseErr) result.errors.push(`lapse: ${lapseErr.message}`);
  result.lapsed = lapsedRows?.length ?? 0;

  // Pull their ads off the public rotation (data is kept, just no longer active).
  for (const row of lapsedRows ?? []) {
    const { data: subs } = await supabaseAdmin
      .from("ad_submissions")
      .select("ad_id")
      .eq("payment_id", row.id);
    const adIds = (subs ?? []).map((s) => s.ad_id).filter(Boolean) as string[];
    if (adIds.length) {
      await supabaseAdmin.from("ads").update({ status: "expired" }).in("id", adIds);
    }
  }

  // 3) Cancel unpaid Pay Later submissions past their 7-day window.
  const { data: overdue, error: overdueErr } = await supabaseAdmin
    .from("ad_payments")
    .update({ membership_status: "cancelled", status: "cancelled", token_used: true })
    .eq("payment_method", "pay_later")
    .eq("payment_verified", false)
    .lt("bill_later_due_date", new Date().toISOString())
    .in("membership_status", ["pending", "pending_verification"])
    .select("id, customer_email");
  if (overdueErr) result.errors.push(`pay-later: ${overdueErr.message}`);
  result.cancelled = overdue?.length ?? 0;

  for (const row of overdue ?? []) {
    // Strip promotional perks tied to that email's claim record.
    await supabaseAdmin
      .from("business_claims")
      .update({ founding_member: false, priority: false, locked_price: null })
      .eq("owner_email", (row.customer_email as string).toLowerCase());
  }

  return result;
}

export const Route = createFileRoute("/api/public/memberships/daily")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await runDailyMaintenance();
          return Response.json({ ok: true, ...result });
        } catch (err) {
          console.error("membership daily maintenance failed", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
