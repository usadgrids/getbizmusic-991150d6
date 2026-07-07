import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Upload, Check, AlertCircle, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createSubmission, scheduleSubmissionReminder } from "@/lib/ads.functions";
import { getPaymentByToken } from "@/lib/payments.functions";
import { INDUSTRIES, AD_PLANS, type AdPlan } from "@/lib/biz-utils";
import { BizFooter } from "@/components/biz/BizFooter";

const searchSchema = z.object({
  token: z.string().uuid().optional(),
});

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit Your Ad — Get Biz Music - National City, CA" },
      { name: "description", content: "Upload your business ad image after payment. Reviewed within 24 hours." },
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
  const { token } = Route.useSearch();
  const submit = useServerFn(createSubmission);
  const lookup = useServerFn(getPaymentByToken);
  const reminder = useServerFn(scheduleSubmissionReminder);

  const [verify, setVerify] = useState<{ status: "checking" | "ok" | "bad"; plan?: AdPlan; email?: string; tokenUsed?: boolean; reason?: string }>(
    { status: token ? "checking" : "bad", reason: token ? undefined : "No payment token provided" }
  );
  const [file, setFile] = useState<File | null>(null);
  const [dimWarning, setDimWarning] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await lookup({ data: { token } });
        if (cancelled) return;
        if (!res.found) {
          setVerify({ status: "bad", reason: res.reason });
        } else {
          setVerify({ status: "ok", plan: res.plan, email: res.email, tokenUsed: res.tokenUsed });
        }
      } catch (e) {
        if (!cancelled) setVerify({ status: "bad", reason: e instanceof Error ? e.message : "Verification failed" });
      }
    })();
    return () => { cancelled = true; };
  }, [token, lookup]);

  const onFile = (f: File | null) => {
    setDimWarning(null);
    if (!f) { setFile(null); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) { toast.error("Only JPG, PNG, or WebP images are allowed"); return; }
    setFile(f);
    // Check dimensions client-side; warn (don't block) if not 1216×896 / 4:3.
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const ratio = w / h;
      const isTarget = w === 1216 && h === 896;
      const isFourThree = Math.abs(ratio - 4 / 3) < 0.02;
      if (!isTarget) {
        setDimWarning(
          isFourThree
            ? `Your image is ${w}×${h}. Recommended is 1216×896 for best quality — it'll still work, but may look softer.`
            : `Your image is ${w}×${h} (ratio ${ratio.toFixed(2)}:1). We recommend 1216×896 px (4:3 ratio). It'll be cropped or letterboxed.`
        );
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const handleRemindLater = async () => {
    if (!token) return;
    setReminderSending(true);
    try {
      await reminder({ data: { token } });
      setReminderSent(true);
      toast.success("Reminder email sent — check your inbox!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reminder");
    } finally {
      setReminderSending(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || verify.status !== "ok") return;
    if (!file) { toast.error("Please choose an image to upload"); return; }
    if (!agree) { toast.error("Please agree to the content policy"); return; }

    const fd = new FormData(e.currentTarget);
    const raw = {
      business_name: String(fd.get("business_name") ?? ""),
      contact_name: String(fd.get("contact_name") ?? ""),
      email: String(fd.get("email") ?? verify.email ?? ""),
      phone: String(fd.get("phone") ?? ""),
      website_url: String(fd.get("website_url") ?? ""),
      industry: String(fd.get("industry") ?? ""),
      tagline: String(fd.get("tagline") ?? ""),
    };
    const parsed = formSchema.safeParse(raw);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Please check the form"); return; }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `submissions/${safeName}`;
      const { error: upErr } = await supabase.storage.from("ad-uploads").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      await submit({ data: { ...parsed.data, image_path: path, submission_token: token } });
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Guard states ---
  if (verify.status === "checking") {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <main className="max-w-xl mx-auto px-4 py-20 text-center">
          <Loader2 className="mx-auto animate-spin text-[#0F2A4A]" size={36} />
          <p className="mt-3 text-gray-600">Verifying your payment…</p>
        </main>
        <BizFooter />
      </div>
    );
  }

  if (verify.status === "bad") {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-700 mb-4">
            <Lock size={28} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">Payment Required</h1>
          <p className="text-gray-600 mt-2">{verify.reason ?? "You need to pay before submitting your ad."}</p>
          <Link
            to="/pricing"
            className="inline-block mt-6 bg-[#D4A24C] text-[#0F2A4A] font-bold px-5 py-2.5 rounded-md hover:bg-[#e0b266]"
          >
            View pricing & pay
          </Link>
        </main>
        <BizFooter />
      </div>
    );
  }

  if (verify.tokenUsed) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">Link Already Used</h1>
          <p className="text-gray-600 mt-2">This submission link has already been used. Your ad is in the review queue.</p>
          <Link to="/" className="inline-block mt-6 text-[#0F2A4A] font-semibold hover:underline">← Back to home</Link>
        </main>
        <BizFooter />
      </div>
    );
  }

  if (reminderSent) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-700 mb-4">
            <Check size={32} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2A4A]">Reminder Sent!</h1>
          <p className="text-gray-600 mt-3">
            We've emailed your private submission link to <strong>{verify.email}</strong>.
            Your paid spot is saved — submit whenever your 1216×896 image is ready.
          </p>
          <Link to="/" className="inline-block mt-6 text-[#0F2A4A] font-semibold hover:underline">← Back to home</Link>
        </main>
        <BizFooter />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mb-4">
            <Check size={32} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2A4A]">Submission Received!</h1>
          <p className="text-gray-600 mt-3">
            Your ad is in our review queue — we check every submission within 24 hours.
            We've sent a confirmation email to <strong>{verify.email}</strong>. Once approved,
            you'll get a second email with your unique ad number and shareable link.
          </p>
          <Link to="/" className="inline-block mt-6 text-[#0F2A4A] font-semibold hover:underline">← Back to home</Link>
        </main>
        <BizFooter />
      </div>
    );
  }


  // --- Form (verified) ---
  const plan = verify.plan!;
  const p = AD_PLANS[plan];

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <h1 className="font-serif text-3xl font-bold text-[#0F2A4A]">Submit Your Business Ad</h1>
        <div className="mt-3 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-1.5 rounded-full">
          <Check size={14} /> Payment verified — {p.label} (${p.price}/yr, {p.seconds}s rotation)
        </div>

        <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Prominent size spec */}
          <div className="rounded-xl border-2 border-[#D4A24C] bg-[#FFF8E9] p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-[#D4A24C] text-[#0F2A4A] font-bold flex items-center justify-center">4:3</div>
              <div className="flex-1">
                <div className="text-[#0F2A4A] font-bold text-lg leading-tight">
                  Image must be 1216 × 896 px (4:3 ratio)
                </div>
                <ul className="mt-2 text-sm text-[#0F2A4A]/80 space-y-1 list-disc pl-5">
                  <li>Format: <strong>JPG, PNG, or WebP</strong>, under <strong>2 MB</strong></li>
                  <li>Include: <strong>logo, business name, services, and phone number</strong></li>
                  <li>Avoid tiny text — most viewers see the ad on a phone</li>
                </ul>
                <p className="mt-2 text-xs text-[#0F2A4A]/70">
                  Not sure how? Any editor like Canva, Photoshop, or Figma can export at 1216×896.
                </p>
              </div>
            </div>
          </div>

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
              {dimWarning && (
                <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{dimWarning}</span>
                </div>
              )}
              <div className="mt-3 text-xs text-gray-500 flex items-start gap-2">
                <Upload size={14} className="mt-0.5 shrink-0" />
                <div>Drop your 1216×896 image here or click to browse.</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field name="business_name" label="Business name" required placeholder="Tony's Pizzeria" />
            <Field name="contact_name" label="Contact name" required placeholder="Tony Romano" />
            <Field name="email" type="email" label="Email" required placeholder="tony@example.com" defaultValue={verify.email} />
            <Field name="phone" label="Phone" required placeholder="555-555-1234" />
            <Field name="website_url" label="Website (optional)" placeholder="https://example.com" />
            <div>
              <label className="block text-sm font-medium text-[#0F2A4A] mb-1">Industry <span className="text-red-500">*</span></label>
              <select name="industry" required defaultValue="" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C] bg-white">
                <option value="" disabled>Pick one…</option>
                {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
          </div>
          <Field name="tagline" label="Short tagline (optional, max 80 chars)" maxLength={80} placeholder="Wood-fired flavor, Italian tradition" />

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong>Content policy:</strong> No adult, illegal, hateful, misleading, or copyrighted content.
              All ads are reviewed by an administrator before going live. We may reject submissions at our discretion.
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            I confirm my ad complies with the content policy and I own the rights to the image.
          </label>

          <button type="submit" disabled={submitting} className="w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-60">
            {submitting ? "Submitting…" : "Submit My Ad"}
          </button>

          {/* Not-ready escape hatch */}
          <div className="pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Not ready yet? Your paid spot is saved — we'll email you a link so you can submit later.
            </p>
            <button
              type="button"
              onClick={handleRemindLater}
              disabled={reminderSending}
              className="text-sm font-semibold text-[#0F2A4A] underline hover:text-[#D4A24C] disabled:opacity-60"
            >
              {reminderSending ? "Sending reminder…" : "I'm not ready — email me my submission link"}
            </button>
          </div>
        </form>
      </main>
      <BizFooter />
    </div>
  );
}

      </main>
      <BizFooter />
    </div>
  );
}

function Field({
  name, label, required, type = "text", placeholder, maxLength, defaultValue,
}: {
  name: string; label: string; required?: boolean; type?: string;
  placeholder?: string; maxLength?: number; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#0F2A4A] mb-1">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        name={name} type={type} required={required} placeholder={placeholder} maxLength={maxLength} defaultValue={defaultValue}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
      />
    </div>
  );
}
