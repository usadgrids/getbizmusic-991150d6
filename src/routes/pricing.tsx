import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { saveCityTarget } from "@/lib/city-target";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, Check, Shield, Info, Tag, Loader2, Sparkles, Music, BadgeCheck, Ban, FileText, Heart, CreditCard, Send, Copy } from "lucide-react";
import { toast } from "sonner";
import { BizFooter } from "@/components/biz/BizFooter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createAdCheckout, createFreeReligiousSubmission, createZelleAdOrder, createPayLaterOrder } from "@/lib/payments.functions";
import { validateRepCode } from "@/lib/reps.functions";
import { AD_PLANS, INDUSTRIES, isReligiousIndustry, type AdPlan } from "@/lib/biz-utils";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import zelleQr from "@/assets/zelle-qr.jpeg.asset.json";
import { DESIGN_PRICE_CENTS } from "@/lib/design.functions";

const pricingSearchSchema = z.object({
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(10).optional(),
  zip: z.string().trim().max(10).optional(),
  rep: z.string().trim().max(24).optional(),
  plan: z.enum(["image_5", "slider_10"]).optional(),
  design: z.string().trim().max(4).optional(),
});

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Get Biz Music" },
      { name: "description", content: "$49.95/year membership (founding-member pricing with Priority Access Code). Annual ad plans and rep-code discounts available." },
      { name: "twitter:title", content: "Pricing — Get Biz Music" },
      { name: "twitter:description", content: "$49.95/year membership (founding-member pricing with Priority Access Code)." },
    ],
  }),
  validateSearch: (search) => pricingSearchSchema.parse(search),
  component: PricingPage,
});


function PricingPage() {
  const navigate = useNavigate();
  const { city: targetCity, state: targetState, zip: targetZip, rep: repParam, plan: planParam, design: designParam } = Route.useSearch();

  // Carry the city chosen in the city picker through checkout to /submit.
  useEffect(() => {
    if (targetCity && targetState) {
      saveCityTarget({ city: targetCity, state: targetState, zip: targetZip });
    }
  }, [targetCity, targetState, targetZip]);

  const [industry, setIndustry] = useState<string>("");
  const [plan, setPlan] = useState<AdPlan>(planParam ?? "slider_10");
  const [email, setEmail] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedNoRefund, setAgreedNoRefund] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [repInput, setRepInput] = useState(repParam ?? "");
  const [designAddon, setDesignAddon] = useState(() => {
    if (designParam === "1" || designParam === "true") return true;
    if (designParam === "0" || designParam === "false") return false;
    return true; // default to professionally designed ad
  });
  const [payMethod, setPayMethod] = useState<"card" | "zelle" | "pay_later">("card");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [zelleLoading, setZelleLoading] = useState(false);
  const [payLaterLoading, setPayLaterLoading] = useState(false);
  const [payLaterResult, setPayLaterResult] = useState<{
    invoiceNumber: string; amountFormatted: string; dueDateFormatted: string; submitUrl: string;
  } | null>(null);
  const [zelleResult, setZelleResult] = useState<{
    token: string; memoCode: string; amountFormatted: string; zellePhone: string; submitUrl: string;
  } | null>(null);
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
  const adSpotPrice = repState.status === "valid" ? basePrice * (1 - repState.discountPercent / 100) : basePrice;
  // Flat-rate pro design add-on — never discounted by rep codes.
  const designPrice = designAddon ? DESIGN_PRICE_CENTS / 100 : 0;
  const discounted = adSpotPrice + designPrice;
  const totalFormatted = discounted.toFixed(2).replace(/\.00$/, "");

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const needsContactFields = payMethod === "zelle" || payMethod === "pay_later";
  const contactFieldsOk = needsContactFields
    ? (ownerName.trim().length > 0 && businessName.trim().length > 0 && phone.trim().length >= 7)
    : true;
  const canPay = !!industry && emailValid && agreedTerms && agreedNoRefund && !loading && contactFieldsOk;

  const startCheckout = async () => {
    if (loading) return;
    if (!emailValid) { toast.error("Please enter a valid email"); return; }
    if (!agreedTerms || !agreedNoRefund) { toast.error("Please check the agreement box to continue"); return; }
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
          designAddon,
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
    if (freeLoading) return;
    if (!emailValid) { toast.error("Please enter a valid email"); return; }
    if (!agreedTerms || !agreedNoRefund) { toast.error("Please check the agreement box to continue"); return; }
    setFreeLoading(true);
    try {
      const res = await createFreeReligiousSubmission({
        data: {
          industry,
          customerEmail: email,
          agreedTerms: true,
          agreedNovelty: true,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in res) throw new Error(res.error);
      if (!res.token) throw new Error("No token returned");
      navigate({ to: "/submit", search: { token: res.token, industry } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reserve your free ministry spot");
    } finally {
      setFreeLoading(false);
    }
  };


  const startZelleOrder = async () => {
    if (zelleLoading) return;
    if (!ownerName.trim()) { toast.error("Please enter the business owner name"); return; }
    if (!businessName.trim()) { toast.error("Please enter the business name"); return; }
    if (!emailValid) { toast.error("Please enter a valid email"); return; }
    if (!phone.trim() || phone.trim().length < 7) { toast.error("Please enter a valid phone number"); return; }
    if (!agreedTerms || !agreedNoRefund) { toast.error("Please check the agreement box to continue"); return; }
    setZelleLoading(true);
    try {
      const res = await createZelleAdOrder({
        data: {
          plan,
          ownerName: ownerName.trim(),
          businessName: businessName.trim(),
          customerEmail: email.trim(),
          phone: phone.trim(),
          agreedTerms: true,
          agreedNoRefund: true,
          environment: getStripeEnvironment(),
          designAddon,
          ...(repState.status === "valid" ? { repCode: repState.code } : {}),
        },
      });
      if (!res.ok) throw new Error(res.error);
      setZelleResult({
        token: res.token,
        memoCode: res.memoCode,
        amountFormatted: res.amountFormatted,
        zellePhone: res.zellePhone,
        submitUrl: res.submitUrl,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create Zelle order");
    } finally {
      setZelleLoading(false);
    }
  };

  const startPayLaterOrder = async () => {
    if (payLaterLoading) return;
    if (!ownerName.trim()) { toast.error("Please enter the business owner name"); return; }
    if (!businessName.trim()) { toast.error("Please enter the business name"); return; }
    if (!emailValid) { toast.error("Please enter a valid email"); return; }
    if (!phone.trim() || phone.trim().length < 7) { toast.error("Please enter a valid phone number"); return; }
    if (!agreedTerms || !agreedNoRefund) { toast.error("Please check the agreement box to continue"); return; }
    setPayLaterLoading(true);
    try {
      const res = await createPayLaterOrder({
        data: {
          plan,
          ownerName: ownerName.trim(),
          businessName: businessName.trim(),
          customerEmail: email.trim(),
          phone: phone.trim(),
          industry,
          agreedTerms: true,
          agreedNoRefund: true,
          environment: getStripeEnvironment(),
          designAddon,
          ...(repState.status === "valid" ? { repCode: repState.code } : {}),
        },
      });
      if (!res.ok) throw new Error(res.error);
      setPayLaterResult({
        invoiceNumber: res.invoiceNumber,
        amountFormatted: res.amountFormatted,
        dueDateFormatted: res.dueDateFormatted,
        submitUrl: res.submitUrl,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create Pay Later order");
    } finally {
      setPayLaterLoading(false);
    }
  };

  if (clientSecret) {
    return (
      <div className="min-h-screen bg-[#0F2A4A] text-white">
        <PaymentTestModeBanner />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <button
            onClick={() => setClientSecret(null)}
            className="text-sm text-white/60 hover:text-white inline-flex items-center gap-1 mb-4"
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

  if (zelleResult) {
    const copyPhone = () => {
      navigator.clipboard?.writeText(zelleResult.zellePhone).then(
        () => toast.success("Zelle number copied"),
        () => toast.error("Could not copy"),
      );
    };
    const copyMemo = () => {
      navigator.clipboard?.writeText(`Order ${zelleResult.memoCode}`).then(
        () => toast.success("Memo copied"),
        () => toast.error("Could not copy"),
      );
    };
    return (
      <div className="min-h-screen bg-[#0F2A4A] text-white">
        <PaymentTestModeBanner />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => { setZelleResult(null); }}
            className="text-sm text-white/60 hover:text-white inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft size={14} /> Back to plans
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                <Send size={12} /> Zelle payment reserved
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#0F2A4A] mt-3">
                Your spot is reserved — send your Zelle payment
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                We emailed instructions to <strong>{email}</strong>. Your ad goes live once we confirm your Zelle payment (usually within 24 hours).
              </p>
            </div>

            <div className="mt-6 rounded-xl border-2 border-purple-500 bg-purple-50/60 p-5 text-center">
              <div className="text-[11px] uppercase tracking-wider text-purple-700 font-bold">Send Zelle to</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#0F2A4A] mt-1 tracking-wide">
                {zelleResult.zellePhone}
              </div>
              <div className="text-xs text-gray-600 mt-1">WINALL MEDIA LLC (Get Biz Music)</div>
              <button
                onClick={copyPhone}
                className="mt-3 inline-flex items-center gap-1.5 text-xs bg-white border border-purple-300 text-purple-700 font-semibold px-3 py-1.5 rounded-md hover:bg-purple-100"
              >
                <Copy size={12} /> Copy number
              </button>

              <div className="mt-5 flex flex-col items-center bg-white rounded-xl border-2 border-purple-300 p-4">
                <div className="text-[11px] uppercase tracking-wider text-purple-700 font-bold mb-2">
                  Or scan to pay instantly
                </div>
                <img
                  src={zelleQr.url}
                  alt="Zelle QR code for WINALL MEDIA LLC — 619-707-0467"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
                <div className="text-xs text-gray-600 mt-2 text-center">
                  Open your bank's Zelle scanner and point at this code
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Amount</div>
                  <div className="text-2xl font-bold text-[#0F2A4A] mt-0.5">{zelleResult.amountFormatted}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold flex items-center justify-between">
                    Memo
                    <button onClick={copyMemo} className="text-purple-700 hover:text-purple-900" title="Copy memo">
                      <Copy size={11} />
                    </button>
                  </div>
                  <div className="text-lg font-mono font-bold text-[#0F2A4A] mt-0.5">Order {zelleResult.memoCode}</div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3 italic">
                Please include the memo so we can match your payment to your order.
              </p>
            </div>

            <div className="mt-6 bg-[#FFF8EC] border-2 border-[#D4A24C] rounded-xl p-5 text-center">
              <div className="text-xs uppercase tracking-wide text-[#D4A24C] font-bold">Ready to upload your ad?</div>
              <p className="text-sm text-[#0F2A4A] mt-1">
                You can submit your ad artwork now. It goes live once we confirm your Zelle payment.
              </p>
              <Link
                to="/submit"
                search={{ token: zelleResult.token }}
                className="mt-3 inline-block bg-[#D4A24C] text-[#0F2A4A] font-bold px-6 py-2.5 rounded-md hover:bg-[#e0b266]"
              >
                Submit Your Ad
              </Link>
            </div>



            <p className="text-xs text-center text-gray-500 mt-6 flex items-center justify-center gap-1.5">
              <Shield size={12} /> A copy of these instructions was emailed to you.
            </p>
          </div>
        </main>
        <BizFooter />
      </div>
    );
  }

  if (payLaterResult) {
    return (
      <div className="min-h-screen bg-[#0F2A4A] text-white">
        <PaymentTestModeBanner />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => { setPayLaterResult(null); }}
            className="text-sm text-white/60 hover:text-white inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft size={14} /> Back to plans
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-[#FFF8EC] border border-[#D4A24C]/60 text-[#0F2A4A] text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                <FileText size={12} /> Pay Later reserved
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#0F2A4A] mt-3">
                Your spot is reserved — pay within 7 days
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                We emailed an invoice to <strong>{email}</strong>. Send payment by{" "}
                <strong>{payLaterResult.dueDateFormatted}</strong> to keep your reservation.
              </p>
            </div>

            <div className="mt-6 rounded-xl border-2 border-[#D4A24C] bg-[#FFF8EC]/60 p-5 text-center">
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Amount due</div>
                  <div className="text-2xl font-bold text-[#0F2A4A] mt-0.5">{payLaterResult.amountFormatted}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Invoice #</div>
                  <div className="text-lg font-mono font-bold text-[#0F2A4A] mt-0.5">{payLaterResult.invoiceNumber}</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-[#0F2A4A]">
                <p><strong>Zelle:</strong> 619-707-0467 (WINALL MEDIA LLC)</p>
                <p><strong>Venmo:</strong> @RTPosadas</p>
                <p className="text-xs text-gray-600 mt-1">Include invoice <strong>{payLaterResult.invoiceNumber}</strong> in the memo.</p>
              </div>
            </div>

            <div className="mt-6 bg-[#FFF8EC] border-2 border-[#D4A24C] rounded-xl p-5 text-center">
              <div className="text-xs uppercase tracking-wide text-[#D4A24C] font-bold">Ready to upload your ad?</div>
              <p className="text-sm text-[#0F2A4A] mt-1">
                You can submit your ad artwork now. It goes live once we confirm your payment.
              </p>
              <a
                href={payLaterResult.submitUrl}
                className="mt-3 inline-block bg-[#D4A24C] text-[#0F2A4A] font-bold px-6 py-2.5 rounded-md hover:bg-[#e0b266]"
              >
                Submit Your Ad
              </a>
            </div>

            <p className="text-xs text-center text-gray-500 mt-6 flex items-center justify-center gap-1.5">
              <Shield size={12} /> A copy of your invoice was emailed to you.
            </p>
          </div>
        </main>
        <BizFooter />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#0F2A4A] text-white">
      <PaymentTestModeBanner />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <Link to="/" className="text-sm text-white/60 hover:text-white inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white text-center">
          Pick Your Annual Ad Plan
        </h1>
        <p className="text-center text-white/70 mt-2 max-w-xl mx-auto">
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
          {/* Ad artwork: bring your own, or let us design it */}
          {!isReligious && (
            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Your ad artwork</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDesignAddon(false)}
                  className={`text-left px-4 py-3 rounded-md border-2 transition-colors ${
                    !designAddon ? "border-[#0F2A4A] bg-[#0F2A4A]/5" : "border-gray-300 hover:border-gray-400 bg-white"
                  }`}
                >
                  <div className="text-sm font-bold text-[#0F2A4A]">I have my own ad image</div>
                  <div className="text-xs text-gray-600 mt-0.5">Upload your 1216×896 image after checkout. No extra cost.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDesignAddon(true)}
                  className={`text-left px-4 py-3 rounded-md border-2 transition-colors ${
                    designAddon ? "border-[#D4A24C] bg-[#FFF8EC]" : "border-gray-300 hover:border-gray-400 bg-white"
                  }`}
                >
                  <div className="text-sm font-bold text-[#0F2A4A] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#D4A24C]" /> Professionally design it for my business — add ${(DESIGN_PRICE_CENTS / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Our team designs it for you in 72 hours. Unlimited revisions.</div>
                </button>
              </div>
            </div>
          )}

          {/* Payment-method tabs (paid, non-religious flow only) */}
          {!isReligious && (
            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Payment method</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod("card")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold border-2 transition-colors ${
                    payMethod === "card"
                      ? "bg-[#0F2A4A] text-white border-[#0F2A4A]"
                      : "bg-white text-[#0F2A4A] border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <CreditCard size={16} /> Card
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("zelle")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold border-2 transition-colors ${
                    payMethod === "zelle"
                      ? "bg-purple-700 text-white border-purple-700"
                      : "bg-white text-purple-700 border-purple-300 hover:border-purple-500"
                  }`}
                >
                  <Send size={16} /> Zelle
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("pay_later")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold border-2 transition-colors ${
                    payMethod === "pay_later"
                      ? "bg-[#D4A24C] text-[#0F2A4A] border-[#D4A24C]"
                      : "bg-white text-[#0F2A4A] border-[#D4A24C]/60 hover:border-[#D4A24C]"
                  }`}
                >
                  <FileText size={16} /> Bill Me
                </button>
              </div>
              {payMethod === "zelle" && (
                <p className="mt-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-3 py-2">
                  Send Zelle to <strong>619-707-0467</strong>. Your ad goes live once we confirm payment (usually within 24 hours).
                </p>
              )}
              {payMethod === "pay_later" && (
                <p className="mt-2 text-xs text-[#0F2A4A] bg-[#FFF8EC] border border-[#D4A24C]/60 rounded-md px-3 py-2">
                  <strong>Bill Me Later:</strong> Reserve your spot now and pay within 7 days.
                  Your reservation is automatically cancelled if unpaid after 7 days.
                </p>
              )}
            </div>
          )}

          {/* Zelle + Pay Later contact fields */}
          {!isReligious && (payMethod === "zelle" || payMethod === "pay_later") && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-[#0F2A4A] mb-1">
                  Business Owner Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Jane Smith"
                  maxLength={120}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0F2A4A] mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Smith Family Bakery"
                  maxLength={160}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0F2A4A] mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="619-555-1212"
                  maxLength={40}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                We use these to confirm your payment and reach you if we have questions. You can refine them later at the ad-submission step.
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

              <div className="mt-3 rounded-lg border border-[#D4A24C]/80 bg-[#FFF8EC] px-4 py-3 text-center">
                <p className="text-sm sm:text-base font-bold tracking-wide text-[#0F2A4A] uppercase">
                  Use Rep Code in Flyer to Get 50% Off
                </p>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-[#0F2A4A]">
                  DON'T HAVE A REPCODE? TEXT 619-707-0467 to get one.
                </p>
              </div>
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
                  id="agree-all"
                  checked={agreedTerms && agreedNoRefund}
                  onCheckedChange={(v) => {
                    const on = v === true;
                    setAgreedTerms(on);
                    setAgreedNoRefund(on);
                  }}
                  className="mt-0.5"
                />
                <Label htmlFor="agree-all" className="text-sm text-[#0F2A4A] cursor-pointer leading-snug">
                  <span className="font-normal">
                    I confirm the details above are accurate, and I agree to the GetBizMusic AI
                    Business Alliance Membership Terms, disclosures, and no-refund policy. This
                    membership does not auto-renew — I understand I will receive a reminder email
                    before my membership expires. If I select Pay Later or pay by Zelle/Venmo, I
                    understand the additional terms that apply to those payment methods. Being
                    cited or recommended by AI search tools is not guaranteed or under our control.{" "}
                    <a
                      href="/terms/membership"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline text-[#0F2A4A]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      (Full Terms &amp; Conditions)
                    </a>
                  </span>
                  <span className="mt-2 block text-xs font-normal text-[#0F2A4A]/70">
                    I also agree to receive texts, calls, or emails from WINALL Media, LLC. for
                    other products and services. Consent is not required to purchase. Msg &amp; data
                    rates may apply. Opt out anytime.
                  </span>
                </Label>

              </div>
            </div>
          </div>

          {!isReligious && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex justify-between text-[#0F2A4A]">
                <span>{AD_PLANS[plan].label} — {AD_PLANS[plan].seconds}s rotation (1 year)</span>
                <span className="font-semibold">${adSpotPrice.toFixed(2).replace(/\.00$/, "")}</span>
              </div>
              {repState.status === "valid" && (
                <div className="text-xs text-emerald-700 mt-0.5">Rep code {repState.code} applied — {repState.discountPercent}% off the ad spot</div>
              )}
              {designAddon && (
                <div className="flex justify-between text-[#0F2A4A] mt-2">
                  <span>Pro Ad Design (done-for-you artwork)</span>
                  <span className="font-semibold">${(DESIGN_PRICE_CENTS / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-300 mt-3 pt-3 text-base font-bold text-[#0F2A4A]">
                <span>Total today</span>
                <span>${totalFormatted}</span>
              </div>
            </div>
          )}

          {isReligious ? (
            <button
              onClick={startFreeReligious}
              disabled={!canPay || freeLoading}
              className="mt-6 w-full bg-emerald-600 text-white font-bold py-3 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {freeLoading ? "Reserving your free spot…" : "Continue to Free Ministry Ad Submission"}
            </button>
          ) : payMethod === "zelle" ? (
            <button
              onClick={startZelleOrder}
              disabled={!canPay || zelleLoading}
              className="mt-6 w-full bg-purple-700 text-white font-bold py-3 rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {zelleLoading ? (
                <>Reserving your spot…</>
              ) : (
                <><Send size={16} /> Reserve Spot & Get Zelle Instructions — ${totalFormatted}</>
              )}
            </button>
          ) : payMethod === "pay_later" ? (
            <button
              onClick={startPayLaterOrder}
              disabled={!canPay || payLaterLoading}
              className="mt-6 w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {payLaterLoading ? (
                <>Reserving your spot…</>
              ) : (
                <><FileText size={16} /> Bill Me Later — Reserve Spot — ${totalFormatted}</>
              )}
            </button>
          ) : (
            <button
              onClick={startCheckout}
              disabled={!canPay}
              className="mt-6 w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D4A24C]"
            >
              {loading ? "Starting…" : `Complete Purchase — $${totalFormatted}`}
            </button>
          )}
          {!industry ? (
            <p className="mt-2 text-xs text-center text-amber-700">
              Please pick your business category above to continue.
            </p>
          ) : !agreedTerms || !agreedNoRefund ? (
            <p className="mt-2 text-xs text-center text-gray-500">
              Please check the agreement box above to continue.
            </p>
          ) : null}
          <p className="mt-3 text-xs text-gray-500 flex items-center justify-center gap-1.5">
            <Shield size={12} /> {isReligious
              ? "You'll get a confirmation and your submission link by email."
              : payMethod === "zelle"
                ? "We'll email your Zelle payment instructions and a private submission link."
                : payMethod === "pay_later"
                  ? "We'll email your invoice with payment details and a private submission link."
                  : "Secure checkout. You'll get a receipt and unique submission link by email."}
          </p>

        </div>

      </main>
      <BizFooter />
    </div>
  );
}
