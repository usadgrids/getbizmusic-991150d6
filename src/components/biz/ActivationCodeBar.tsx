import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { lookupActivationCode, type ActivationProof } from "@/lib/activation.functions";

const STORAGE_KEY = "gbm_activation_code";

type Props = {
  initialCode?: string;
  proof: ActivationProof | null;
  onProof: (proof: ActivationProof | null) => void;
};

export function ActivationCodeBar({ initialCode, onProof }: Props) {
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
      // Keep the preview private to this browser: remove ?code= from the address bar so a
      // shared/copied link or screenshot doesn't hand the proof to anyone else.
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has("code")) {
          url.searchParams.delete("code");
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        }
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

  return (
    <section className="mt-6 sm:mt-8">
      <div className="rounded-2xl border-2 border-[#D4A24C] bg-gradient-to-br from-[#0F2A4A] via-[#153a66] to-[#0F2A4A] px-5 py-6 sm:px-8 sm:py-8 text-center text-white shadow-md">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#F4C430] mb-3">
          <KeyRound size={14} />
          Activate Your Ad
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Have an activation code from your rep?</h2>
        <p className="text-sm text-white/80 max-w-2xl mx-auto mb-4">
          Enter the code on your flyer to preview your own ad in the rotation above and activate your listing.
        </p>
        <form
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
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
            className="w-full sm:w-56 rounded-full border border-white/25 bg-white/95 px-5 py-2.5 text-center text-sm font-mono font-bold uppercase tracking-wider text-[#0F2A4A] placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-6 py-2.5 text-sm font-bold text-[#0F2A4A] transition-transform hover:scale-105 hover:bg-[#e0b566] shadow-sm disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
            View My Ad
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 shrink-0" size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </section>
  );
}
