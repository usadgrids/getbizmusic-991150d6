import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, Check, Shield } from "lucide-react";
import { toast } from "sonner";
import { BizNavbar } from "@/components/biz/BizNavbar";
import { BizFooter } from "@/components/biz/BizFooter";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createAdCheckout } from "@/lib/payments.functions";
import { AD_PLANS, type AdPlan } from "@/lib/biz-utils";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — BizSpot Directory - National City" },
      { name: "description", content: "Choose your annual ad plan: $12/year for 7-second rotation or $24/year for 10-second feature." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [plan, setPlan] = useState<AdPlan>("image_5");
  const [email, setEmail] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const result = await createAdCheckout({
        data: {
          plan,
          customerEmail: email,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
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
        <BizNavbar />
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

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <PaymentTestModeBanner />
      <BizNavbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <Link to="/" className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0F2A4A] text-center">
          Pick Your Annual Ad Plan
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
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> Nationwide visibility, all year</li>
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
          <button
            onClick={startCheckout}
            disabled={loading}
            className="mt-4 w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-60"
          >
            {loading ? "Starting…" : `Pay $${AD_PLANS[plan].price} & Continue`}
          </button>
          <p className="mt-3 text-xs text-gray-500 flex items-center justify-center gap-1.5">
            <Shield size={12} /> Secure checkout. You'll get a receipt and unique submission link by email.
          </p>
        </div>
      </main>
      <BizFooter />
    </div>
  );
}
