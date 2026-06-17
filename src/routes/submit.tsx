import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Upload, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createSubmission } from "@/lib/ads.functions";
import { INDUSTRIES, AD_PLANS, type AdPlan } from "@/lib/biz-utils";
import { BizNavbar } from "@/components/biz/BizNavbar";
import { BizFooter } from "@/components/biz/BizFooter";

const searchSchema = z.object({
  plan: z.enum(["image_5", "slider_10"]).optional(),
});

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit Your Ad — BizSpot Directory" },
      { name: "description", content: "Upload your business ad image. $5 or $10 — one year of exposure. Reviewed within 24 hours." },
      { property: "og:title", content: "Submit Your Ad — BizSpot Directory" },
      { property: "og:description", content: "Get your business in front of customers nationwide, all year long." },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: SubmitPage,
});

const formSchema = z.object({
  business_name: z.string().trim().min(1, "Required").max(120),
  contact_name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(7, "Too short").max(40),
  website_url: z.string().trim().url("Must be a valid URL (https://...)").max(255).optional().or(z.literal("")),
  industry: z.string().min(1, "Pick one"),
  tagline: z.string().trim().max(80).optional().or(z.literal("")),
});

function SubmitPage() {
  const { plan: initialPlan } = Route.useSearch();
  const submit = useServerFn(createSubmission);
  const [plan, setPlan] = useState<AdPlan>(initialPlan ?? "image_5");
  const [file, setFile] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onFile = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) { toast.error("Please choose an image to upload"); return; }
    if (!agree) { toast.error("Please agree to the content policy"); return; }

    const fd = new FormData(e.currentTarget);
    const raw = {
      business_name: String(fd.get("business_name") ?? ""),
      contact_name: String(fd.get("contact_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      website_url: String(fd.get("website_url") ?? ""),
      industry: String(fd.get("industry") ?? ""),
      tagline: String(fd.get("tagline") ?? ""),
    };
    const parsed = formSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `submissions/${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("ad-uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      await submit({
        data: { ...parsed.data, ad_type: plan, image_path: path },
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <BizNavbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mb-4">
            <Check size={32} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2A4A]">Submission Received!</h1>
          <p className="text-gray-600 mt-3">
            Your ad is in our review queue. Our team checks every submission within 24 hours
            for content quality and policy compliance. You'll be contacted at the email you
            provided once it goes live.
          </p>
          <div className="mt-6 bg-[#D4A24C]/10 border border-[#D4A24C]/30 rounded-xl p-4 text-sm text-[#0F2A4A]">
            <strong>Plan:</strong> {AD_PLANS[plan].label} — ${AD_PLANS[plan].price} for 1 year
            <div className="text-xs text-gray-600 mt-1">
              (This demo collects no payment. Pricing is informational only.)
            </div>
          </div>
          <Link to="/" className="inline-block mt-6 text-[#0F2A4A] font-semibold hover:underline">
            ← Back to home
          </Link>
        </main>
        <BizFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <BizNavbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <h1 className="font-serif text-3xl font-bold text-[#0F2A4A]">Submit Your Business Ad</h1>
        <p className="text-gray-600 mt-1 text-sm">
          One year of local exposure, reviewed within 24 hours.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Plan */}
          <div>
            <label className="block text-sm font-semibold text-[#0F2A4A] mb-2">Choose your plan</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(AD_PLANS) as AdPlan[]).map((key) => {
                const p = AD_PLANS[key];
                const sel = plan === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setPlan(key)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      sel ? "border-[#D4A24C] bg-[#D4A24C]/10" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold text-[#0F2A4A]">{p.label}</div>
                    <div className="text-2xl font-bold text-[#0F2A4A] mt-1">
                      ${p.price}
                      <span className="text-xs font-normal text-gray-500"> / year</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{p.seconds} seconds per rotation</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-semibold text-[#0F2A4A] mb-2">Your ad image</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 hover:border-[#D4A24C] transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#0F2A4A] file:text-white hover:file:bg-[#163864] cursor-pointer"
              />
              {file && (
                <div className="mt-3 text-xs text-emerald-700 flex items-center gap-1">
                  <Check size={14} /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </div>
              )}
              <div className="mt-3 text-xs text-gray-500 flex items-start gap-2">
                <Upload size={14} className="mt-0.5 shrink-0" />
                <div>
                  <strong>Recommended:</strong> 1200×628 px landscape (16:9 also works), JPG/PNG/WebP, under 2 MB.
                  Include your logo, business name, services, and phone number. Avoid tiny text.
                </div>
              </div>
            </div>
          </div>

          {/* Business info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field name="business_name" label="Business name" required placeholder="Tony's Pizzeria" />
            <Field name="contact_name" label="Contact name" required placeholder="Tony Romano" />
            <Field name="email" type="email" label="Email" required placeholder="tony@example.com" />
            <Field name="phone" label="Phone" required placeholder="555-555-1234" />
            <Field name="website_url" label="Website (optional)" placeholder="https://example.com" />
            <div>
              <label className="block text-sm font-medium text-[#0F2A4A] mb-1">
                Industry <span className="text-red-500">*</span>
              </label>
              <select
                name="industry"
                required
                defaultValue=""
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C] bg-white"
              >
                <option value="" disabled>Pick one…</option>
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Field name="tagline" label="Short tagline (optional, max 80 chars)" maxLength={80} placeholder="Wood-fired flavor, Italian tradition" />

          {/* Policy */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong>Content policy:</strong> No adult, illegal, hateful, misleading, or
              copyrighted content. All ads are reviewed by an administrator before going live.
              We may reject submissions at our discretion.
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1"
            />
            I confirm my ad complies with the content policy and I own the rights to the image.
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-60"
          >
            {submitting ? "Submitting…" : `Submit Ad — $${AD_PLANS[plan].price}`}
          </button>
          <p className="text-center text-xs text-gray-500">
            This demo collects no payment. Pricing shown is informational only.
          </p>
        </form>
      </main>
      <BizFooter />
    </div>
  );
}

function Field({
  name, label, required, type = "text", placeholder, maxLength,
}: {
  name: string; label: string; required?: boolean; type?: string;
  placeholder?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#0F2A4A] mb-1">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
      />
    </div>
  );
}
