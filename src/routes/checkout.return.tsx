import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { z } from "zod";
import { BizFooter } from "@/components/biz/BizFooter";
import { lookupCheckoutBySession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search) =>
    z.object({ session_id: z.string().optional(), industry: z.string().optional() }).parse(search),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id, industry } = Route.useSearch();
  const [state, setState] = useState<{ status: "loading" | "paid" | "pending" | "error"; token?: string; email?: string; message?: string }>({ status: "loading" });

  useEffect(() => {
    if (!session_id) {
      setState({ status: "error", message: "Missing session id" });
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const res = await lookupCheckoutBySession({
          data: { sessionId: session_id, environment: getStripeEnvironment() },
        });
        if (cancelled) return;
        if (res.status === "paid" && res.token) {
          setState({ status: "paid", token: res.token, email: res.email });
          return;
        }
        if (attempts < 8) {
          setTimeout(tick, 1500);
        } else {
          setState({ status: "pending", message: "Your payment is still processing. Please check your email shortly for your submission link." });
        }
      } catch (e) {
        if (!cancelled) setState({ status: "error", message: e instanceof Error ? e.message : "Lookup failed" });
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [session_id]);

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        {state.status === "loading" && (
          <>
            <Loader2 className="mx-auto animate-spin text-[#0F2A4A]" size={40} />
            <h1 className="mt-4 font-serif text-2xl font-bold text-[#0F2A4A]">Confirming your payment…</h1>
            <p className="text-gray-600 mt-2 text-sm">Hang tight, this usually takes just a few seconds.</p>
          </>
        )}
        {state.status === "paid" && state.token && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mb-4">
              <Check size={32} />
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#0F2A4A]">Payment Received!</h1>
            <p className="text-gray-600 mt-3">
              Thank you. A receipt and your unique submission link have been sent to <strong>{state.email}</strong>.
            </p>
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 text-left">
              <div className="text-sm font-semibold text-[#0F2A4A] mb-2">Continue here to upload your ad:</div>
              <Link
                to="/submit"
                search={{ token: state.token, ...(industry ? { industry } : {}) }}
                className="inline-flex items-center gap-2 bg-[#D4A24C] text-[#0F2A4A] font-bold px-5 py-2.5 rounded-md hover:bg-[#e0b266] transition-colors"
              >
                Submit Your Ad <ArrowRight size={16} />
              </Link>
              <p className="text-xs text-gray-500 mt-3 break-all">
                Or bookmark this private link: <code>{window.location.origin}/submit?token={state.token}</code>
              </p>
            </div>
          </>
        )}
        {state.status === "pending" && (
          <>
            <Loader2 className="mx-auto text-[#0F2A4A]" size={40} />
            <h1 className="mt-4 font-serif text-2xl font-bold text-[#0F2A4A]">Payment Processing</h1>
            <p className="text-gray-600 mt-3">{state.message}</p>
          </>
        )}
        {state.status === "error" && (
          <>
            <h1 className="font-serif text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="text-gray-600 mt-2">{state.message}</p>
            <Link to="/pricing" className="inline-block mt-6 text-[#0F2A4A] font-semibold hover:underline">
              ← Back to pricing
            </Link>
          </>
        )}
      </main>
      <BizFooter />
    </div>
  );
}
