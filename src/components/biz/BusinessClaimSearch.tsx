import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { MEMBERSHIP_CHECKBOX_TEXT } from "@/lib/membership-terms";
import { classifyCode } from "@/lib/code-classify.functions";
import { Loader2, Search, CheckCircle2, Building2, X } from "lucide-react";
import { categoryFromGoogleTypes, googleTypeBadge } from "@/lib/google-type-map";

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
  types?: string[];
  postalCode?: string;
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
  "w-full rounded-lg border border-[#0F2A4A]/25 bg-[#F4F7FB] px-3 py-2 text-sm font-medium text-[#0F2A4A] shadow-sm outline-none transition focus:border-[#D4A24C] focus:bg-white focus:ring-2 focus:ring-[#D4A24C]/40";


/**
 * Reusable "find & claim your business" widget for Knowledge Graph category
 * pages. Drop it on /food, /beauty or any future category page — the dropdown
 * options and stored source page follow the `category` prop.
 */
export function BusinessClaimSearch({ category }: { category?: DirectoryCategory }) {
  const runSearch = useServerFn(searchBusinesses);
  const runClaim = useServerFn(submitBusinessClaim);
  const navigate = useNavigate();
  const classifyFn = useServerFn(classifyCode);


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
  // Results dialog + the inline "enter it manually" panel inside it.
  const [modalOpen, setModalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

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
  const [termsAccepted, setTermsAccepted] = useState(false);
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
      address: zip.trim() ? `San Diego County, CA ${zip.trim()}` : "",
      website: undefined,
      phone: undefined,
    });
    setManualClaim(true);
    setModalOpen(false);
  }

  function pickResult(r: PlaceResult) {
    setClaimTarget(r);
    setManualClaim(false);
    setSelectedCategory(categoryFromGoogleTypes(r.types));
    if (r.postalCode) setZip(r.postalCode);
    setModalOpen(false);
  }

  function searchAgain() {
    setClaimTarget(null);
    setManualClaim(false);
    setResults(null);
    setModalOpen(true);
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (businessName.trim().length < 2) return toast.error("Enter your business name.");

    setSearching(true);
    setSearched(true);
    setModalOpen(true);
    setManualOpen(false);
    setMessage(null);
    setResults(null);
    setClaimTarget(null);
    setManualClaim(false);
    try {
      const res = await runSearch({ data: { businessName: businessName.trim() } });
      if (!res.served) {
        setMessage(res.message);
        setResults([]);
      } else {
        setMessage(null);
        setResults(res.results.slice(0, 5));
      }
    } catch {
      toast.error("Search failed. Please try again.");
      setResults([]);
    } finally {
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
    if (launchCode.trim().length < 2) return toast.error("Enter your Priority Access Code.");
    try {
      const kind = await classifyFn({ data: { code: launchCode.trim() } });
      if (kind.kind === "activation") {
        return toast.error(
          "That looks like an Activation Code — try entering it in the “Already a GetBizMusic partner?” section below instead.",
        );
      }
    } catch {
      /* classification is advisory only */
    }
    if (Number(captchaInput) !== captcha.a + captcha.b) {
      setCaptcha(newCaptcha());
      setCaptchaInput("");
      return toast.error("Captcha answer was incorrect.");
    }
    if (!termsAccepted)
      return toast.error("Please accept the membership Terms & Conditions to continue.");


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
      // Pay-first flow: hand the visitor straight to checkout with their
      // details pre-filled instead of showing a "we got your claim" screen.
      void navigate({
        to: "/quick-pay",
        search: {
          business: claimTarget.name || businessName.trim(),
          owner: ownerName.trim(),
          email: ownerEmail.trim(),
          phone: ownerPhone.trim() || undefined,
        },
      });
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
            🎉 Priority Access Code applied — you&rsquo;re a Founding 1,000 Member. Your $49.95/year
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
      className="mx-auto mt-8 w-full max-w-3xl min-w-0 overflow-hidden rounded-2xl bg-white px-4 py-6 shadow-sm sm:px-8"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          "Brick & Mortar Stores",
          "Independent Agencies",
          "Mobile Businesses",
          "Business Opportunities",
          "Home-Based Businesses",
        ].map((label) => (
          <span
            key={label}
            className="font-['Sora'] inline-flex items-center rounded-full border border-[#D4A24C]/50 bg-[#FFF8E8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A4A] shadow-sm"
          >
            {label}
          </span>
        ))}
        <span className="font-['Sora'] text-[11px] font-bold uppercase tracking-[0.22em] text-[#B08C46]">
          — All Welcome
        </span>
      </div>
      <h2 className="mt-5 text-[15px] leading-[1.6] sm:text-base sm:leading-snug font-bold text-[#0F2A4A] [&_span.rounded]:box-decoration-clone [&_span.rounded]:py-[2px]">
        Of San Diego County&rsquo;s{" "}
        <span className="rounded bg-[#FFF8E8] px-1 font-semibold text-[#7a5410] ring-1 ring-[#D4A24C]/40">
          380,000+ businesses
        </span>
        , only a small percentage are cited by ChatGPT and other AI engines. Is{" "}
        <span className="text-[#7a5410] font-semibold">YOUR</span> business one of them?
      </h2>
      <p className="mt-4 text-[13.5px] leading-[1.75] sm:text-sm sm:leading-relaxed text-gray-600 whitespace-pre-line [&_span.rounded]:box-decoration-clone [&_span.rounded]:py-[2px]">
        <span className="font-semibold text-[#0F2A4A]">Make Your Business AI Citation-Ready</span>
        {"\n"}Type your business name to{" "}
        <span className="rounded bg-[#FFF8E8] px-1 font-semibold text-[#7a5410] ring-1 ring-[#D4A24C]/40">
          claim your AI Knowledge Graph Listing
        </span>{" "}
        and ensure AI answer engines cite you accurately. Get a{" "}
        <span className="rounded bg-[#FFF8E8] px-1 font-semibold text-[#7a5410] ring-1 ring-[#D4A24C]/40">
          Free AI Visibility Audit + Custom Sample Ad
        </span>
        . 100% free.
      </p>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setTermsOpen(true)}
          className="inline-flex items-center rounded-full bg-[#0F2A4A] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#D4A24C] ring-1 ring-[#D4A24C]/60 shadow-sm hover:bg-[#163864] hover:text-white"
        >
          TERMS & CONDITIONS APPLY
        </button>
      </div>

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

      {/* Single pill search bar — the only field before results */}
      <form onSubmit={onSearch} className="mt-5">
        {showStartHere && (
          <div className="mb-2 flex justify-center">
            <span className="gbm-start-here-badge inline-flex items-center gap-1 rounded-full bg-[#D4A24C] px-2.5 py-0.5 text-[11px] font-bold text-[#0F2A4A] shadow-sm">
              Start Here
              <span aria-hidden>↓</span>
            </span>
          </div>
        )}
        <label htmlFor="gbm-business-search" className="sr-only">
          Business name
        </label>
        <div className="flex flex-col gap-2 rounded-[999px] border border-[#0F2A4A]/20 bg-white p-2 shadow-[0_10px_28px_-14px_rgba(15,42,74,0.45)] transition focus-within:border-[#D4A24C] focus-within:shadow-[0_18px_40px_-14px_rgba(15,42,74,0.55)] sm:flex-row sm:items-center">
          <input
            id="gbm-business-search"
            ref={businessNameRef}
            className="min-h-[48px] w-full min-w-0 flex-1 rounded-full bg-transparent px-5 text-base font-medium text-[#0F2A4A] outline-none placeholder:text-[#0F2A4A]/40"
            value={businessName}
            maxLength={120}
            required
            autoComplete="organization"
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Enter your business name"
          />
          <button
            type="submit"
            disabled={searching}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#0F2A4A] px-7 text-sm font-bold uppercase tracking-[0.12em] text-[#D4A24C] transition hover:bg-[#153a66] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A24C] disabled:opacity-60 sm:w-auto"
          >
            {searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-gray-500">
          We&rsquo;ll check Google&rsquo;s business database for San Diego County matches.
        </p>
      </form>

      {/* Reassurance strip */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl border border-[#D4A24C]/25 bg-[#FBF7EE] px-4 py-2.5 text-center">
        {[
          { icon: "💳", text: "No credit card required" },
          { icon: "👤", text: "No account needed" },
          { icon: "🎁", text: "100% free" },
        ].map((item) => (
          <span
            key={item.text}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0F2A4A]/80"
          >
            <span aria-hidden>{item.icon}</span>
            {item.text}
          </span>
        ))}
      </div>

      {/* Crawling sample-ad marquee — hover an image for the free design offer */}
      <AdMarquee disabled={searched} onHoverDismiss={triggerStartHere} />

      {/* Results dialog */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0F2A4A]/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search results"
            onClick={(e) => e.stopPropagation()}
            className="flex h-[100dvh] w-full flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-xl sm:rounded-[28px]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#0F2A4A]">Is your business one of these?</h3>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  Results for &ldquo;{businessName.trim()}&rdquo; in San Diego County
                </p>
              </div>
              <button
                type="button"
                aria-label="Close search results"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-[#0F2A4A]/60 transition hover:bg-gray-100 hover:text-[#0F2A4A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A24C]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {searching && (
                <ul className="grid gap-2" aria-live="polite" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="animate-pulse rounded-xl border border-gray-200 px-4 py-4">
                      <div className="h-3.5 w-2/3 rounded bg-gray-200" />
                      <div className="mt-2 h-3 w-5/6 rounded bg-gray-100" />
                    </li>
                  ))}
                </ul>
              )}

              {!searching && message && (
                <p className="rounded-lg border border-[#D4A24C]/50 bg-[#FFF8E8] px-4 py-3 text-sm font-medium text-[#7a5410]">
                  {message}
                </p>
              )}

              {!searching && results && results.length > 0 && (
                <ul className="grid gap-2">
                  {results.map((r) => {
                    const badge = googleTypeBadge(r.types);
                    return (
                      <li key={r.placeId || r.name}>
                        <button
                          type="button"
                          onClick={() => pickResult(r)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-[#D4A24C] hover:bg-[#FFFBF2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A24C]"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-[#0F2A4A]">
                            <Building2 size={14} className="shrink-0 text-[#D4A24C]" />
                            {r.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-600">{r.address}</span>
                          {badge && (
                            <span className="mt-1.5 inline-flex items-center rounded-full bg-[#FFF8E8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7a5410] ring-1 ring-[#D4A24C]/40">
                              {badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!searching && results && results.length === 0 && !message && (
                <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm font-semibold text-[#0F2A4A]">
                  We couldn&rsquo;t find a match for &ldquo;{businessName.trim()}&rdquo; in San Diego
                  County. Enter your business manually below.
                </p>
              )}

              {/* Always-available manual path */}
              {!searching && (
                <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
                  {!manualOpen && results && results.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setManualOpen(true)}
                      className="text-sm font-semibold text-[#0F2A4A] underline decoration-[#D4A24C] decoration-2 underline-offset-4 hover:text-[#7a5410] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A24C]"
                    >
                      Don&rsquo;t see your business? Enter it manually
                    </button>
                  )}

                  {(manualOpen || (results && results.length === 0)) && (
                    <div className="grid gap-3">
                      <div>
                        <label
                          htmlFor="gbm-manual-name"
                          className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]"
                        >
                          Legal Business Name <span className="text-[#D4A24C]">*</span>
                        </label>
                        <input
                          id="gbm-manual-name"
                          className={inputClass}
                          value={businessName}
                          maxLength={120}
                          onChange={(e) => setBusinessName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="gbm-manual-zip"
                          className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]"
                        >
                          Zip Code <span className="text-[#D4A24C]">*</span>
                        </label>
                        <input
                          id="gbm-manual-zip"
                          className={inputClass}
                          value={zip}
                          inputMode="numeric"
                          maxLength={5}
                          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                          placeholder="92101 ( San Diego County, CA only )"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
                          Business Category <span className="text-[#D4A24C]">*</span>
                        </label>
                        <CategorySelect
                          className={inputClass}
                          value={selectedCategory}
                          onChange={setSelectedCategory}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (businessName.trim().length < 2)
                            return toast.error("Enter your legal business name.");
                          if (!/^\d{5}$/.test(zip.trim()))
                            return toast.error("Enter a 5-digit ZIP code.");
                          startManualClaim();
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-6 py-2.5 text-sm font-bold text-[#0F2A4A] transition hover:bg-[#e0b566] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2A4A]"
                      >
                        <Building2 size={16} />
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {claimTarget && (
        <form onSubmit={onClaimSubmit} className="mt-6 border-t border-gray-200 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#0F2A4A]">
              {manualClaim ? "Add your business" : "Claim this listing"}
            </h3>
            <button
              type="button"
              onClick={searchAgain}
              className="text-xs font-semibold text-[#0F2A4A]/70 underline underline-offset-4 hover:text-[#7a5410]"
            >
              Not you? Search again
            </button>
          </div>
          {!manualClaim && (
            <p className="mt-1 text-xs text-gray-600">
              <CheckCircle2 size={12} className="mr-1 inline text-emerald-600" />
              {claimTarget.name} — {claimTarget.address}
            </p>
          )}



          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
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
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
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
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
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
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
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
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
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
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
                Business Category <span className="text-[#D4A24C]">*</span>
              </label>
              <CategorySelect
                className={inputClass}
                value={selectedCategory}
                onChange={setSelectedCategory}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
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
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
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
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">Your Phone (optional)</label>
              <input
                className={inputClass}
                value={ownerPhone}
                maxLength={40}
                onChange={(e) => setOwnerPhone(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
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
              Membership &amp; Terms
            </p>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[#7a5410]">
              <li>
                <span className="font-bold text-[#0F2A4A]">$49.95 — One Time Annual:</span> No
                recurring charges and no subscription. Your membership does not auto-renew.
              </li>
              <li>
                <span className="font-bold text-[#0F2A4A]">Manual Renewal:</span> If you wish to
                renew, you&rsquo;ll receive an email reminder 30 days before your annual expiration.
              </li>
              <li>
                <span className="font-bold text-[#0F2A4A]">No Refunds:</span> Once we optimize and
                publish your business to AI answer engines, the service has been rendered and cannot
                be un-optimized — all fees are non-refundable.
              </li>
              <li>
                <span className="font-bold text-[#0F2A4A]">Unbeatable Value:</span> Full AI Answer
                Engine optimization and publishing (normally{" "}
                <span className="font-semibold text-gray-400 line-through">$149.95</span>) for just{" "}
                <span className="font-semibold text-[#0F2A4A]">$49.95/year</span>.
              </li>
            </ul>
            <p className="mt-2 text-xs text-[#7a5410]/80">
              Pricing subject to change without notice.
            </p>
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm text-[#0F2A4A]">
            <input
              type="checkbox"
              className="mt-1"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              {MEMBERSHIP_CHECKBOX_TEXT}{" "}
              <a
                href="/terms/membership"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-[#D4A24C] decoration-2 underline-offset-2"
              >
                (Full Terms &amp; Conditions)
              </a>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || !termsAccepted}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-7 py-3 text-sm font-bold uppercase tracking-wide text-[#0F2A4A] transition hover:bg-[#e0b566] disabled:opacity-60"
          >
            {submitting && <Loader2 className="animate-spin" size={16} />}
            Pay Now $49.95
          </button>

        </form>
      )}
    </section>
  );
}
