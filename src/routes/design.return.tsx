import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Loader2, Upload, ArrowLeft } from "lucide-react";
import { BizFooter } from "@/components/biz/BizFooter";
import { supabase } from "@/integrations/supabase/client";
import { lookupDesignBySession, submitDesignIntake } from "@/lib/design.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/design/return")({
  head: () => ({
    meta: [
      { title: "Your Pro Ad Design Order — Get Biz Music" },
      { name: "description", content: "Send us your business info so we can start designing your ad." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s) => z.object({ session_id: z.string().optional() }).parse(s),
  component: DesignReturn,
});

function DesignReturn() {
  const { session_id } = Route.useSearch();
  const [state, setState] = useState<{ status: "loading" | "paid" | "pending" | "done" | "error"; email?: string; message?: string; alreadySubmitted?: boolean }>(
    { status: "loading" }
  );
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!session_id) { setState({ status: "error", message: "Missing session id" }); return; }
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const res = await lookupDesignBySession({ data: { sessionId: session_id, environment: getStripeEnvironment() } });
        if (cancelled) return;
        if (res.status === "paid" || res.status === "intake_submitted") {
          setState({
            status: res.intakeSubmitted ? "done" : "paid",
            email: res.email,
            alreadySubmitted: res.intakeSubmitted,
          });
          return;
        }
        if (attempts < 8) setTimeout(tick, 1500);
        else setState({ status: "pending", message: "Your payment is still processing. We'll email you the intake link shortly." });
      } catch (e) {
        if (!cancelled) setState({ status: "error", message: e instanceof Error ? e.message : "Lookup failed" });
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [session_id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session_id) return;
    const fd = new FormData(e.currentTarget);
    const raw = {
      business_name: String(fd.get("business_name") ?? "").trim(),
      contact_name: String(fd.get("contact_name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      website_url: String(fd.get("website_url") ?? "").trim(),
      services: String(fd.get("services") ?? "").trim(),
      tagline: String(fd.get("tagline") ?? "").trim(),
      color_preferences: String(fd.get("color_preferences") ?? "").trim(),
      notes: String(fd.get("notes") ?? "").trim(),
    };
    if (!raw.business_name || !raw.contact_name || !raw.phone || !raw.services) {
      toast.error("Please fill in business name, contact, phone, and services");
      return;
    }
    setSubmitting(true);
    try {
      let logo_path = "";
      if (logoFile) {
        if (logoFile.size > 5 * 1024 * 1024) throw new Error("Logo must be under 5 MB");
        const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
        const safe = `design-intake/${session_id}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("ad-uploads")
          .upload(safe, logoFile, { contentType: logoFile.type, upsert: true });
        if (upErr) throw upErr;
        logo_path = safe;
      }
      const res = await submitDesignIntake({ data: { sessionId: session_id, intake: { ...raw, logo_path } } });
      if (!res.ok) throw new Error(res.error ?? "Submission failed");
      setState((s) => ({ ...s, status: "done" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link to="/" className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to home
        </Link>

        {state.status === "loading" && (
          <div className="text-center py-16">
            <Loader2 className="mx-auto animate-spin text-[#0F2A4A]" size={40} />
            <p className="mt-3 text-gray-600">Confirming your payment…</p>
          </div>
        )}

        {state.status === "pending" && (
          <div className="text-center py-16">
            <Loader2 className="mx-auto text-[#0F2A4A]" size={40} />
            <h1 className="mt-4 font-serif text-2xl font-bold text-[#0F2A4A]">Payment Processing</h1>
            <p className="text-gray-600 mt-3">{state.message}</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="text-center py-16">
            <h1 className="font-serif text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="text-gray-600 mt-2">{state.message}</p>
          </div>
        )}

        {state.status === "done" && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mb-4">
              <Check size={32} />
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#0F2A4A]">
              {state.alreadySubmitted ? "You're all set!" : "Thanks — we've got what we need!"}
            </h1>
            <p className="text-gray-600 mt-3">
              Our team will send your initial ad design for approval or revision within{" "}
              <strong>72 hours</strong>. We'll email <strong>{state.email}</strong> the
              moment it's ready.
            </p>
          </div>
        )}

        {state.status === "paid" && (
          <>
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-1.5 rounded-full">
              <Check size={14} /> Payment received
            </div>
            <h1 className="mt-4 font-serif text-3xl font-bold text-[#0F2A4A]">Send us your business info</h1>
            <p className="text-gray-600 mt-2">
              Takes 2–3 minutes. We'll design your ad and email it back within 72 hours for your approval or revision.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field name="business_name" label="Business name" required placeholder="Tony's Pizzeria" />
                <Field name="contact_name" label="Contact name" required placeholder="Tony Romano" />
                <Field name="phone" label="Phone" required placeholder="555-555-1234" />
                <Field name="website_url" label="Website (optional)" placeholder="https://example.com" />
              </div>

              <TextArea name="services" label="What services / products do you offer?" required placeholder="Wood-fired pizza, pasta, catering…" rows={3} />
              <Field name="tagline" label="Short tagline (optional, max 120 chars)" maxLength={120} placeholder="Wood-fired flavor, Italian tradition" />
              <TextArea name="color_preferences" label="Color / style preferences (optional)" placeholder="Warm reds and creams, rustic feel, no neon…" rows={2} />

              <div>
                <label className="block text-sm font-medium text-[#0F2A4A] mb-1">Logo upload (optional but recommended)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-[#D4A24C] transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#0F2A4A] file:text-white hover:file:bg-[#163864] cursor-pointer"
                  />
                  {logoFile && (
                    <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1">
                      <Check size={14} /> {logoFile.name}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500 flex items-start gap-2">
                    <Upload size={14} className="mt-0.5 shrink-0" />
                    <span>PNG, JPG, or SVG under 5 MB. Higher resolution is better.</span>
                  </div>
                </div>
              </div>

              <TextArea name="notes" label="Anything else we should know? (optional)" placeholder="Fonts you like, competitor examples, must-include phone number…" rows={3} />

              <button type="submit" disabled={submitting} className="w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-60">
                {submitting ? "Sending…" : "Send my info to the design team"}
              </button>
            </form>
          </>
        )}
      </main>
      <BizFooter />
    </div>
  );
}

function Field({ name, label, required, placeholder, maxLength }: { name: string; label: string; required?: boolean; placeholder?: string; maxLength?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#0F2A4A] mb-1">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        name={name} required={required} placeholder={placeholder} maxLength={maxLength}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
      />
    </div>
  );
}

function TextArea({ name, label, required, placeholder, rows = 3 }: { name: string; label: string; required?: boolean; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#0F2A4A] mb-1">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <textarea
        name={name} required={required} placeholder={placeholder} rows={rows}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
      />
    </div>
  );
}
