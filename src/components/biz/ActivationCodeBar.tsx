import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { lookupActivationCode, type ActivationProof } from "@/lib/activation.functions";

const STORAGE_KEY = "gbm_activation_code";

type Props = {
  initialCode?: string;
  proof: ActivationProof | null;
  onProof: (proof: ActivationProof | null) => void;
};

export function ActivationCodeBar({ initialCode, proof, onProof }: Props) {
  const lookupFn = useServerFn(lookupActivationCode);
  const [code, setCode] = useState(initialCode ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runLookup = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    try {
      const res = await lookupFn({ data: { code: value } });
      if (!res.found) {
        onProof(null);
        setError(res.reason);
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
      onProof(res.proof);
      try {
        sessionStorage.setItem(STORAGE_KEY, res.proof.code);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't check that code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run from ?code= on the flyer link, or from a code entered earlier this session.
  useEffect(() => {
    let start = initialCode;
    if (!start) {
      try {
        start = sessionStorage.getItem(STORAGE_KEY) ?? undefined;
      } catch {
        start = undefined;
      }
    }
    if (start) {
      setCode(start);
      void runLookup(start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const priceFormatted = proof ? `$${(proof.priceCents / 100).toFixed(2)}` : "";

  return (
    <section className="mt-4 sm:mt-6">
      <div className="rounded-2xl border-2 border-[#D4A24C] bg-gradient-to-br from-[#0F2A4A] via-[#153a66] to-[#0F2A4A] px-4 py-4 sm:px-6 sm:py-5 text-white shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 min-w-0">
            <KeyRound className="mt-0.5 shrink-0 text-[#F4C430]" size={18} />
            <div className="min-w-0">
              <p className="text-sm font-bold">Have an activation code from your GetBizMusic rep?</p>
              <p className="text-xs text-white/75">
                Enter the code on your flyer to preview your own ad in the rotation above.
              </p>
            </div>
          </div>
          <form
            className="flex w-full gap-2 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              void runLookup(code);
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              aria-label="Activation code"
              className="w-full sm:w-48 rounded-lg border border-white/25 bg-white/95 px-3 py-2 text-sm font-mono font-bold uppercase tracking-wider text-[#0F2A4A] placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#D4A24C] px-4 py-2 text-sm font-bold text-[#0F2A4A] transition hover:bg-[#e0b566] disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
              View My Ad
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 shrink-0" size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {proof && (
        <div className="mt-3 rounded-2xl border border-[#D4A24C] bg-[#FFFBF2] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="shrink-0 text-emerald-600" size={18} />
                <p className="text-sm font-bold text-[#0F2A4A] truncate">
                  This is your ad, {proof.businessName}
                </p>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {proof.paid
                  ? "Your listing is already active and running in the rotation above."
                  : `It's now playing first in the slider above. Activation: ${priceFormatted}${proof.priceNote ? ` — ${proof.priceNote}` : ""}`}
              </p>
            </div>
            {proof.paid ? (
              <Link
                to="/food"
                className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-[#0F2A4A] px-5 py-2.5 text-sm font-bold text-[#0F2A4A] hover:bg-[#0F2A4A] hover:text-white"
              >
                View My Live Ad
              </Link>
            ) : (
              <Link
                to="/food/activate"
                search={{ code: proof.code }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#0F2A4A] px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105 hover:bg-[#163864]"
              >
                Review &amp; Activate My Listing
                <Sparkles size={14} />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
