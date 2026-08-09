import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  lookupActivationCode,
  submitActivation,
  confirmActivationSession,
  type ActivationProof,
} from "@/lib/activation.functions";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import zelleQr from "@/assets/zelle-qr.jpeg.asset.json";

const NAVY = "#0F2A4A";

export const Route = createFileRoute("/activate")({
  validateSearch: z.object({
    code: z.string().optional(),
    session_id: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Activate Your Ad — Get Biz Music" },
      { name: "description", content: "Enter your activation code to review your ad proof, confirm the details, and activate your GetBizMusic listing." },
      { property: "og:title", content: "Activate Your Ad — Get Biz Music" },
      { property: "og:description", content: "Review your ad proof, confirm your details, and activate your GetBizMusic listing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivatePage,
});

type ManualInfo = { method: "zelle" | "venmo"; memoCode: string; amountFormatted: string; zellePhone: string; venmoHandle: string };

function ActivatePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const lookupFn = useServerFn(lookupActivationCode);
  const submitFn = useServerFn(submitActivation);
  const confirmFn = useServerFn(confirmActivationSession);

  const [codeInput, setCodeInput] = useState(search.code ?? "");
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState<ActivationProof | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [manual, setManual] = useState<ManualInfo | null>(null);
  const [paidName, setPaidName] = useState<string | null>(null);

  // Form state
  const [correct, setCorrect] = useState<"yes" | "no">("yes");
  const [notes, setNotes] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [voice, setVoice] = useState("");
  const [sms, setSms] = useState("");
  const [sameAsVoice, setSameAsVoice] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [method, setMethod] = useState<"stripe" | "zelle" | "venmo">("stripe");
  const [submitting, setSubmitting] = useState(false);

  const runLookup = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    setLoading(true);
    setLookupError(null);
    try {
      const res = await lookupFn({ data: { code } });
      if (!res.found) {
        setProof(null);
        setLookupError(res.reason);
        return;
      }
      setProof(res.proof);
      setBusinessName(res.proof.businessName ?? "");
      setAddress(res.proof.businessAddress ?? "");
      setEmail(res.proof.contactEmail ?? "");
      setVoice(res.proof.phoneVoice ?? "");
      setSms(res.proof.phoneSms ?? "");
      setSameAsVoice(!res.proof.phoneSms || res.proof.phoneSms === res.proof.phoneVoice);
      if (res.proof.paid) setPaidName(res.proof.businessName);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-lookup from the link, and confirm a returning Stripe session.
  useEffect(() => {
    if (search.code) void runLookup(search.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.code]);

  useEffect(() => {
    if (!search.session_id) return;
    (async () => {
      try {
        const res = await confirmFn({ data: { sessionId: search.session_id!, environment: getStripeEnvironment() } });
        if (res.status === "paid") setPaidName(res.businessName ?? "your business");
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.session_id]);

  const submit = async () => {
    if (!proof) return;
    if (!agreed) return toast.error("Please agree to the terms to continue.");
    if (correct === "no" && notes.trim().length < 5) {
      return toast.error("Please describe the corrections you'd like.");
    }
    setSubmitting(true);
    try {
      const res = await submitFn({
        data: {
          code: proof.code,
          confirmedCorrect: correct === "yes",
          correctionNotes: correct === "no" ? notes.trim() : undefined,
          businessName,
          businessAddress: address || undefined,
          email,
          phoneVoice: voice || undefined,
          phoneSms: (sameAsVoice ? voice : sms) || undefined,
          agreedTerms: true,
          paymentMethod: method,
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/activate?code=${encodeURIComponent(proof.code)}&session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if (!res.ok) throw new Error(res.error);
      if (res.method === "stripe") setClientSecret(res.clientSecret);
      else setManual({ method: res.method, memoCode: res.memoCode, amountFormatted: res.amountFormatted, zellePhone: res.zellePhone, venmoHandle: res.venmoHandle });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Paid confirmation ---------- */
  if (paidName) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-600 mb-3" size={44} />
          <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">Payment received — thank you!</h1>
          <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto">
            We're now working on your GetBizMusic.com ad to perfection. Please allow a few business days —
            you'll get another email the moment your ad is live and activated. A receipt is on its way to your inbox.
          </p>
          <Link to="/" className="inline-block mt-6 bg-[#0F2A4A] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#163864]">
            Listen to the music &amp; view ads
          </Link>
        </div>
      </Shell>
    );
  }

  /* ---------- Stripe embedded checkout ---------- */
  if (clientSecret) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <button
            onClick={() => setClientSecret(null)}
            className="text-xs text-gray-500 hover:text-[#0F2A4A] mb-3"
          >
            ← Back to my ad details
          </button>
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </Shell>
    );
  }

  /* ---------- Manual payment instructions ---------- */
  if (manual) {
    const isVenmo = manual.method === "venmo";
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6 sm:p-8">
          <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">
            Send your {isVenmo ? "Venmo" : "Zelle"} payment
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Your ad is reserved. Send the payment below and we'll start perfecting your ad as soon as it clears.
            Instructions were also emailed to you.
          </p>
          <div className="mt-5 bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-2 text-sm">
            <div><span className="font-semibold text-[#0F2A4A]">Amount due:</span> {manual.amountFormatted}</div>
            {isVenmo ? (
              <div><span className="font-semibold text-[#0F2A4A]">Venmo:</span> {manual.venmoHandle}</div>
            ) : (
              <div><span className="font-semibold text-[#0F2A4A]">Zelle to:</span> {manual.zellePhone} (WINALL MEDIA LLC)</div>
            )}
            <div><span className="font-semibold text-[#0F2A4A]">Memo / note:</span> <span className="font-mono font-bold">{manual.memoCode}</span></div>
            <p className="text-xs text-gray-600 pt-1">
              The memo code is how we match your payment to your ad — please include it exactly.
            </p>
          </div>
          {!isVenmo && (
            <div className="mt-5 text-center">
              <p className="text-[11px] uppercase tracking-wider font-bold text-purple-700 mb-2">Or scan to pay instantly</p>
              <img src={zelleQr.url} alt="Zelle QR code for WINALL MEDIA LLC" className="mx-auto w-52 h-52 rounded-xl border-2 border-purple-300 bg-white p-2" />
            </div>
          )}
          <Link to="/" className="block text-center mt-6 text-sm text-[#0F2A4A] hover:underline">
            Back to GetBizMusic
          </Link>
        </div>
      </Shell>
    );
  }

  /* ---------- Code entry ---------- */
  if (!proof) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="text-[#D4A24C]" size={20} />
            <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">Activate your ad</h1>
          </div>
          <p className="text-sm text-gray-600">
            Enter the activation code from your flyer or email to review your ad before it goes live.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void navigate({ to: "/activate", search: { code: codeInput.trim().toUpperCase() } });
              void runLookup(codeInput);
            }}
            className="mt-5 space-y-3"
          >
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="ACTIVATION CODE"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono tracking-widest uppercase text-center focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            />
            <button
              type="submit"
              disabled={loading || !codeInput.trim()}
              className="w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-lg hover:bg-[#e0b266] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="animate-spin" size={16} /> Checking…</> : "View My Ad"}
            </button>
          </form>
          {lookupError && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  /* ---------- Proof review + payment ---------- */
  return (
    <Shell>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0F2A4A] text-white px-5 py-3 flex items-center gap-2">
            <ShieldCheck className="text-[#D4A24C]" size={18} />
            <h1 className="font-serif text-lg">Review your ad — code {proof.code}</h1>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {proof.imageUrl ? (
                <img src={proof.imageUrl} alt={`${proof.businessName} ad proof`} className="w-full rounded-xl border border-gray-200" />
              ) : (
                <div className="w-full aspect-video rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-400">
                  Ad image coming soon
                </div>
              )}
            </div>
            <div className="text-sm space-y-1.5">
              <Detail label="Business" value={proof.businessName} />
              <Detail label="Category" value={proof.industry.replace(/_/g, " ")} />
              <Detail label="Tagline" value={proof.tagline} />
              <Detail label="City" value={proof.cityLabel} />
              <Detail label="Website" value={proof.websiteUrl} />
              <Detail label="Video" value={proof.youtubeUrl} />
              <Detail label="Rotation" value={proof.adType === "slider_10" ? "Featured Slider — 10 seconds" : "Standard Image — 7 seconds"} />
              <div className="pt-3 mt-3 border-t border-gray-200">
                <div className="text-2xl font-bold text-[#0F2A4A]">${(proof.priceCents / 100).toFixed(2)}</div>
                {proof.priceNote && <div className="text-xs text-gray-500">{proof.priceNote}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="font-serif text-lg font-bold text-[#0F2A4A]">Is everything correct?</h2>
          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="radio" checked={correct === "yes"} onChange={() => setCorrect("yes")} className="mt-1 accent-emerald-600" />
              <span>Yes — the ad above is correct, publish it as-is.</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="radio" checked={correct === "no"} onChange={() => setCorrect("no")} className="mt-1 accent-amber-600" />
              <span>I'd like some corrections or improvements.</span>
            </label>
          </div>
          {correct === "no" && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Tell us anything you'd like changed — wording, colors, photo, phone number, hours, offers…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            />
          )}
        </div>

        {/* Contact details */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#0F2A4A]">Your business details</h2>
          <p className="text-xs text-gray-500 -mt-2">Pre-filled from your listing — edit anything that's out of date.</p>
          <Field label="Business name" value={businessName} onChange={setBusinessName} required />
          <Field label="Business address" value={address} onChange={setAddress} />
          <Field label="Customer support email" value={email} onChange={setEmail} type="email" required />
          <Field label="Customer support number (voice)" value={voice} onChange={setVoice} />
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={sameAsVoice} onChange={(e) => setSameAsVoice(e.target.checked)} className="accent-[#0F2A4A]" />
            Text/SMS number is the same as voice
          </label>
          {!sameAsVoice && <Field label="Customer support number (text/SMS)" value={sms} onChange={setSms} />}
        </div>

        {/* Terms + payment */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-[#0F2A4A]" />
            <span>
              I confirm the details above are accurate and I agree to the GetBizMusic novelty advertising terms,
              disclosures, and no-refund policy. GetBizMusic ads are novelty promotional listings; music streaming
              is provided for entertainment and is not affiliated with the advertised businesses.
            </span>
          </label>

          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">Payment method</div>
            <div className="grid grid-cols-3 gap-2">
              {(["stripe", "zelle", "venmo"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`border rounded-lg py-2 text-sm font-semibold capitalize ${
                    method === m ? "border-[#0F2A4A] bg-[#0F2A4A] text-white" : "border-gray-300 text-gray-700 hover:border-[#0F2A4A]"
                  }`}
                >
                  {m === "stripe" ? "Card" : m}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={submitting || !agreed}
            className="w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-lg hover:bg-[#e0b266] disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 className="animate-spin" size={16} /> Working…</> : `Continue — $${(proof.priceCents / 100).toFixed(2)}`}
          </button>
          <p className="text-[11px] text-gray-500 text-center">
            {correct === "no"
              ? "We'll apply your corrections and send the updated ad for approval before it goes live."
              : "Your ad will be published exactly as shown above."}
          </p>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <PaymentTestModeBanner />
      <header className="bg-[#0F2A4A] text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg">Get Biz Music</Link>
          <span className="text-xs text-white/70">Ad Activation</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="font-semibold" style={{ color: NAVY }}>{label}:</span>{" "}
      <span className="text-gray-700 break-words">{value?.trim() ? value : "—"}</span>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600">{label}{required && " *"}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
      />
    </label>
  );
}
