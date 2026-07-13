import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, Check, Shield, Info, Tag, Loader2, Sparkles, Music, BadgeCheck, Ban, FileText, Heart } from "lucide-react";
import { toast } from "sonner";
import { BizFooter } from "@/components/biz/BizFooter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createAdCheckout, createFreeReligiousSubmission } from "@/lib/payments.functions";
import { validateRepCode } from "@/lib/reps.functions";
import { AD_PLANS, INDUSTRIES, isReligiousIndustry, type AdPlan } from "@/lib/biz-utils";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Get Biz Music" },
      { name: "description", content: "Choose your annual ad plan: $24/year for 7-second rotation or $48/year for 10-second feature. Rep codes give 50% off." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const navigate = useNavigate();
  const [industry, setIndustry] = useState<string>("");
  const [plan, setPlan] = useState<AdPlan>("image_5");
  const [email, setEmail] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedNoRefund, setAgreedNoRefund] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [repInput, setRepInput] = useState("");
  const [repState, setRepState] = useState<
    | { status: "idle" }
    | { status: "checking" }
    | { status: "valid"; code: string; discountPercent: number }
    | { status: "invalid" }
  >({ status: "idle" });
  const repDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRepStatus = useRef<typeof repState.status>("idle");
  const isReligious = isReligiousIndustry(industry);

  useEffect(() => {
    if (prevRepStatus.current !== "valid" && repState.status === "valid") {
      toast.success("Code applied 50% off");
      const pricingSection = document.getElementById("pricing");
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    prevRepStatus.current = repState.status;
  }, [repState]);

  useEffect(() => {
    if (repDebounce.current) clearTimeout(repDebounce.current);
    const raw = repInput.trim();
    if (!raw) { setRepState({ status: "idle" }); return; }
    setRepState({ status: "checking" });
    repDebounce.current = setTimeout(async () => {
      try {
        const res = await validateRepCode({ data: { code: raw } });
        if (res.valid) setRepState({ status: "valid", code: res.code!, discountPercent: res.discountPercent! });
        else setRepState({ status: "invalid" });
      } catch {
        setRepState({ status: "invalid" });
      }
    }, 350);
    return () => { if (repDebounce.current) clearTimeout(repDebounce.current); };
  }, [repInput]);

  const basePrice = AD_PLANS[plan].price;
  const discounted = repState.status === "valid" ? basePrice * (1 - repState.discountPercent / 100) : basePrice;

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const canPay = !!industry && emailValid && agreedTerms && agreedNoRefund && !loading;

  const startCheckout = async () => {
    if (!emailValid) { toast.error("Please enter a valid email"); return; }
    if (!agreedTerms || !agreedNoRefund) { toast.error("Please confirm both boxes to continue"); return; }
    setLoading(true);
    try {
      const result = await createAdCheckout({
        data: {
          plan,
          customerEmail: email,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&industry=${encodeURIComponent(industry)}`,
          environment: getStripeEnvironment(),
          agreedTerms,
          agreedNoRefund,
          disclosureVersion: "v1",
          ...(repState.status === "valid" ? { repCode: repState.code } : {}),
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

  const startFreeReligious = async () => {
    if (!isReligious) return;
    if (!emailValid) { toast.error("Please enter a valid email"); return; }
    if (!agreedTerms || !agreedNoRefund) { toast.error("Please confirm both boxes to continue"); return; }
    setFreeLoading(true);
    try {
      const res = await createFreeReligiousSubmission({
        data: {
          industry,
          customerEmail: email,
          agreedTerms: true,
          agreedNovelty: true,
        },
      });
      if ("error" in res) throw new Error(res.error);
      if (!res.token) throw new Error("No token returned");
      navigate({ to: "/submit", search: { token: res.token } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reserve your free ministry spot");
    } finally {
      setFreeLoading(false);
    }
  };


  if (clientSecret) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <PaymentTestModeBanner />
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

        {/* Industry gate — required before pricing / free-religious branch */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-[#0F2A4A] mb-2">
            What best describes your business? <span className="text-red-500">*</span>{" "}
            <span className="text-emerald-700 font-bold">
              (Choose Churches, Religious Services, and Ministries to get a FREE Annual Ad.)
            </span>
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C] bg-white"
          >
            <option value="" disabled>Pick Your Business Category</option>
            {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            Churches, Religious Services, and Ministries qualify for a <strong>free 12-second ad spot</strong>.
          </p>
        </div>

        {isReligious ? (
          <div className="mt-6 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={20} className="text-emerald-600" />
              <div className="text-xs uppercase tracking-wide text-emerald-700 font-bold">Church & Ministry Free Spot</div>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#0F2A4A]">A free 12-second ad — a $48/year value</h2>
            <div className="mt-2 inline-flex items-baseline gap-2">
              <span className="text-gray-400 line-through text-xl">$48/year value</span>
              <span className="text-3xl font-extrabold text-emerald-700">FREE</span>
            </div>
            <p className="text-sm text-[#0F2A4A]/90 mt-3 leading-relaxed">
              As a novelty gesture to the faith community, Get Biz Music offers churches, religious
              services, and ministries a <strong>free 12-second ad rotation for one year</strong> —
              the same premium duration as our Featured Slider Ad. Subject to the same content
              review as paid ads.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-gray-700">
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> 12-second rotation ($48/yr value)</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> Nationwide visibility, all year</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> Admin reviewed within 24 hours</li>
            </ul>
          </div>
        ) : (
          <div id="pricing" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
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
                    {sel && repState.status === "valid" ? (
                      <>
                        <span className="text-gray-400 line-through text-2xl mr-2">${p.price}</span>
                        ${Math.round(p.price * 0.5)}
                      </>
                    ) : (
                      <>${p.price}</>
                    )}
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
        )}

        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {!isReligious && (
            <div className="mb-5 rounded-lg border border-[#D4A24C]/80 bg-[#FFF8EC] px-4 py-3 text-center">
              <p className="text-sm sm:text-base font-bold tracking-wide text-[#0F2A4A] uppercase">
                Use Rep Code in Flyer to Get 50% Off
              </p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-[#0F2A4A]">
                DON'T HAVE A REPCODE? TEXT 619-707-0467 to get one.
              </p>
            </div>
          )}

          <label className="block text-sm font-semibold text-[#0F2A4A] mb-2">
            Email for {isReligious ? "confirmation" : "receipt"} &amp; submission link{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />

          {!isReligious && (
            <>
              <label className="block text-sm font-semibold text-[#0F2A4A] mt-4 mb-2 flex items-center gap-1.5">
                <Tag size={14} className="text-[#D4A24C]" /> Have a rep code? <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={repInput}
                  onChange={(e) => setRepInput(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {repState.status === "checking" && <Loader2 size={14} className="animate-spin text-gray-400" />}
                  {repState.status === "valid" && <Check size={16} className="text-emerald-600" />}
                </div>
              </div>
              {repState.status === "valid" && (
                <p className="mt-1.5 text-xs text-emerald-700 font-semibold">
                  ✓ Code {repState.code} applied — {repState.discountPercent}% off
                </p>
              )}
              {repState.status === "invalid" && repInput.trim().length > 0 && (
                <p className="mt-1.5 text-xs text-red-600">Code not recognized</p>
              )}
            </>
          )}




          {/* Disclosure block */}
          <div className="mt-6 rounded-xl border-2 border-[#D4A24C]/60 bg-[#FFF8EC] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info size={18} className="text-[#D4A24C]" />
              <h3 className="font-serif font-bold text-[#0F2A4A] text-base">
                A FEW THINGS TO KNOW BEFORE YOU GRAB YOUR SPOT! 🎶
              </h3>
            </div>
          <div className="space-y-4 text-sm text-[#3a2f1c] leading-relaxed">
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="text-[#D4A24C] mt-0.5 shrink-0" />
              <p>
                <span className="font-semibold text-[#0F2A4A]">What you're getting:</span>{" "}
                A fun, one-year spot on our National City business ad display! Your ad streams alongside
                other awesome local businesses, for the number of seconds you chose, all year long.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Music size={16} className="text-[#D4A24C] mt-0.5 shrink-0" />
              <p>
                <span className="font-semibold text-[#0F2A4A]">Community love:</span>{" "}
                I love supporting the local business community—powered by a fantastic online music streaming playlist.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <BadgeCheck size={16} className="text-[#D4A24C] mt-0.5 shrink-0" />
              <p>
                <span className="font-semibold text-[#0F2A4A]">What this is (and isn't):</span>{" "}
                Think of this as a fun way to get your business seen and heard alongside great local
                music — not a guaranteed marketing campaign. We can't promise a specific number of
                views, plays, or impressions, and we can't promise it'll bring in more sales, leads, or
                foot traffic. It's all about community spirit and good vibes!
              </p>
            </div>
            {!isReligious && (
              <>
                <div className="flex items-start gap-2">
                  <Ban size={16} className="text-[#D4A24C] mt-0.5 shrink-0" />
                  <p>
                    <span className="font-semibold text-[#0F2A4A]">Our refund policy:</span>{" "}
                    Once you complete your purchase, it's final — we're not able to offer refunds. This is
                    because your spot is reserved just for you for the full year, right when you buy it.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-[#D4A24C] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#5a4a2c]">
                    Heads up, as California law requires (Civil Code § 1723), we're letting you know about
                    this no-refund policy before you purchase, not after. By completing your purchase,
                    you're confirming you saw this note ahead of time and you're all set with these terms.
                    Thanks so much for supporting local business! 🎉
                  </p>
                </div>
              </>
            )}
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
                  {isReligious
                    ? "I acknowledge this free ministry ad is a novelty community gesture — no guaranteed results, subject to the same content-review policy as paid ads."
                    : "I understand and I'm good with the no-refund policy — once I purchase, it's final."}
                </Label>
              </div>
            </div>
          </div>

          {isReligious ? (
            <button
              onClick={startFreeReligious}
              disabled={!canPay || freeLoading}
              className="mt-6 w-full bg-emerald-600 text-white font-bold py-3 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {freeLoading ? "Reserving your free spot…" : "Continue to Free Ministry Ad Submission"}
            </button>
          ) : (
            <button
              onClick={startCheckout}
              disabled={!canPay}
              className="mt-6 w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D4A24C]"
            >
              {loading ? "Starting…" : `Complete Purchase — $${discounted}`}
            </button>
          )}
          {!industry ? (
            <p className="mt-2 text-xs text-center text-amber-700">
              Please pick your business category above to continue.
            </p>
          ) : !agreedTerms || !agreedNoRefund ? (
            <p className="mt-2 text-xs text-center text-gray-500">
              Please confirm both boxes above to continue.
            </p>
          ) : null}
          <p className="mt-3 text-xs text-gray-500 flex items-center justify-center gap-1.5">
            <Shield size={12} /> {isReligious
              ? "You'll get a confirmation and your submission link by email."
              : "Secure checkout. You'll get a receipt and unique submission link by email."}
          </p>
        </div>

      </main>
      <BizFooter />
    </div>
  );
}
