import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, Check, Shield, Clock, Sparkles, Award, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BizFooter } from "@/components/biz/BizFooter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createDesignCheckout } from "@/lib/design.functions";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const searchSchema = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Pro Ad Design — $49.95 Done-For-You | Get Biz Music" },
      {
        name: "description",
        content:
          "Have our team professionally design your BizSpot Music–compliant ad for just $49.95. Delivered within 72 hours, guaranteed to meet spec. Unlimited revisions until final approval.",
      },
      { property: "og:title", content: "Pro Ad Design — $49.95 Done-For-You" },
      {
        property: "og:description",
        content: "Professionally designed BizSpot Music–compliant ad, delivered within 72 hours.",
      },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: DesignPage,
});

function DesignPage() {
  const { email: emailParam } = Route.useSearch();
  const [email, setEmail] = useState(emailParam ?? "");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedNoRefund, setAgreedNoRefund] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const canPay = emailValid && agreedTerms && agreedNoRefund && !loading;

  const startCheckout = async () => {
    if (!emailValid) return toast.error("Please enter a valid email");
    if (!agreedTerms || !agreedNoRefund) return toast.error("Please confirm both boxes to continue");
    setLoading(true);
    try {
      const result = await createDesignCheckout({
        data: {
          customerEmail: email,
          returnUrl: `${window.location.origin}/design/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
          agreedTerms,
          agreedNoRefund,
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
        <main className="max-w-3xl mx-auto px-4 py-8">
          <button
            onClick={() => setClientSecret(null)}
            className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft size={14} /> Back
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
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to home
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-[#FFF8EC] border border-[#D4A24C]/60 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#0F2A4A]">
            <Sparkles size={14} className="text-[#D4A24C]" /> Done-For-You
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0F2A4A] mt-4">
            Pro Ad Design — Guaranteed To Meet Spec
          </h1>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto">
            Our team will professionally design your BizSpot Music–compliant ad for just{" "}
            <strong>$49.95</strong>. Delivered within <strong>72 hours</strong>, with unlimited
            revisions until final approval.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Benefit icon={<Award size={20} />} title="Guaranteed to meet spec" body="1216×896 (4:3), phone-legible, compliant with our display standards." />
          <Benefit icon={<Clock size={20} />} title="72-hour turnaround" body="You'll receive your initial ad for approval or revision within 72 hours." />
          <Benefit icon={<Sparkles size={20} />} title="Unlimited revisions" body="We'll refine your ad until you give final approval." />
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-[#D4A24C] font-bold">Flat rate</div>
              <div className="text-3xl font-bold text-[#0F2A4A]">$49.95</div>
            </div>
            <div className="text-xs text-gray-500 text-right">
              One-time payment<br />No subscription
            </div>
          </div>

          <label className="block text-sm font-semibold text-[#0F2A4A] mb-2">
            Email for receipt &amp; delivery
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />

          <div className="mt-5 rounded-xl border-2 border-[#D4A24C]/60 bg-[#FFF8EC] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox id="d-terms" checked={agreedTerms} onCheckedChange={(v) => setAgreedTerms(v === true)} className="mt-0.5" />
              <Label htmlFor="d-terms" className="text-sm text-[#0F2A4A] cursor-pointer leading-snug">
                I understand this is a design service for a novelty ad spot — no guaranteed
                views, plays, or business results.
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="d-refund" checked={agreedNoRefund} onCheckedChange={(v) => setAgreedNoRefund(v === true)} className="mt-0.5" />
              <Label htmlFor="d-refund" className="text-sm text-[#0F2A4A] cursor-pointer leading-snug">
                I understand and I'm good with the no-refund policy — once the design work
                begins, the sale is final.
              </Label>
            </div>
          </div>

          <button
            onClick={startCheckout}
            disabled={!canPay}
            className="mt-6 w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 justify-center"><Loader2 size={16} className="animate-spin" /> Starting…</span>
            ) : (
              "Yes — Design My Ad for $49.95"
            )}
          </button>

          <p className="mt-3 text-xs text-gray-500 flex items-center justify-center gap-1.5">
            <Shield size={12} /> Secure checkout. After payment we'll ask for your logo and business info.
          </p>
        </div>
      </main>
      <BizFooter />
    </div>
  );
}

function Benefit({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="w-9 h-9 rounded-lg bg-[#FFF8EC] text-[#D4A24C] flex items-center justify-center mb-2">
        {icon}
      </div>
      <div className="font-semibold text-[#0F2A4A] text-sm flex items-center gap-1">
        <Check size={14} className="text-emerald-600" /> {title}
      </div>
      <p className="text-xs text-gray-600 mt-1 leading-snug">{body}</p>
    </div>
  );
}
