import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createQuickPayCheckout } from "@/lib/quickpay.functions";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { BizFooter } from "@/components/biz/BizFooter";
import homeHero from "@/assets/SD-Business-3.png.asset.json";
import zelleQr from "@/assets/zelle-qr.jpeg.asset.json";

const searchSchema = z.object({
  session_id: z.string().trim().max(200).optional(),
});

export const Route = createFileRoute("/quick-pay")({
  head: () => ({
    meta: [
      { title: "Quick Pay — AI Business Alliance Membership | Get Biz Music" },
      {
        name: "description",
        content:
          "Pay $49.95 for your GetBizMusic.com AI Business Alliance one-year membership. One-time payment, no subscriptions, no recurring charges. Card, Zelle or Venmo.",
      },
      { property: "og:title", content: "Quick Pay — AI Business Alliance Membership" },
      {
        property: "og:description",
        content: "One-time $49.95 membership payment. Card, Zelle or Venmo accepted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: QuickPayPage,
});

const AMOUNT_LABEL = "$49.95";

function QuickPayPage() {
  const { session_id: sessionId } = Route.useSearch();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const canPay =
    businessName.trim().length > 0 &&
    ownerName.trim().length > 0 &&
    emailValid &&
    phone.trim().length >= 7 &&
    !loading;

  const payNow = async () => {
    if (!canPay) {
      toast.error("Please complete all fields with a valid email and phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await createQuickPayCheckout({
        data: {
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          returnUrl: `${window.location.origin}/quick-pay?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in res) throw new Error(res.error);
      if (!res.clientSecret) throw new Error("No client secret returned");
      setClientSecret(res.clientSecret);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-clip bg-[#0F2A4A] text-white">
      <PaymentTestModeBanner />

      {/* Hero header image (same as home) */}
      <header className="relative w-full max-w-full min-w-0 overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-2 sm:px-4">
          <img
            src={homeHero.url}
            alt="GetBizMusic.com AI Business Alliance — San Diego County businesses"
            className="block w-full h-auto rounded-xl"
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-10">
        {sessionId ? (
          <div className="rounded-2xl border border-[#D4A24C]/50 bg-white/5 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 text-[#D4A24C]" size={40} />
            <h1 className="font-[Sora] text-2xl font-bold">Payment received — thank you!</h1>
            <p className="mt-2 text-white/75">
              Your GetBizMusic.com AI Business Alliance one-year membership is confirmed. A receipt was
              emailed to you.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#D4A24C] px-6 py-3 font-semibold text-[#0F2A4A]"
            >
              Back to Home
            </Link>
          </div>
        ) : clientSecret ? (
          <>
            <button
              onClick={() => setClientSecret(null)}
              className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
            >
              <ArrowLeft size={14} /> Back to form
            </button>
            <div id="checkout" className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <EmbeddedCheckoutProvider
                stripe={getStripe()}
                options={{ fetchClientSecret: async () => clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="font-[Sora] text-3xl font-extrabold leading-tight sm:text-4xl">
                AI Business Alliance <span className="text-[#D4A24C]">One Year Membership</span>
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-white/75">
                GetBizMusic.com AI Business Alliance One Year Membership — No Recurring Charges, No
                Subscriptions, One Time Payment.
              </p>
              <div className="mt-5 inline-flex items-baseline gap-2 rounded-2xl border border-[#D4A24C]/50 bg-white/5 px-6 py-3">
                <span className="font-[Sora] text-4xl font-extrabold text-[#D4A24C]">{AMOUNT_LABEL}</span>
                <span className="text-sm uppercase tracking-[0.18em] text-white/60">no taxes</span>
              </div>
            </div>

            {/* Form */}
            <div className="mt-8 rounded-3xl border border-[#D4A24C]/30 bg-white p-6 text-[#0F2A4A] shadow-xl sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business Name" value={businessName} onChange={setBusinessName} placeholder="Acme Coffee Co." />
                <Field label="Business Owner Name" value={ownerName} onChange={setOwnerName} placeholder="Jane Smith" />
                <Field label="Business Email" value={email} onChange={setEmail} placeholder="you@business.com" type="email" />
                <Field label="Business Cell Phone Number" value={phone} onChange={setPhone} placeholder="(619) 555-0123" type="tel" />
              </div>

              <button
                onClick={payNow}
                disabled={!canPay}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F2A4A] px-8 py-4 font-[Sora] text-base font-bold uppercase tracking-[0.12em] text-[#D4A24C] shadow-lg transition hover:bg-[#16213e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                Pay Now {AMOUNT_LABEL}
              </button>
              <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-[#0F2A4A]/60">
                <ShieldCheck size={14} /> Secure card payment. One-time charge — no subscription.
              </p>
            </div>

            {/* QR payment options */}
            <div className="mt-8">
              <p className="text-center text-sm uppercase tracking-[0.2em] text-white/60">
                Or pay {AMOUNT_LABEL} with Zelle or Venmo
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#D4A24C]/30 bg-white p-5 text-center text-[#0F2A4A]">
                  <h2 className="font-[Sora] text-lg font-bold">Zelle</h2>
                  <p className="mt-1 text-sm font-semibold">Rafael Alfonso Posadas</p>
                  <img
                    src={zelleQr.url}
                    alt="Zelle QR code for WINALL MEDIA, LLC — 619-707-0467"
                    className="mx-auto mt-3 w-48 rounded-lg"
                  />
                  <p className="mt-2 text-sm font-semibold">@RTPosadas</p>
                  <p className="text-xs text-[#0F2A4A]/60">WINALL MEDIA, LLC · 619-707-0467</p>
                </div>
                <div className="rounded-2xl border border-[#D4A24C]/30 bg-white p-5 text-center text-[#0F2A4A]">
                  <h2 className="font-[Sora] text-lg font-bold">Venmo</h2>
                  <p className="mt-1 text-sm font-semibold">Rafael Alfonso Posadas</p>
                  <div className="mx-auto mt-3 w-48 rounded-lg bg-white p-2">
                    <QRCodeSVG value="https://venmo.com/u/RTPosadas" size={176} level="M" />
                  </div>
                  <p className="mt-2 text-sm font-semibold">@RTPosadas</p>
                  <p className="text-xs text-[#0F2A4A]/60">Scan or search @RTPosadas in Venmo</p>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-white/60">
                Zelle/Venmo memo: your business name. Email your payment confirmation to
                processing@getbizmusic.com so we can activate your membership.
              </p>
            </div>
          </>
        )}
      </main>

      <BizFooter />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#0F2A4A]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#0F2A4A]/25 bg-[#F4F7FB] px-4 py-3 text-[#0F2A4A] outline-none placeholder:text-[#0F2A4A]/35 focus:border-[#D4A24C] focus:ring-2 focus:ring-[#D4A24C]/40"
      />
    </label>
  );
}
