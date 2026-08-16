import { createFileRoute } from "@tanstack/react-router";

// Resend webhook for campaign engagement tracking.
// Configure in Resend → Webhooks → URL:
//   https://<your-domain>/api/public/campaigns/resend-webhook?token=<CAMPAIGNS_WEBHOOK_TOKEN>
// Events: email.sent, email.delivered, email.opened, email.clicked,
//         email.bounced, email.complained.

const EVENT_TO_STATUS: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "sent",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "bounced",
  "email.delivery_delayed": "sent",
};

// Rank so a later "clicked" wins over an earlier "opened"/"sent".
const RANK: Record<string, number> = {
  not_sent: 0,
  sent: 1,
  opened: 2,
  clicked: 3,
  bounced: 4,
  unsubscribed: 5,
};

interface ResendWebhookEvent {
  type?: string;
  created_at?: string;
  data?: {
    to?: string[] | string;
    email_id?: string;
  };
}

export const Route = createFileRoute("/api/public/campaigns/resend-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CAMPAIGNS_WEBHOOK_TOKEN;
        if (!expected) return new Response("Not configured", { status: 500 });
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? request.headers.get("x-webhook-token");
        if (token !== expected) return new Response("Unauthorized", { status: 401 });

        let payload: ResendWebhookEvent | ResendWebhookEvent[];
        try {
          payload = (await request.json()) as ResendWebhookEvent | ResendWebhookEvent[];
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const events = Array.isArray(payload) ? payload : [payload];

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let updated = 0;
        for (const evt of events) {
          const eventName = evt.type?.toLowerCase();
          const rawTo = evt.data?.to;
          const email = (Array.isArray(rawTo) ? rawTo[0] : rawTo)?.toLowerCase();
          if (!email || !eventName) continue;
          const nextStatus = EVENT_TO_STATUS[eventName];
          if (!nextStatus) continue;

          const { data: existing } = await supabaseAdmin
            .from("leads")
            .select("id, campaign_status, open_count, click_count, sent_at, delivered_at, first_opened_at")
            .eq("email", email)
            .maybeSingle();
          if (!existing) continue;

          const when = evt.created_at ?? new Date().toISOString();
          const patch: Record<string, string | number> = { last_event_at: when };

          const currentRank = RANK[existing.campaign_status] ?? 0;
          const nextRank = RANK[nextStatus] ?? 0;
          if (nextRank >= currentRank) patch.campaign_status = nextStatus;

          if (eventName === "email.sent" && !existing.sent_at) patch.sent_at = when;
          if (eventName === "email.delivered") {
            if (!existing.delivered_at) patch.delivered_at = when;
            if (!existing.sent_at) patch.sent_at = when;
          }

          if (eventName === "email.opened") {
            patch.open_count = (existing.open_count ?? 0) + 1;
            patch.last_opened_at = when;
            if (!existing.first_opened_at) patch.first_opened_at = when;
            // An open implies delivery even if the delivered event was missed.
            if (!existing.delivered_at) patch.delivered_at = when;
            if (!existing.sent_at) patch.sent_at = when;
          }
          if (eventName === "email.clicked") {
            patch.click_count = (existing.click_count ?? 0) + 1;
          }

          await supabaseAdmin.from("leads").update(patch).eq("id", existing.id);
          updated++;

          // Hard bounces and spam complaints must never be mailed again.
          if (eventName === "email.bounced" || eventName === "email.complained") {
            await supabaseAdmin.from("suppressed_emails").upsert(
              {
                email,
                reason: eventName === "email.complained" ? "complaint" : "bounce",
              },
              { onConflict: "email" },
            );
          }
        }

        return Response.json({ ok: true, updated });
      },
    },
  },
});
