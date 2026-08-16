import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { searchBusinesses } from "@/lib/places.functions";
import { submitBusinessClaim } from "@/lib/claims.functions";
import { claimCategoryOptions } from "@/lib/claim-categories";
import type { DirectoryCategory } from "@/lib/directory-categories";

type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  website?: string;
  phone?: string;
};

function newCaptcha() {
  const a = 1 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * 8);
  return { a, b };
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#0F2A4A] outline-none focus:border-[#D4A24C]";

/**
 * Reusable "find & claim your business" widget for Knowledge Graph category
 * pages. Drop it on /food, /beauty or any future category page — the dropdown
 * options and stored source page follow the `category` prop.
 */
export function BusinessClaimSearch({ category }: { category: DirectoryCategory }) {
  const options = useMemo(() => claimCategoryOptions(category), [category]);

  const runSearch = useServerFn(searchBusinesses);
  const runClaim = useServerFn(submitBusinessClaim);

  const [businessName, setBusinessName] = useState("");
  const [zip, setZip] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(options[0] ?? "Other");
  const [captcha, setCaptcha] = useState(newCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");

  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<PlaceResult[] | null>(null);

  const [claimTarget, setClaimTarget] = useState<PlaceResult | null>(null);
  // When true, the claim form was reached via "add yours" (no matching Place),
  // so the address field is editable and pre-filled only with the business name.
  const [manualClaim, setManualClaim] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [wantsAiAudit, setWantsAiAudit] = useState(true);
  const [wantsAdDesign, setWantsAdDesign] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function startManualClaim() {
    setClaimTarget({
      placeId: "",
      name: businessName.trim(),
      address: "",
      website: undefined,
      phone: undefined,
    });
    setManualClaim(true);
  }

  function pickResult(r: PlaceResult) {
    setClaimTarget(r);
    setManualClaim(false);
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (businessName.trim().length < 2) return toast.error("Enter your legal business name.");
    if (!/^\d{5}$/.test(zip.trim())) return toast.error("Enter a 5-digit ZIP code.");
    if (Number(captchaInput) !== captcha.a + captcha.b) {
      setCaptcha(newCaptcha());
      setCaptchaInput("");
      return toast.error("Captcha answer was incorrect.");
    }

    setSearching(true);
    setMessage(null);
    setResults(null);
    setClaimTarget(null);
    try {
      const res = await runSearch({
        data: {
          businessName: businessName.trim(),
          zip: zip.trim(),
          category: selectedCategory,
          captchaAnswer: Number(captchaInput),
          captchaExpected: captcha.a + captcha.b,
        },
      });
      if (!res.served) {
        setMessage(res.message);
        setResults(null);
      } else {
        // Don't surface the generic "no matching businesses" string as a banner —
        // the dedicated empty-state UI below handles the no-results case.
        setMessage(null);
        setResults(res.results);
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setCaptcha(newCaptcha());
      setCaptchaInput("");
      setSearching(false);
    }
  }

  async function onClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimTarget) return;
    if (ownerName.trim().length < 2) return toast.error("Enter your name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail.trim())) return toast.error("Enter a valid email.");

    setSubmitting(true);
    try {
      const res = await runClaim({
        data: {
          businessName: claimTarget.name || businessName.trim(),
          businessCategory: selectedCategory,
          address: claimTarget.address,
          website: claimTarget.website,
          phone: claimTarget.phone,
          googlePlaceId: claimTarget.placeId,
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerPhone: ownerPhone.trim() || undefined,
          wantsAiAudit,
          wantsAdDesign,
          notes: notes.trim() || undefined,
          sourceCategoryPage: `/${category}`,
        },
      });
      if (!res.ok) return toast.error(res.error);
      setDone(true);
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="mx-auto mt-8 w-full max-w-3xl rounded-2xl bg-white px-5 py-8 text-center shadow-sm sm:px-8">
        <CheckCircle2 className="mx-auto mb-3 text-[#D4A24C]" size={30} />
        <h2 className="text-lg font-bold text-[#0F2A4A]">Thanks — we got your claim</h2>
        <p className="mt-2 text-sm text-gray-600">
          We sent a confirmation to <strong>{ownerEmail}</strong>. Our team will follow up within 3–5
          business days with the information you requested.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Claim your business listing"
      className="mx-auto mt-8 w-full max-w-3xl rounded-2xl bg-white px-5 py-6 shadow-sm sm:px-8"
    >
      <h2 className="text-lg font-bold text-[#0F2A4A]">Find & claim your business</h2>
      <p className="mt-1 text-sm text-gray-600">
        Search for your business, then claim your Knowledge Graph listing so AI answer engines cite
        you correctly.
      </p>

      <form onSubmit={onSearch} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">Legal Business Name</label>
          <input
            className={inputClass}
            value={businessName}
            maxLength={120}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Maria's Kitchen LLC"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">Zip Code</label>
          <input
            className={inputClass}
            value={zip}
            inputMode="numeric"
            maxLength={5}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="92101"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">Business Category</label>
          <select
            className={inputClass}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
            Quick check: {captcha.a} + {captcha.b} = ?
          </label>
          <input
            className={inputClass}
            value={captchaInput}
            inputMode="numeric"
            maxLength={3}
            onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, ""))}
            placeholder="Answer"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={searching}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F2A4A] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#153a66] disabled:opacity-60"
          >
            {searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </div>
      </form>

      {message && (
        <p className="mt-4 rounded-lg border border-[#D4A24C]/50 bg-[#FFF8E8] px-4 py-3 text-sm font-medium text-[#7a5410]">
          {message}
        </p>
      )}

      {results && results.length > 1 && (
        <p className="mt-4 rounded-lg border border-[#D4A24C]/50 bg-[#FFF8E8] px-4 py-3 text-sm font-medium text-[#7a5410]">
          We found multiple locations for your business. Please choose your primary location to
          start — you can always update or add more later!
        </p>
      )}

      {results && results.length === 1 && (
        <p className="mt-4 text-sm font-semibold text-[#0F2A4A]">Is this your business?</p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {results.map((r) => (
            <li
              key={r.placeId || r.name}
              className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-3 ${
                claimTarget?.placeId === r.placeId ? "border-[#D4A24C] bg-[#fdf7ec]" : "border-gray-200"
              }`}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#0F2A4A]">
                  <Building2 size={14} className="shrink-0 text-[#D4A24C]" />
                  {r.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-600">{r.address}</p>
                {r.phone && <p className="mt-0.5 text-xs text-gray-500">{r.phone}</p>}
                {r.website && <p className="truncate text-xs text-gray-500">{r.website}</p>}
              </div>
              <button
                type="button"
                onClick={() => pickResult(r)}
                className="shrink-0 rounded-full bg-[#D4A24C] px-4 py-1.5 text-xs font-bold text-[#0F2A4A] hover:bg-[#e0b566]"
              >
                {results.length > 1 ? "This is my primary location" : "Yes, this is my business"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {results && results.length === 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-[#0F2A4A]">
            We couldn&rsquo;t find a business by that name in San Diego County. Want to add yours?
          </p>
          <button
            type="button"
            onClick={startManualClaim}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-6 py-2.5 text-sm font-bold text-[#0F2A4A] hover:bg-[#e0b566]"
          >
            <Building2 size={16} />
            Add my business
          </button>
        </div>
      )}

      {claimTarget && (
        <form onSubmit={onClaimSubmit} className="mt-6 border-t border-gray-200 pt-5">
          <h3 className="text-base font-bold text-[#0F2A4A]">Claim this listing</h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">Legal Business Name</label>
              <input className={`${inputClass} bg-gray-50`} value={claimTarget.name} readOnly />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">Address</label>
              <input className={`${inputClass} bg-gray-50`} value={claimTarget.address} readOnly />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">Business Category</label>
              <input className={`${inputClass} bg-gray-50`} value={selectedCategory} readOnly />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">Your Name</label>
              <input
                className={inputClass}
                value={ownerName}
                maxLength={120}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">Your Email</label>
              <input
                className={inputClass}
                type="email"
                value={ownerEmail}
                maxLength={255}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">Your Phone (optional)</label>
              <input
                className={inputClass}
                value={ownerPhone}
                maxLength={40}
                onChange={(e) => setOwnerPhone(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
                Anything we should know? (optional)
              </label>
              <textarea
                className={`${inputClass} min-h-20`}
                value={notes}
                maxLength={1000}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-[#0F2A4A]">
              <input
                type="checkbox"
                checked={wantsAiAudit}
                onChange={(e) => setWantsAiAudit(e.target.checked)}
              />
              Send me a free AI visibility audit for my business
            </label>
            <label className="flex items-center gap-2 text-sm text-[#0F2A4A]">
              <input
                type="checkbox"
                checked={wantsAdDesign}
                onChange={(e) => setWantsAdDesign(e.target.checked)}
              />
              I&rsquo;d like help designing my ad
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-7 py-3 text-sm font-bold text-[#0F2A4A] transition hover:bg-[#e0b566] disabled:opacity-60"
          >
            {submitting && <Loader2 className="animate-spin" size={16} />}
            Submit My Claim
          </button>
        </form>
      )}
    </section>
  );
}
