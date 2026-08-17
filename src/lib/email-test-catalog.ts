// Client-safe catalog for the admin QA email test page (/admin/test-emails).
// Purely descriptive — sample merge data lives in each template's previewData.

export interface EmailTestEntry {
  /** Registry template name. */
  templateName: string;
  /** Human label shown on the test page. */
  label: string;
  /** When and to whom this email is really sent. */
  when: string;
  /** Audience: customer-facing or internal team notification. */
  audience: "customer" | "internal";
  /** True when a Terms & Conditions PDF is attached on the real send. */
  pdf?: boolean;
  group: string;
}

export const EMAIL_TEST_CATALOG: EmailTestEntry[] = [
  // Find & Claim
  {
    templateName: "business-claim-confirmation",
    label: "Find & Claim confirmation",
    when: "Sent to the owner right after a Find & Claim submission, before any payment.",
    audience: "customer",
    group: "Find & Claim",
  },

  // Membership payments
  {
    templateName: "membership-receipt",
    label: "Card payment — Thank You receipt (PDF attached)",
    when: "Sent immediately after a successful card payment. Terms & Conditions PDF attached.",
    audience: "customer",
    pdf: true,
    group: "Membership payments",
  },
  {
    templateName: "membership-pending-verification",
    label: "Zelle / Venmo — Stage 1 acknowledgment (no PDF)",
    when: "Sent immediately when a Zelle/Venmo submission is received, pending manual verification.",
    audience: "customer",
    group: "Membership payments",
  },
  {
    templateName: "membership-receipt-verified",
    label: "Zelle / Venmo — Stage 2 Payment Confirmed receipt (PDF attached)",
    when: "Sent when an admin marks the Zelle/Venmo order paid. Terms & Conditions PDF attached.",
    audience: "customer",
    pdf: true,
    group: "Membership payments",
  },
  {
    templateName: "membership-renewal-reminder",
    label: "Membership renewal reminder",
    when: "Sent 30 days before membership_due_date by the daily maintenance job.",
    audience: "customer",
    group: "Membership payments",
  },
  {
    templateName: "zelle-instructions",
    label: "Zelle / Venmo payment instructions",
    when: "Sent when a Zelle/Venmo order is created — how and where to send payment.",
    audience: "customer",
    group: "Membership payments",
  },
  {
    templateName: "payment-receipt",
    label: "Ad order payment receipt (Stripe checkout)",
    when: "Sent after a Stripe ad-plan checkout completes, with the private submission link.",
    audience: "customer",
    group: "Membership payments",
  },

  // Activation code flow
  {
    templateName: "activation-instructions",
    label: "Activation code — instructions / ad preview link",
    when: "Sent to a business when a sales rep issues an activation code.",
    audience: "customer",
    group: "Activation codes",
  },
  {
    templateName: "activation-receipt",
    label: "Activation code — paid receipt",
    when: "Sent after an activation order is paid (card, Zelle or Venmo).",
    audience: "customer",
    group: "Activation codes",
  },
  {
    templateName: "activation-invoice",
    label: "Activation code — Bill Me Later invoice",
    when: "Sent when a business chooses Bill Me Later; shows the 7-day due date.",
    audience: "customer",
    group: "Activation codes",
  },

  // Ad submission lifecycle
  {
    templateName: "submission-received",
    label: "Ad submission received",
    when: "Sent when an ad submission lands in the review queue.",
    audience: "customer",
    group: "Ad submissions",
  },
  {
    templateName: "ad-approved",
    label: "Ad approved / now live",
    when: "Sent when an admin approves a submission and the ad goes live.",
    audience: "customer",
    group: "Ad submissions",
  },
  {
    templateName: "ad-rejection",
    label: "Ad rejected / changes needed",
    when: "Sent when an admin rejects a submission, with the reason.",
    audience: "customer",
    group: "Ad submissions",
  },
  {
    templateName: "submit-reminder",
    label: "Submit your ad reminder",
    when: "Sent to a paid customer who hasn't completed their ad submission yet.",
    audience: "customer",
    group: "Ad submissions",
  },

  // Custom design orders
  {
    templateName: "design-receipt",
    label: "Custom design order receipt",
    when: "Sent after a Pro Design add-on / custom design order is paid.",
    audience: "customer",
    group: "Custom design",
  },
  {
    templateName: "design-intake-link",
    label: "Design intake link (email me my link for later)",
    when: "Sent when a customer asks for their private design intake link by email.",
    audience: "customer",
    group: "Custom design",
  },

  // Internal notifications
  {
    templateName: "paid-order-notification",
    label: "Internal — paid order notification",
    when: "Sent to processing@getbizmusic.com for every paid (non-free) order.",
    audience: "internal",
    group: "Internal notifications",
  },
  {
    templateName: "design-order-notification",
    label: "Internal — new custom design order",
    when: "Sent to the team when a custom design order comes in.",
    audience: "internal",
    group: "Internal notifications",
  },
  {
    templateName: "city-request-notification",
    label: "Internal — new city request",
    when: "Sent to the team when a visitor requests a city that doesn't exist yet.",
    audience: "internal",
    group: "Internal notifications",
  },
];

export const EMAIL_TEST_GROUPS = Array.from(
  new Set(EMAIL_TEST_CATALOG.map((e) => e.group)),
);
