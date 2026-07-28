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
            .select("id, campaign_status")
            .eq("email", email)
            .maybeSingle();
          if (!existing) continue;

          const currentRank = RANK[existing.campaign_status] ?? 0;
          const nextRank = RANK[nextStatus] ?? 0;
          if (nextRank < currentRank) continue;

          await supabaseAdmin
            .from("leads")
            .update({ campaign_status: nextStatus, last_event_at: evt.date ?? new Date().toISOString() })
            .eq("id", existing.id);
          updated++;
        }

        return Response.json({ ok: true, updated });
      },
    },
  },
});
