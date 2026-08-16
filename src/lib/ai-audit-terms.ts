/** Shared copy for the free AI Visibility Audit + free ad design terms. */
export const AI_AUDIT_TERMS_TITLE = "AI Visibility Audit & Free Ad Design — Terms & Conditions";

export const AI_AUDIT_TERMS: string[] = [
  "The AI Visibility Audit is provided free of charge and is split into two parts. First, GetBizMusic.com will implement everything we can control directly — this includes building your unique Knowledge Graph page on our own site (structured schema markup, AI-readable business data, and citation-ready content) designed to help AI answer engines discover and cite your business through GetBizMusic.com. Second, the audit will also identify additional recommendations that apply specifically to your own existing website (if you have one) — these are advisory only, and you are free to implement them yourself or hand them to your own webmaster, at no cost or obligation to GetBizMusic.com.",
  "We do not access, edit, or modify any website you did not build with us. Our recommendations are advisory only. If a website already exists that was created by you or a third party, GetBizMusic.com will not log into, alter, or take any action on that site. Implementation of any recommendation on an existing third-party-built site is solely your (or your webmaster's) responsibility.",
  "Optional site build available separately. If you do not have a website, or would like GetBizMusic.com to build or replicate your existing site as a new, AI-optimized website, this is available as a separate paid service, priced and scoped independently of the AI Business Alliance Membership.",
  "The professional ad graphic is designed for your review at no cost. You may preview the design, but it may not be used, published, downloaded, or distributed in any form until it has been (a) approved by you, and (b) an active AI Business Alliance Membership has been purchased.",
  "Once approved and membership is active, you may use the finished ad graphic for any purpose you choose (your website, social media, print, etc.), and it will also be published on the GetBizMusic.com AI Business Alliance public directory as part of your membership.",
  "AI Business Alliance Membership is available at an introductory price of $49.95/year. Pricing is subject to change at any time without notice, except where a Launch Code price-lock has been successfully applied to a qualifying membership.",
  "These terms may be updated at any time. Continued use of any free report, audit, or design constitutes acceptance of the then-current terms.",
];

/** Watermark shown over any ad design that is not yet released for use. */
export const DESIGN_PREVIEW_WATERMARK =
  "PREVIEW ONLY — Not for use until approved & membership active";

/**
 * Terms rule #4: an ad design may only be downloaded/used once the business
 * has approved it AND a membership is active (founding member price-lock or a
 * recorded/completed Alliance membership payment).
 */
export function canUseAdDesign(claim: {
  design_approved?: boolean | null;
  founding_member?: boolean | null;
  alliance_member?: boolean | null;
  alliance_membership_date?: string | null;
}): boolean {
  const membershipActive = Boolean(
    claim.founding_member || claim.alliance_member || claim.alliance_membership_date,
  );
  return Boolean(claim.design_approved) && membershipActive;
}
