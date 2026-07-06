import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, Check, Shield, Info } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { BizNavbar } from "@/components/biz/BizNavbar";
import { BizFooter } from "@/components/biz/BizFooter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createAdCheckout } from "@/lib/payments.functions";
import { getCityBySlug } from "@/lib/cities.functions";
import { AD_PLANS, type AdPlan } from "@/lib/biz-utils";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const searchSchema = z.object({ city: z.string().min(1).max(120).optional() });

export const Route = createFileRoute("/pricing")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Pricing — Get Biz Music" },
      { name: "description", content: "Choose your annual ad plan: $12/year for 7-second rotation or $24/year for 10-second feature." },
    ],
  }),
  component: PricingPage,
});

type CityInfo = { slug: string; name: string; state: string } | null;

function PricingPage() {
  const { city: citySlug } = Route.useSearch();
  const cityFn = useServerFn(getCityBySlug);
  const [city, setCity] = useState<CityInfo>(null);
  const [plan, setPlan] = useState<AdPlan>("image_5");
  const [email, setEmail] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedNoRefund, setAgreedNoRefund] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!citySlug) { setCity(null); return; }
    let cancelled = false;
    cityFn({ data: { slug: citySlug } }).then((c) => {
      if (cancelled || !c) return;
      setCity({ slug: c.slug, name: c.name, state: c.state });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [citySlug, cityFn]);

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const canPay = emailValid && agreedTerms && agreedNoRefund && !loading;

  const startCheckout = async () => {
    if (!emailValid) return toast.error("Please enter a valid email");
    if (!agreedTerms || !agreedNoRefund) return toast.error("Please confirm both boxes to continue");
    setLoading(true);
    try {
      const result = await createAdCheckout({
        data: {
          plan,
          customerEmail: email,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
          agreedTerms,
          agreedNoRefund,
          disclosureVersion: "v1",
          citySlug: city?.slug,
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("No client secret returned");
      setClientSecret(result.clientSecret);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setLoading(false);
    }
  };

  if (clientSecret) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <PaymentTestModeBanner />
        <BizNavbar citySlug={city?.slug} cityName={city?.name} state={city?.state} />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <button
            onClick={() => setClientSecret(null)}
            className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft size={14} /> Back to plans
          </button>
          <div id="checkout" className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </main>
        <BizFooter />
      </div>
    );
  }

  const cityLabel = city ? `${city.name}, ${city.state}` : null;

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <PaymentTestModeBanner />
      <BizNavbar citySlug={city?.slug} cityName={city?.name} state={city?.state} />
      <main className="max-w-4xl mx-auto px-4 py-10">
        {city ? (
          <Link to="/$city" params={{ city: city.slug }} className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4">
            <ArrowLeft size={14} /> Back to {city.name}
          </Link>
        ) : (
          <Link to="/" className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4">
            <ArrowLeft size={14} /> Back to cities
          </Link>
        )}
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0F2A4A] text-center">
          {cityLabel ? `Advertise in ${cityLabel}` : "Pick Your Annual Ad Plan"}
        </h1>
        <p className="text-center text-gray-600 mt-2 max-w-xl mx-auto">
          Pay first, then submit your ad. We email you a one-time submission link the moment your payment clears.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {(Object.keys(AD_PLANS) as AdPlan[]).map((key) => {
            const p = AD_PLANS[key];
            const sel = plan === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPlan(key)}
                className={`text-left p-6 rounded-2xl border-2 transition-all bg-white ${
                  sel ? "border-[#D4A24C] ring-2 ring-[#D4A24C]/30 shadow-lg" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-xs uppercase tracking-wide text-[#D4A24C] font-bold">
                  {key === "image_5" ? "Intro Offer" : "Featured"}
                </div>
                <div className="font-semibold text-[#0F2A4A] text-lg mt-1">{p.label}</div>
                <div className="text-4xl font-bold text-[#0F2A4A] mt-2">
                  ${p.price}
                  <span className="text-sm font-normal text-gray-500"> / year</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-gray-700">
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> {p.seconds}-second rotation</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> {cityLabel ? `${cityLabel} audience` : "Nationwide visibility"}, all year</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> Admin reviewed within 24 hours</li>
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-[#0F2A4A] mb-2">
            Email for receipt &amp; submission link
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />

          <div className="mt-6 rounded-xl border-2 border-[#D4A24C]/60 bg-[#FFF8EC] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info size={18} className="text-[#D4A24C]" />
              <h3 className="font-serif font-bold text-[#0F2A4A] text-base">
                A FEW THINGS TO KNOW BEFORE YOU GRAB YOUR SPOT! 🎶
              </h3>
            </div>
            <div className="space-y-3 text-sm text-[#3a2f1c] leading-relaxed">
              <p>
                <span className="font-semibold text-[#0F2A4A]">What you're getting:</span>{" "}
                A fun, one-year spot on {cityLabel ? `our ${cityLabel} business ad display` : "our business ad display"}! Your ad streams alongside
                other awesome local businesses, for the number of seconds you chose, all year long.
              </p>
              <p>
                <span className="font-semibold text-[#0F2A4A]">What this is (and isn't):</span>{" "}
                Think of this as a fun way to get your business seen and heard alongside great local
                music — not a guaranteed marketing campaign. We can't promise a specific number of
                views, plays, or impressions, and we can't promise it'll bring in more sales, leads, or
                foot traffic. It's all about community spirit and good vibes!
              </p>
              <p>
                <span className="font-semibold text-[#0F2A4A]">Our refund policy:</span>{" "}
                Once you complete your purchase, it's final — we're not able to offer refunds. This is
                because your spot is reserved just for you for the full year, right when you buy it.
              </p>
              <p className="text-xs text-[#5a4a2c]">
                Heads up, as California law requires (Civil Code § 1723), we're letting you know about
                this no-refund policy before you purchase, not after. By completing your purchase,
                you're confirming you saw this note ahead of time and you're all set with these terms.
                Thanks so much for supporting local business! 🎉
              </p>
            </div>

            <div className="mt-5 space-y-3 border-t border-[#D4A24C]/40 pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree-terms"
                  checked={agreedTerms}
                  onCheckedChange={(v) => setAgreedTerms(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="agree-terms" className="text-sm text-[#0F2A4A] cursor-pointer leading-snug">
                  Got it — I understand this is a fun novelty ad spot with no guaranteed views,
                  plays, or business results.
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree-refund"
                  checked={agreedNoRefund}
                  onCheckedChange={(v) => setAgreedNoRefund(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="agree-refund" className="text-sm text-[#0F2A4A] cursor-pointer leading-snug">
                  I understand and I'm good with the no-refund policy — once I purchase, it's final.
                </Label>
              </div>
            </div>
          </div>

          <button
            onClick={startCheckout}
            disabled={!canPay}
            className="mt-6 w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D4A24C]"
          >
            {loading ? "Starting…" : `Complete Purchase — $${AD_PLANS[plan].price}`}
          </button>
          {!agreedTerms || !agreedNoRefund ? (
            <p className="mt-2 text-xs text-center text-gray-500">
              Please confirm both boxes above to continue.
            </p>
          ) : null}
          <p className="mt-3 text-xs text-gray-500 flex items-center justify-center gap-1.5">
            <Shield size={12} /> Secure checkout. You'll get a receipt and unique submission link by email.
          </p>
        </div>
      </main>
      <BizFooter />
    </div>
  );
}
