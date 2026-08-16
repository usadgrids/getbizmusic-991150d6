import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Upload, Check, AlertCircle, Lock, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdForEdit, submitAdEdit } from "@/lib/ads.functions";
import { INDUSTRIES } from "@/lib/biz-utils";
import { BizFooter } from "@/components/biz/BizFooter";

const searchSchema = z.object({ token: z.string().uuid().optional() });

export const Route = createFileRoute("/edit-ad")({
  head: () => ({
    meta: [
      { title: "Edit Your Ad — Get Biz Music" },
      { name: "description", content: "Update your live ad — change your image, phone number, website, or tagline. Edits are reviewed by an admin before going live." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: EditAdPage,
});

type LoadState =
  | { status: "checking" }
  | { status: "bad"; reason: string }
  | { status: "ok"; ad: Ad; contact: Contact; pendingEdit: boolean };

type Ad = {
  id: string;
  ad_number: number;
  business_name: string;
  website_url: string | null;
  youtube_url: string | null;
  tagline: string | null;
  industry: string;
  ad_type: "image_5" | "slider_10";
  preview_url: string;
};

type Contact = { contact_name: string; email: string; phone: string };

const formSchema = z.object({
  business_name: z.string().trim().min(1, "Required").max(120),
  contact_name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(7, "Too short").max(40),
  website_url: z.string().trim().url("Must be a valid URL (https://...)").max(255).optional().or(z.literal("")),
  industry: z.string().min(1, "Pick one"),
  tagline: z.string().trim().max(80).optional().or(z.literal("")),
});

function EditAdPage() {
  const { token } = Route.useSearch();
  const load = useServerFn(getAdForEdit);
  const send = useServerFn(submitAdEdit);

  const [state, setState] = useState<LoadState>({
    status: token ? "checking" : "bad",
    reason: token ? "" : "No edit token provided",
  } as LoadState);
  const [file, setFile] = useState<File | null>(null);
  const [dimWarning, setDimWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await load({ data: { token } });
        if (cancelled) return;
        if (!res.found) setState({ status: "bad", reason: res.reason });
        else setState({ status: "ok", ad: res.ad, contact: res.contact, pendingEdit: res.pendingEdit });
      } catch (e) {
        if (!cancelled) setState({ status: "bad", reason: e instanceof Error ? e.message : "Failed to load ad" });
      }
    })();
    return () => { cancelled = true; };
  }, [token, load]);

  const onFile = (f: File | null) => {
    setDimWarning(null);
    if (!f) { setFile(null); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) { toast.error("Only JPG, PNG, or WebP images are allowed"); return; }
    setFile(f);
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
            ? `Your image is ${w}×${h}. Recommended is 1216×896 for best quality.`
            : `Your image is ${w}×${h} (ratio ${ratio.toFixed(2)}:1). We recommend 1216×896 px (4:3).`,
        );
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || state.status !== "ok") return;
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
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Please check the form"); return; }

    setSubmitting(true);
    try {
      let imagePath: string | undefined;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        imagePath = `submissions/${safeName}`;
        const { error: upErr } = await supabase.storage.from("ad-uploads").upload(imagePath, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
      }
      await send({ data: { ...parsed.data, token, image_path: imagePath } });
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to submit edit");
    } finally {
      setSubmitting(false);
    }
  };

  if (state.status === "checking") {
    return (
      <div className="min-h-screen bg-[#0F2A4A] text-white">
        <main className="max-w-xl mx-auto px-4 py-20 text-center">
          <Loader2 className="mx-auto animate-spin text-[#0F2A4A]" size={36} />
          <p className="mt-3 text-gray-600">Loading your ad…</p>
        </main>
        <BizFooter />
      </div>
    );
  }

  if (state.status === "bad") {
    return (
      <div className="min-h-screen bg-[#0F2A4A] text-white">
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-700 mb-4">
            <Lock size={28} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">Edit Link Invalid</h1>
          <p className="text-gray-600 mt-2">{state.reason || "This edit link is invalid or expired."}</p>
          <p className="text-gray-500 mt-2 text-sm">Check the approval email we sent — it contains your permanent edit link.</p>
          <Link to="/" className="inline-block mt-6 text-[#0F2A4A] font-semibold hover:underline">← Back to home</Link>
        </main>
        <BizFooter />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0F2A4A] text-white">
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mb-4">
            <Check size={32} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2A4A]">Edits Submitted!</h1>
          <p className="text-gray-600 mt-3">
            Your changes are in the review queue — we review every edit within <strong>24 hours</strong>.
            Your current ad stays live during review. You'll get a confirmation email at{" "}
            <strong>{state.ad && "contact" in state ? state.contact.email : ""}</strong> once your edits are approved.
          </p>
          <Link to="/" className="inline-block mt-6 text-[#0F2A4A] font-semibold hover:underline">← Back to home</Link>
        </main>
        <BizFooter />
      </div>
    );
  }

  const { ad, contact, pendingEdit } = state;

  return (
    <div className="min-h-screen bg-[#0F2A4A] text-white">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="text-sm text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <h1 className="font-serif text-3xl font-bold text-[#0F2A4A]">Edit Your Ad</h1>
        <div className="mt-2 text-sm text-gray-600">
          Editing ad <strong>#{ad.ad_number}</strong> — <em>{ad.business_name}</em>
        </div>

        {pendingEdit && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <Clock size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong>You already have an edit waiting for review.</strong> Submitting again will be
              blocked until an admin approves the pending change. Your currently live ad is unaffected.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Current image */}
          {ad.preview_url && (
            <div>
              <label className="block text-sm font-semibold text-[#0F2A4A] mb-2">Current ad image</label>
              <div className="aspect-[1216/896] max-w-md rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                <img src={ad.preview_url} alt="Current ad" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          {/* Optional new image */}
          <div className="rounded-xl border-2 border-[#D4A24C] bg-[#FFF8E9] p-4">
            <div className="text-[#0F2A4A] font-bold">Replace image (optional)</div>
            <div className="text-xs text-[#0F2A4A]/70 mt-1">
              Recommended: <strong>1216 × 896 px</strong> (4:3), JPG/PNG/WebP, under 2 MB.
              Leave empty to keep your current image.
            </div>
          </div>
          <div>
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
                <div>New image will replace the current one after admin approval.</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field name="business_name" label="Business name" required defaultValue={ad.business_name} />
            <Field name="contact_name" label="Contact name" required defaultValue={contact.contact_name} />
            <Field name="email" type="email" label="Email" required defaultValue={contact.email} />
            <Field name="phone" label="Phone" required defaultValue={contact.phone} />
            <Field name="website_url" label="Website (optional)" defaultValue={ad.website_url ?? ""} />
            <div>
              <label className="block text-sm font-medium text-[#0F2A4A] mb-1">Industry <span className="text-red-500">*</span></label>
              <select name="industry" required defaultValue={ad.industry} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C] bg-white">
                <option value="" disabled>Pick one…</option>
                {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
          </div>
          <Field name="tagline" label="Short tagline (optional, max 80 chars)" maxLength={80} defaultValue={ad.tagline ?? ""} />

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 flex gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong>How edits work:</strong> Every change is reviewed by an administrator before
              going live. Your existing ad keeps running during review. Once approved, your edits
              replace the current ad — the ad number and expiration date stay the same.
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || pendingEdit}
            className="w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-md hover:bg-[#e0b266] transition-colors disabled:opacity-60"
          >
            {submitting ? "Submitting…" : pendingEdit ? "Edit already pending review" : "Submit Changes for Review"}
          </button>
        </form>
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
