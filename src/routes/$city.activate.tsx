import { MEMBERSHIP_CHECKBOX_TEXT } from "@/lib/membership-terms";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
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
  payActivationInvoice,
  type ActivationProof,
} from "@/lib/activation.functions";
import { supabase } from "@/integrations/supabase/client";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import zelleQr from "@/assets/zelle-qr.jpeg.asset.json";
import {
  DIRECTORY_CATEGORIES,
  isDirectoryCategory,
  type DirectoryCategory,
} from "@/lib/directory-categories";

const NAVY = "#0F2A4A";

export const Route = createFileRoute("/$city/activate")({
  validateSearch: z.object({
    code: z.string().optional(),
    session_id: z.string().optional(),
    pay: z.string().optional(),
  }),
  beforeLoad: ({ params }) => {
    // Shared activation template — only Knowledge Graph categories use it.
    if (!isDirectoryCategory(params.city)) throw notFound();
  },
  head: ({ params }) => {
    const config = isDirectoryCategory(params.city)
      ? DIRECTORY_CATEGORIES[params.city as DirectoryCategory]
      : null;
    const title = `Activate Your ${config?.title ?? "Business"} Ad — Get Biz Music`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Enter your activation code to review your ${config?.phrase ?? "business"} ad proof, confirm the details, and activate your GetBizMusic listing.`,
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: `Review your ${config?.phrase ?? "business"} ad proof, confirm your details, and activate your GetBizMusic listing.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Activation page not found.</div>
  ),
  component: CategoryActivatePage,
});

type ManualInfo = { method: "zelle" | "venmo"; memoCode: string; amountFormatted: string; zellePhone: string; venmoHandle: string };
type BilledInfo = {
  invoiceNumber: string;
  amountFormatted: string;
  dueDateFormatted: string;
  zellePhone: string;
  venmoHandle: string;
  artworkPending: boolean;
};
type PaymentChoice = "stripe" | "zelle" | "venmo" | "bill_later";
type ArtworkChoice = "ours" | "customer" | "later";

function CategoryActivatePage() {
  const search = Route.useSearch();
  const { city } = Route.useParams();
  const category = city as DirectoryCategory;
  const config = DIRECTORY_CATEGORIES[category];
  const navigate = useNavigate();
  const lookupFn = useServerFn(lookupActivationCode);
  const submitFn = useServerFn(submitActivation);
  const confirmFn = useServerFn(confirmActivationSession);
  const payInvoiceFn = useServerFn(payActivationInvoice);

  const [codeInput, setCodeInput] = useState(search.code ?? "");
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState<ActivationProof | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [manual, setManual] = useState<ManualInfo | null>(null);
  const [billed, setBilled] = useState<BilledInfo | null>(null);
  const [paidName, setPaidName] = useState<string | null>(null);

  // Form state
  const [correct, setCorrect] = useState<"yes" | "no">("yes");
  const [notes, setNotes] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [tagline, setTagline] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [voice, setVoice] = useState("");
  const [sms, setSms] = useState("");
  const [sameAsVoice, setSameAsVoice] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [method, setMethod] = useState<PaymentChoice>("stripe");
  const [submitting, setSubmitting] = useState(false);
  const [artwork, setArtwork] = useState<ArtworkChoice>("ours");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);

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
      setContactName(res.proof.contactName ?? "");
      setTagline(res.proof.tagline ?? "");
      setWebsiteUrl(res.proof.websiteUrl ?? "");
      setYoutubeUrl(res.proof.youtubeUrl ?? "");
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

  const resetCode = () => {
    setProof(null);
    setCodeInput("");
    setLookupError(null);
    setCorrect("yes");
    setNotes("");
    setBusinessName("");
    setContactName("");
    setTagline("");
    setWebsiteUrl("");
    setYoutubeUrl("");
    setAddress("");
    setEmail("");
    setVoice("");
    setSms("");
    setSameAsVoice(true);
    setAgreed(false);
    setMethod("stripe");
    setArtwork("ours");
    setArtworkFile(null);
    setClientSecret(null);
    setManual(null);
    setBilled(null);
    try {
      sessionStorage.removeItem("gbm_activation_code");
    } catch {
      /* ignore */
    }
    void navigate({ to: "/$city/activate", params: { city: category }, search: {} });
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

  // "Pay now" link from the invoice email: open card checkout straight away.
  useEffect(() => {
    if (!search.pay || !search.code) return;
    (async () => {
      try {
        const res = await payInvoiceFn({
          data: {
            code: search.code!,
            environment: getStripeEnvironment(),
            returnUrl: `${window.location.origin}/${category}/activate?code=${encodeURIComponent(search.code!)}&session_id={CHECKOUT_SESSION_ID}`,
          },
        });
        if (res.ok) setClientSecret(res.clientSecret);
        else toast.error(res.error);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not open checkout");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.pay, search.code]);

  const submit = async () => {
    if (!proof) return;
    if (!businessName.trim()) return toast.error("Please enter your business name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      return toast.error("Please enter a valid customer support email address.");
    }
    if (!agreed) return toast.error("Please agree to the terms to continue.");
    if (correct === "no" && notes.trim().length < 5) {
      return toast.error("Please describe the corrections you'd like.");
    }
    if (artwork === "customer" && !artworkFile) {
      return toast.error("Please choose your ad image file, or pick another artwork option.");
    }
    setSubmitting(true);

    try {
      let customerImagePath: string | undefined;
      if (artwork === "customer" && artworkFile) {
        if (artworkFile.size > 10 * 1024 * 1024) throw new Error("Image must be 10MB or smaller.");
        const ext = artworkFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `activation/${proof.code}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("ad-uploads")
          .upload(path, artworkFile, { contentType: artworkFile.type, upsert: false });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        customerImagePath = path;
      }

      const res = await submitFn({
        data: {
          code: proof.code,
          confirmedCorrect: correct === "yes",
          correctionNotes: correct === "no" ? notes.trim() : undefined,
          businessName: businessName.trim(),
          contactName: contactName.trim() || undefined,
          tagline: tagline.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          youtubeUrl: youtubeUrl.trim() || undefined,
          businessAddress: address.trim() || undefined,
          email: email.trim(),
          phoneVoice: voice.trim() || undefined,
          phoneSms: (sameAsVoice ? voice : sms).trim() || undefined,

          agreedTerms: true,
          paymentMethod: method,
          artworkChoice: artwork,
          customerImagePath,
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/${category}/activate?code=${encodeURIComponent(proof.code)}&session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if (!res.ok) throw new Error(res.error);
      if (res.method === "stripe") {
        setClientSecret(res.clientSecret);
      } else if (res.method === "bill_later") {
        setBilled({
          invoiceNumber: res.invoiceNumber,
          amountFormatted: res.amountFormatted,
          dueDateFormatted: res.dueDateFormatted,
          zellePhone: res.zellePhone,
          venmoHandle: res.venmoHandle,
          artworkPending: artwork === "later",
        });
      } else {
        setManual({ method: res.method, memoCode: res.memoCode, amountFormatted: res.amountFormatted, zellePhone: res.zellePhone, venmoHandle: res.venmoHandle });
      }
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
          <Link to="/$city" params={{ city: category }} className="inline-block mt-6 bg-[#0F2A4A] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#163864]">
            Back to {config.title}
          </Link>
        </div>
      </Shell>
    );
  }

  /* ---------- Bill me later confirmation ---------- */
  if (billed) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-[#D4A24C] shadow-sm p-6 sm:p-8">
          <CheckCircle2 className="mx-auto text-[#D4A24C] mb-3" size={44} />
          <h1 className="font-serif text-2xl font-bold text-[#0F2A4A] text-center">Thank you for your order!</h1>
          <p className="text-sm text-gray-600 mt-3 text-center max-w-md mx-auto">
            You've been billed — no payment was taken today. We'll publish your ad and you can pay at your
            earliest convenience. A copy of this invoice is on its way to your inbox.
          </p>
          <div className="mt-5 bg-[#FFFBF2] border border-[#D4A24C] rounded-xl p-5 space-y-2 text-sm">
            <div><span className="font-semibold text-[#0F2A4A]">Invoice number:</span> <span className="font-mono font-bold">{billed.invoiceNumber}</span></div>
            <div><span className="font-semibold text-[#0F2A4A]">Amount due:</span> {billed.amountFormatted}</div>
            <div><span className="font-semibold text-[#0F2A4A]">Due by:</span> {billed.dueDateFormatted}</div>
          </div>
          {billed.artworkPending && (
            <p className="mt-4 text-xs text-gray-600 text-center">
              We also emailed you a private link to upload your ad image whenever it's ready.
            </p>
          )}
          <div className="mt-6 text-sm text-gray-700">
            <p className="font-semibold text-[#0F2A4A] mb-2">Ways to pay whenever you're ready:</p>
            <ul className="space-y-1 text-xs">
              <li>• Card, debit or credit — use the "Pay now" button in your invoice email.</li>
              <li>• Zelle: {billed.zellePhone} (WINALL MEDIA LLC)</li>
              <li>• Venmo: {billed.venmoHandle}</li>
            </ul>
            <p className="text-[11px] text-gray-500 mt-2">Include invoice {billed.invoiceNumber} in the memo.</p>
          </div>
          <Link to="/$city" params={{ city: category }} className="block text-center mt-6 text-sm text-[#0F2A4A] hover:underline">
            Back to {config.title}
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
          <Link to="/$city" params={{ city: category }} className="block text-center mt-6 text-sm text-[#0F2A4A] hover:underline">
            Back to {config.title}
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
            <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">Activate your {config.phrase} ad</h1>
          </div>
          <p className="text-sm text-gray-600">
            Enter the activation code from your flyer or email to review your ad before it goes live.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void navigate({ to: "/$city/activate", params: { city: category }, search: { code: codeInput.trim().toUpperCase() } });
              void runLookup(codeInput);
            }}
            className="mt-5 space-y-3"
          >
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="ACTIVATION CODE"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono tracking-widest uppercase text-center text-[#0F2A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
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
          <div className="bg-[#0F2A4A] text-white px-5 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="text-[#D4A24C] shrink-0" size={18} />
              <h1 className="font-serif text-lg truncate">Review your ad — code {proof.code}</h1>
            </div>
            <button
              type="button"
              onClick={resetCode}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <KeyRound size={13} /> Use a different code
            </button>
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
          <h2 className="font-serif text-lg font-bold text-[#0F2A4A]">Look at your Advertising Proposal Flyer. Make sure everything is correct. If not click "I'd like some corrections or improvement".</h2>
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#0F2A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            />
          )}
        </div>

        {/* Contact details */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#0F2A4A]">Your business details</h2>
          <p className="text-xs text-gray-500 -mt-2">
            Everything below is pre-filled from your activation code — please check, confirm, and update anything
            that isn't current.
          </p>
          <Field label="Business name" value={businessName} onChange={setBusinessName} required />
          <Field label="Contact person" value={contactName} onChange={setContactName} />
          <Field label="Business address" value={address} onChange={setAddress} />
          <Field label="Tagline / slogan shown on your ad" value={tagline} onChange={setTagline} />
          <Field label="Website URL" value={websiteUrl} onChange={setWebsiteUrl} />
          <Field label="Video URL (YouTube, optional)" value={youtubeUrl} onChange={setYoutubeUrl} />
          <Field label="Customer support email" value={email} onChange={setEmail} type="email" required />
          <Field label="Customer support number (voice)" value={voice} onChange={setVoice} />
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={sameAsVoice} onChange={(e) => setSameAsVoice(e.target.checked)} className="accent-[#0F2A4A]" />
            Text/SMS number is the same as voice
          </label>
          {!sameAsVoice && <Field label="Customer support number (text/SMS)" value={sms} onChange={setSms} />}
        </div>

        {/* Artwork choice */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#0F2A4A]">Your ad artwork</h2>
          {(
            [
              { key: "ours", title: "Use the ad we designed for you", desc: "The proof shown above goes live as-is (or with your corrections)." },
              { key: "customer", title: "I'll upload my own ad image", desc: "Already have a professionally designed ad? Upload it now — we review every image." },
              { key: "later", title: "I'll send my ad image later", desc: "Activate and pay now; we'll email you a private upload link." },
            ] as { key: ArtworkChoice; title: string; desc: string }[]
          ).map((o) => (
            <label
              key={o.key}
              className={`flex items-start gap-3 border rounded-xl p-3 cursor-pointer ${
                artwork === o.key ? "border-[#0F2A4A] bg-[#F5F8FC]" : "border-gray-200 hover:border-[#0F2A4A]"
              }`}
            >
              <input
                type="radio"
                name="artwork"
                checked={artwork === o.key}
                onChange={() => setArtwork(o.key)}
                className="mt-1 accent-[#0F2A4A]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#0F2A4A]">{o.title}</span>
                <span className="block text-xs text-gray-600">{o.desc}</span>
              </span>
            </label>
          ))}
          {artwork === "customer" && (
            <div className="pt-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setArtworkFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#0F2A4A] file:text-white file:text-xs file:font-semibold"
              />
              <p className="text-[11px] text-gray-500 mt-1">PNG, JPG or WEBP up to 10MB. Professional-grade images only.</p>
            </div>
          )}
        </div>

        {/* Terms + payment */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-[#0F2A4A]" />
            <span>
              {MEMBERSHIP_CHECKBOX_TEXT}{" "}
              <a
                href="/terms/membership"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#0F2A4A] underline"
              >
                (Full Terms &amp; Conditions)
              </a>
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
            <button
              type="button"
              onClick={() => setMethod("bill_later")}
              className={`mt-2 w-full border rounded-lg py-2.5 text-sm font-semibold ${
                method === "bill_later"
                  ? "border-[#D4A24C] bg-[#D4A24C] text-[#0F2A4A]"
                  : "border-[#D4A24C] text-[#0F2A4A] hover:bg-[#FFFBF2]"
              }`}
            >
              Pay Later (Bill Me)
            </button>
            {method === "bill_later" && (
              <p className="text-[11px] text-gray-600 mt-2">
                We'll publish your ad now and email you an invoice — pay by card, Zelle or Venmo at your convenience.
              </p>
            )}
          </div>

          <button
            onClick={submit}
            disabled={submitting || !agreed}
            className="w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-lg hover:bg-[#e0b266] disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="animate-spin" size={16} /> Working…</>
            ) : method === "bill_later" ? (
              `Activate & bill me — $${(proof.priceCents / 100).toFixed(2)}`
            ) : (
              `Continue — $${(proof.priceCents / 100).toFixed(2)}`
            )}
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
  const { city } = Route.useParams();
  const category = city as DirectoryCategory;
  const config = DIRECTORY_CATEGORIES[category];
  return (
    <div className="min-h-screen bg-[#0F2A4A] text-white">
      <PaymentTestModeBanner />
      <header className="bg-[#0F2A4A] text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/$city" params={{ city: category }} className="font-serif text-lg">Get Biz Music</Link>
          <span className="text-xs text-white/70">{config.title} Ad Activation</span>
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
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#0F2A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
      />
    </label>
  );
}
