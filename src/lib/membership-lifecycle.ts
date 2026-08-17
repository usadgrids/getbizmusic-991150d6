/** Shared helpers for the AI Business Alliance membership lifecycle on ad_payments. */

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addYears(d: Date, years: number) {
  const next = new Date(d);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

/**
 * Fields to write when a membership payment is confirmed (card auto-verified,
 * or Zelle/Venmo/pay-later manually verified by an admin).
 */
export function membershipActivatedFields(paidAtIso: string, verifiedBy?: string) {
  const paidAt = new Date(paidAtIso);
  return {
    membership_status: "active",
    membership_start_date: isoDate(paidAt),
    membership_due_date: isoDate(addYears(paidAt, 1)),
    renewal_reminder_sent_at: null as string | null,
    payment_verified: true,
    payment_verified_at: paidAtIso,
    ...(verifiedBy ? { payment_verified_by: verifiedBy } : {}),
  };
}

/** Fields to write when a checkout is started, before money is confirmed. */
export function membershipPendingFields(
  paymentMethod: "card" | "pay_later" | "zelle" | "venmo",
  termsAcceptedAtIso: string,
) {
  const base = {
    payment_method: paymentMethod,
    terms_accepted_at: termsAcceptedAtIso,
    payment_verified: false,
    membership_status:
      paymentMethod === "zelle" || paymentMethod === "venmo" ? "pending_verification" : "pending",
  };
  if (paymentMethod === "pay_later") {
    return {
      ...base,
      bill_later_due_date: new Date(
        new Date(termsAcceptedAtIso).getTime() + 7 * 86400_000,
      ).toISOString(),
    };
  }
  return base;
}
