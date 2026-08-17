import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { searchBusinesses } from "@/lib/places.functions";
import { submitBusinessClaim } from "@/lib/claims.functions";
import { AdMarquee } from "@/components/biz/AdMarquee";
import {
  BUSINESS_CATEGORY_GROUPS,
  DEFAULT_BUSINESS_CATEGORY,
} from "@/lib/business-categories";
import { AI_AUDIT_TERMS, AI_AUDIT_TERMS_TITLE } from "@/lib/ai-audit-terms";
import type { DirectoryCategory } from "@/lib/directory-categories";

/** Grouped <optgroup> dropdown shared by the found-on-Google and manual flows. */
function CategorySelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
}) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {BUSINESS_CATEGORY_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

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

const BUSINESS_TYPES = [
  { value: "physical", label: "Physical storefront/office — public address" },
  {
    value: "home_based",
    label: "Home-based — I work from home, prefer not to show my home address publicly",
  },
  {
    value: "mobile",
    label: "Mobile/service-area business — I travel to clients, no fixed location",
  },
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#0F2A4A] outline-none focus:border-[#D4A24C]";


/**
 * Reusable "find & claim your business" widget for Knowledge Graph category
 * pages. Drop it on /food, /beauty or any future category page — the dropdown
 * options and stored source page follow the `category` prop.
 */
export function BusinessClaimSearch({ category }: { category?: DirectoryCategory }) {
  const runSearch = useServerFn(searchBusinesses);
  const runClaim = useServerFn(submitBusinessClaim);

  const [termsOpen, setTermsOpen] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [zip, setZip] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_BUSINESS_CATEGORY);
  // Seeded after mount so SSR and client markup match (Math.random differs).
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  useEffect(() => setCaptcha(newCaptcha()), []);
  const [captchaInput, setCaptchaInput] = useState("");
  const [launchCode, setLaunchCode] = useState("");
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [foundingMember, setFoundingMember] = useState(false);

  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  // Once a search has been submitted, disable the marquee hover overlay so it
  // stops bothering users who are already reviewing results.
  const [searched, setSearched] = useState(false);

  const [claimTarget, setClaimTarget] = useState<PlaceResult | null>(null);
  // When true, the claim form was reached via "add yours" (no matching Place),
  // so the address field is editable and pre-filled only with the business name.
  const [manualClaim, setManualClaim] = useState(false);
  // Public-facing DBA name; optional. When set it is what visitors see.
  const [tradeName, setTradeName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("physical");
  const addressIsPrivate = businessType !== "physical";
  const [serviceAreaChoice, setServiceAreaChoice] = useState("Serves San Diego County");
  const [serviceAreaCustom, setServiceAreaCustom] = useState("");
  const serviceAreaLabel = !addressIsPrivate
    ? null
    : serviceAreaChoice === "city"
      ? serviceAreaCustom.trim()
        ? `Serves ${serviceAreaCustom.trim()}`
        : ""
      : serviceAreaChoice === "custom"
        ? serviceAreaCustom.trim()
        : serviceAreaChoice;

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [wantsAiAudit, setWantsAiAudit] = useState(true);
  const [wantsAdDesign, setWantsAdDesign] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Legal Business Name input — auto-focused after a user views a sample ad so
  // they drop straight into the claim flow with a "Start Here" cue.
  const businessNameRef = useRef<HTMLInputElement | null>(null);
  const [showStartHere, setShowStartHere] = useState(false);
  const startHereTimer = useRef<number | null>(null);

  function triggerStartHere() {
    if (done) return;
    businessNameRef.current?.focus();
    setShowStartHere(true);
    if (startHereTimer.current) window.clearTimeout(startHereTimer.current);
    startHereTimer.current = window.setTimeout(() => setShowStartHere(false), 4000);
  }

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
    if (launchCode.trim().length < 2) return toast.error("Enter your launch code.");
    if (Number(captchaInput) !== captcha.a + captcha.b) {
      setCaptcha(newCaptcha());
      setCaptchaInput("");
      return toast.error("Captcha answer was incorrect.");
    }

    setSearching(true);
    setSearched(true);
    setMessage(null);
    setResults(null);
    setClaimTarget(null);
    setManualClaim(false);
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
    if (claimTarget.address.trim().length < 5)
      return toast.error("Enter your business address.");
    if (addressIsPrivate && !serviceAreaLabel)
      return toast.error("Choose the service area shown publicly.");

    setSubmitting(true);
    try {
      const res = await runClaim({
        data: {
          businessName: claimTarget.name || businessName.trim(),
          tradeName: tradeName.trim() || undefined,
          businessCategory: selectedCategory,
          address: claimTarget.address.trim(),
          businessType,
          addressIsPrivate,
          serviceAreaLabel: serviceAreaLabel || undefined,
          website: claimTarget.website,
          phone: claimTarget.phone,
          googlePlaceId: claimTarget.placeId,

          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerPhone: ownerPhone.trim() || undefined,
          wantsAiAudit,
          wantsAdDesign,
          notes: notes.trim() || undefined,
          sourceCategoryPage: category ? `/${category}` : "/sdcounty",
          launchCode: launchCode.trim() || undefined,
        },
      });
      if (!res.ok) {
        setLaunchMessage(null);
        return toast.error(res.error);
      }
      if (res.launchMessage) {
        setLaunchMessage(res.launchMessage);
        setFoundingMember(false);
      } else {
        setLaunchMessage(null);
        setFoundingMember(Boolean(res.launchApplied));
      }
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
        <p className="mt-4 text-sm font-medium text-[#0F2A4A]">
          Explore our full ad and music streaming platform now at{" "}
          <a
            href="https://www.getbizmusic.com/sdcounty"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#0F2A4A] underline decoration-[#D4A24C] decoration-2 underline-offset-2 hover:text-[#D4A24C]"
          >
            www.getbizmusic.com/sdcounty
          </a>
        </p>
        {foundingMember && (
          <p className="mx-auto mt-4 max-w-md rounded-xl border border-[#D4A24C] bg-[#FFF8E8] px-4 py-3 text-sm font-semibold text-[#7a5410]">
            🎉 Launch code applied — you&rsquo;re a Founding 1,000 Member. Your $49.95/year
            membership price is locked in permanently and your claim is at the front of our queue.
          </p>
        )}
        {launchMessage && (
          <p className="mx-auto mt-4 max-w-md rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {launchMessage}
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Claim your business listing"
      className="mx-auto mt-8 w-full max-w-3xl rounded-2xl bg-white px-5 py-6 shadow-sm sm:px-8"
    >
      <p className="text-[13px] font-medium leading-relaxed text-[#0F2A4A]/80 sm:text-sm">
        <span className="font-semibold text-[#0F2A4A]">
          Brick & Mortar Businesses, Independent Agencies, Mobile Businesses, Business
          Opportunities, and Home-Based Businesses
        </span>{" "}
        are all welcome.
      </p>
      <h2 className="mt-2 text-lg font-bold text-[#0F2A4A]">Find & Claim Your Business</h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        Search for your business, then claim your Knowledge Graph listing so AI answer engines cite
        you correctly. Get a{" "}
        <span className="rounded bg-[#FFF8E8] px-1 font-semibold text-[#7a5410] ring-1 ring-[#D4A24C]/40">
          free AI Visibility Audit
        </span>{" "}
        and a{" "}
        <span className="rounded bg-[#FFF8E8] px-1 font-semibold text-[#7a5410] ring-1 ring-[#D4A24C]/40">
          free professionally designed ad
        </span>{" "}
        — no cost to see what&rsquo;s possible for your business.{" "}
        <button
          type="button"
          onClick={() => setTermsOpen(true)}
          className="text-xs text-[#B08C46] underline underline-offset-2 hover:text-[#8a6d33]"
        >
          (Terms & Conditions apply)
        </button>
      </p>

      {termsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={AI_AUDIT_TERMS_TITLE}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setTermsOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#0F2A4A]">{AI_AUDIT_TERMS_TITLE}</h3>
            <ol className="mt-4 space-y-4 text-xs leading-relaxed text-gray-700">
              {AI_AUDIT_TERMS.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-bold text-[#D4A24C]">{i + 1}.</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setTermsOpen(false)}
              className="mt-5 rounded-full bg-[#0F2A4A] px-5 py-2 text-sm font-bold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSearch} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <label className="block text-xs font-semibold text-[#0F2A4A]">
              Legal Business Name <span className="text-[#D4A24C]">*</span>
            </label>
            {showStartHere && (
              <span className="gbm-start-here-badge inline-flex items-center gap-1 rounded-full bg-[#D4A24C] px-2.5 py-0.5 text-[11px] font-bold text-[#0F2A4A] shadow-sm">
                Start Here
                <span aria-hidden>↓</span>
              </span>
            )}
          </div>
          <input
            ref={businessNameRef}
            className={inputClass}
            value={businessName}
            maxLength={120}
            required
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Maria's Kitchen LLC"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
            Zip Code <span className="text-[#D4A24C]">*</span>
          </label>
          <input
            className={inputClass}
            value={zip}
            inputMode="numeric"
            maxLength={5}
            required
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="92101"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
            Business Category <span className="text-[#D4A24C]">*</span>
          </label>
          <CategorySelect
            className={inputClass}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#0F2A4A]">
            <span aria-hidden>🎟️</span>
            Priority Access Code <span className="text-[#D4A24C]">*</span>
          </label>
          <input
            className={inputClass}
            value={launchCode}
            maxLength={40}
            required
            onChange={(e) => setLaunchCode(e.target.value.toUpperCase())}
            placeholder="1000-FIRST"
          />
          <p className="mt-1 text-xs font-medium text-[#0F2A4A]/70">
            New to GetBizMusic? This code locks in your founding-member pricing and priority
            processing.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            🎉 Reserved for our first 1,000 San Diego County businesses. This code may be
            deactivated at any time once that milestone is reached.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
            Quick check: {captcha.a} + {captcha.b} = ? <span className="text-[#D4A24C]">*</span>
          </label>
          <input
            className={inputClass}
            value={captchaInput}
            inputMode="numeric"
            maxLength={3}
            required
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

      {/* Crawling sample-ad marquee — hover an image for the free design offer */}
      <AdMarquee disabled={searched} onHoverDismiss={triggerStartHere} />

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

      {results && results.length > 0 && !claimTarget && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-center">
          <p className="text-sm font-semibold text-[#0F2A4A]">Don&rsquo;t see your business here?</p>
          <p className="mt-1 text-xs text-gray-600">
            If none of these match, you can add your business manually and we&rsquo;ll build your
            listing from scratch.
          </p>
          <button
            type="button"
            onClick={startManualClaim}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-[#0F2A4A] bg-white px-6 py-2.5 text-sm font-bold text-[#0F2A4A] hover:bg-[#0F2A4A] hover:text-white"
          >
            <Building2 size={16} />
            None of these are my business — Add it manually
          </button>
        </div>
      )}

      {claimTarget && (
        <form onSubmit={onClaimSubmit} className="mt-6 border-t border-gray-200 pt-5">
          <h3 className="text-base font-bold text-[#0F2A4A]">
            {manualClaim ? "Add your business" : "Claim this listing"}
          </h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
                Legal Business Name <span className="text-[#D4A24C]">*</span>
              </label>
              <input
                className={inputClass}
                value={claimTarget.name}
                readOnly={!manualClaim}
                maxLength={120}
                required
                onChange={
                  manualClaim
                    ? (e) => setClaimTarget({ ...claimTarget, name: e.target.value })
                    : undefined
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
                Trade Name / DBA <span className="text-gray-400">(optional)</span>
              </label>
              <input
                className={inputClass}
                value={tradeName}
                maxLength={120}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="e.g. Maria's Kitchen"
              />
              <p className="mt-1 text-xs text-gray-500">
                Only fill this in if you operate under a different name than your legal business
                name. If provided, this is the name shown publicly on your listing.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
                Business Type <span className="text-[#D4A24C]">*</span>
              </label>
              <div className="space-y-1.5 rounded-lg border border-gray-300 px-3 py-2">
                {BUSINESS_TYPES.map((t) => (
                  <label key={t.value} className="flex items-start gap-2 text-xs text-[#0F2A4A]">
                    <input
                      type="radio"
                      className="mt-0.5"
                      name="business-type"
                      value={t.value}
                      checked={businessType === t.value}
                      onChange={() => setBusinessType(t.value)}
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
                {addressIsPrivate
                  ? "Business Address (Private — used for verification and billing only, never displayed publicly)"
                  : "Business Address"}{" "}
                <span className="text-[#D4A24C]">*</span>
              </label>
              <input
                className={inputClass}
                value={claimTarget.address}
                maxLength={200}
                required
                placeholder="Street address, city, state, ZIP"
                onChange={(e) => setClaimTarget({ ...claimTarget, address: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                {addressIsPrivate
                  ? "Your address stays private. Your service area below is what shows publicly."
                  : "This address will be displayed publicly on your listing."}
              </p>
            </div>
            {addressIsPrivate && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
                  Service Area (shown publicly) <span className="text-[#D4A24C]">*</span>
                </label>
                <select
                  className={inputClass}
                  value={serviceAreaChoice}
                  onChange={(e) => setServiceAreaChoice(e.target.value)}
                >
                  <option value="city">Serves a specific city</option>
                  <option value="Serves San Diego County">Serves San Diego County</option>
                  <option value="Serves Southern California">Serves Southern California</option>
                  <option value="Serves the entire State of California">
                    Serves the entire State of California
                  </option>
                  <option value="custom">Custom</option>
                </select>
                {(serviceAreaChoice === "city" || serviceAreaChoice === "custom") && (
                  <input
                    className={`${inputClass} mt-2`}
                    value={serviceAreaCustom}
                    maxLength={120}
                    required
                    placeholder={
                      serviceAreaChoice === "city"
                        ? "City name (e.g. Chula Vista)"
                        : "Describe your service area"
                    }
                    onChange={(e) => setServiceAreaCustom(e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
                Business Category <span className="text-[#D4A24C]">*</span>
              </label>
              <CategorySelect
                className={inputClass}
                value={selectedCategory}
                onChange={setSelectedCategory}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
                Your Name <span className="text-[#D4A24C]">*</span>
              </label>
              <input
                className={inputClass}
                value={ownerName}
                maxLength={120}
                required
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F2A4A]">
                Your Email <span className="text-[#D4A24C]">*</span>
              </label>
              <input
                className={inputClass}
                type="email"
                value={ownerEmail}
                maxLength={255}
                required
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

          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-2 text-sm text-[#0F2A4A]">
              <input
                type="checkbox"
                className="mt-1"
                checked={wantsAiAudit}
                onChange={(e) => setWantsAiAudit(e.target.checked)}
              />
              <span>
                <span className="font-semibold">
                  (Recommended) Get my FREE AI Visibility Audit Report for{" "}
                  {claimTarget.name || businessName.trim() || "my business"}
                </span>
                <span className="mt-0.5 block text-xs text-gray-600">
                  See exactly how AI answer engines currently see (or don&rsquo;t see) your business.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[#0F2A4A]">
              <input
                type="checkbox"
                className="mt-1"
                checked={wantsAdDesign}
                onChange={(e) => setWantsAdDesign(e.target.checked)}
              />
              <span>
                <span className="font-semibold">
                  Get my FREE Professional Ad Design for{" "}
                  {claimTarget.name || businessName.trim() || "my business"}
                </span>
                <span className="mt-0.5 block text-xs text-gray-600">
                  A custom graphic ad, designed for you to preview and approve — no obligation.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-[#D4A24C]/50 bg-[#FFF8E8] px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#7a5410]">
              What happens next
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#7a5410]">
              We&rsquo;ll prepare your free AI Visibility Audit and/or ad design within 3–5 business
              days. You&rsquo;ll get to review and approve your ad design completely free — no cost,
              no obligation. Your AI Visibility Audit and professional ad design normally run{" "}
              <span className="font-semibold text-gray-400 line-through">$149.95</span>{" "}
              <span className="font-semibold text-[#0F2A4A]">— but as one of our by-invitation local
              businesses, you get full AI Business Alliance Membership, including publishing and AI
              Answer Engine optimization, for just $49.95/year.</span> Pricing subject to change
              without notice.
            </p>
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
