import { createFileRoute } from "@tanstack/react-router";

// Brevo transactional/email-campaign webhook.
// Configure in Brevo → set URL to:
//   https://<your-domain>/api/public/campaigns/brevo-webhook?token=<CAMPAIGNS_WEBHOOK_TOKEN>
// Subscribe events: sent, opened, click, hard_bounce, soft_bounce, unsubscribed, spam, blocked.

const EVENT_TO_STATUS: Record<string, string> = {
  sent: "sent",
  delivered: "sent",
  opened: "opened",
  unique_opened: "opened",
  click: "clicked",
  clicks: "clicked",
  hard_bounce: "bounced",
  soft_bounce: "bounced",
  blocked: "bounced",
  spam: "bounced",
  invalid_email: "bounced",
  unsubscribed: "unsubscribed",
  list_addition: "sent",
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

interface BrevoWebhookEvent {
  event?: string;
  email?: string;
  date?: string;
}

export const Route = createFileRoute("/api/public/campaigns/brevo-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CAMPAIGNS_WEBHOOK_TOKEN;
        if (!expected) return new Response("Not configured", { status: 500 });
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? request.headers.get("x-webhook-token");
        if (token !== expected) return new Response("Unauthorized", { status: 401 });

        let payload: BrevoWebhookEvent | BrevoWebhookEvent[];
        try {
          payload = (await request.json()) as BrevoWebhookEvent | BrevoWebhookEvent[];
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const events = Array.isArray(payload) ? payload : [payload];

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let updated = 0;
        for (const evt of events) {
          const email = evt.email?.toLowerCase();
          const eventName = evt.event?.toLowerCase();
          if (!email || !eventName) continue;
          const nextStatus = EVENT_TO_STATUS[eventName];
          if (!nextStatus) continue;

          const { data: existing } = await supabaseAdmin
            .from("leads")
            .select("id, campaign_status, open_count, click_count, sent_at, delivered_at, first_opened_at")
            .eq("email", email)
            .maybeSingle();
          if (!existing) continue;

          const when = evt.date ?? new Date().toISOString();
          const patch: {
            last_event_at: string;
            campaign_status?: string;
            sent_at?: string;
            delivered_at?: string;
            first_opened_at?: string;
            last_opened_at?: string;
            open_count?: number;
            click_count?: number;
          } = { last_event_at: when };

          const currentRank = RANK[existing.campaign_status] ?? 0;
          const nextRank = RANK[nextStatus] ?? 0;
          if (nextRank >= currentRank) patch.campaign_status = nextStatus;

          if (eventName === "sent" || eventName === "delivered" || eventName === "list_addition") {
            if (!existing.sent_at) patch.sent_at = when;
          }
          if (eventName === "delivered" && !existing.delivered_at) patch.delivered_at = when;

          if (eventName === "opened" || eventName === "unique_opened") {
            patch.open_count = (existing.open_count ?? 0) + 1;
            patch.last_opened_at = when;
            if (!existing.first_opened_at) patch.first_opened_at = when;
            // An open implies delivery even if the delivered event was missed.
            if (!existing.delivered_at) patch.delivered_at = when;
            if (!existing.sent_at) patch.sent_at = when;
          }
          if (eventName === "click" || eventName === "clicks") {
            patch.click_count = (existing.click_count ?? 0) + 1;
          }

          await supabaseAdmin.from("leads").update(patch).eq("id", existing.id);
          updated++;

        }

        return Response.json({ ok: true, updated });
      },
    },
  },
});
