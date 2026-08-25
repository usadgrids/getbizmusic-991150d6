import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { MEMBERSHIP_CHECKBOX_TEXT } from "@/lib/membership-terms";
import { classifyCode } from "@/lib/code-classify.functions";
import {
  Loader2,
  Search,
  CheckCircle2,
  Building2,
  X,
  CreditCard,
  UserX,
  Gift,
  Palette,
  Link2,
  Tag,
  Star,
  MapPin,
  Check,
  ShieldCheck,
  Award,
  Users,
  Lock,
} from "lucide-react";
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

const DEFAULT_PRIORITY_CODE = "FIRST-1000";

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


const BENEFITS = [
  {
    color: "#E67E22",
    bg: "#FBF1EA",
    Icon: Search,
    title: "AI Visibility Audit",
    desc: "Discover how visible your business is across AI search engines.",
    valueTop: "$149.95 VALUE",
    valueBottom: "FREE",
    bullets: ["AI Citation Analysis", "Competitor Visibility Report", "Actionable Recommendations"],
    cta: "Claim your free AI audit",
  },
  {
    color: "#27AE60",
    bg: "#EAF6EE",
    Icon: Palette,
    title: "Free Professional Ad Design",
    desc: "Get a stunning, conversion-focused ad designed by our creative experts.",
    valueTop: "$199.95 VALUE",
    valueBottom: "FREE",
    bullets: ["Custom Ad Design", "High-Quality Graphics", "Ready for Print & Digital"],
    cta: "Get your free ad design",
  },
  {
    color: "#1E40AF",
    bg: "#E9EEF9",
    Icon: Link2,
    title: "Unique Knowledge Graph URL",
    desc: "Boost your AI visibility with a powerful Knowledge Graph optimized for AI engines.",
    valueTop: "$99.95 VALUE",
    valueBottom: "FREE",
    bullets: ["AI-Friendly Knowledge Graph", "Entity & Schema Optimization", "Citable Across AI Platforms"],
    cta: "Get your knowledge graph",
  },
  {
    color: "#D4A017",
    bg: "#FBF3DF",
    Icon: Tag,
    title: "Structured AI-Readable Listing",
    desc: "We create AI-readable, schema-rich listings that get you found by AI search engines.",
    valueTop: "$149.95 VALUE",
    valueBottom: "INCLUDED",
    bullets: ["LocalBusiness Schema", "Optimized Business Profile", "AI & SEO Ready"],
    cta: "Get AI-ready listing",
  },
  {
    color: "#8E44AD",
    bg: "#F3E9F7",
    Icon: Star,
    title: "Founding-Member Pricing Locked In",
    desc: "Lock in exclusive founding-member pricing before rates increase.",
    valueTop: "VIP PRICING",
    valueBottom: "LOCKED",
    bullets: ["Lowest Rates Guaranteed", "Priority Support", "Special Member Perks"],
    cta: "Lock in your VIP pricing",
  },
  {
    color: "#16A085",
    bg: "#E4F4F1",
    Icon: MapPin,
    title: "San Diego County Directory Placement",
    desc: "Get listed in our premium directory and be seen by local customers and AI search engines.",
    valueTop: "PREMIUM VISIBILITY",
    valueBottom: "BOOST",
    bullets: ["Featured Directory Placement", "Local SEO Boost", "Increased Local Visibility"],
    cta: "Get directory placement",
  },
] as const;

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

const PREP_STEPS = [
  "Scanning San Diego County businesses…",
  "Matching against Google's verified database…",
  "Building your AI Visibility profile…",
  "Preparing your membership benefits…",
] as const;

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
  const [launchCode, setLaunchCode] = useState("FIRST-1000");
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [foundingMember, setFoundingMember] = useState(false);

  const [searching, setSearching] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepStep, setPrepStep] = useState(0);
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
  // so the business name field is editable.
  const [manualClaim, setManualClaim] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>("physical");
  const addressIsPrivate = businessType !== "physical";
  const serviceAreaLabel = addressIsPrivate ? "Serves San Diego County" : null;

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done] = useState(false);

  // Cycle "preparing" status messages while the search animation runs.
  useEffect(() => {
    if (!preparing) return;
    const id = window.setInterval(() => {
      setPrepStep((s) => (s + 1 < PREP_STEPS.length ? s + 1 : s));
    }, 650);
    return () => window.clearInterval(id);
  }, [preparing]);

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
    setPreparing(true);
    setPrepStep(0);
    // Hold the "preparing" animation for a few seconds so visitors are primed
    // for the benefits page, regardless of how fast the Places API responds.
    const minDelay = new Promise<void>((r) => setTimeout(r, 2600));
    try {
      const [res] = await Promise.all([
        runSearch({ data: { businessName: businessName.trim() } }),
        minDelay,
      ]);
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
      setPreparing(false);
      setSearching(false);
    }
  }

  async function onClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimTarget) return;
    const priorityCode = launchCode.trim() || DEFAULT_PRIORITY_CODE;
    if (!launchCode.trim()) setLaunchCode(DEFAULT_PRIORITY_CODE);
    if (ownerName.trim().length < 2) return toast.error("Enter your name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail.trim())) return toast.error("Enter a valid email.");
    if (claimTarget.address.trim().length < 5)
      return toast.error("Enter your business address.");
    if (ownerPhone.trim().length < 7)
      return toast.error("Enter your business cell phone number.");
    if (priorityCode.length >= 2) {
      try {
        const kind = await classifyFn({ data: { code: priorityCode } });
        if (kind.kind === "activation") {
          return toast.error(
            "That looks like an Activation Code — try entering it in the “Already a GetBizMusic partner?” section below instead.",
          );
        }
      } catch {
        /* classification is advisory only */
      }
    }
    if (!termsAccepted)
      return toast.error("Please accept the membership Terms & Conditions to continue.");


    setSubmitting(true);
    try {
      const res = await runClaim({
        data: {
          businessName: claimTarget.name || businessName.trim(),
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
          wantsAiAudit: true,
          wantsAdDesign: true,
          sourceCategoryPage: category ? `/${category}` : "/sdcounty",
          launchCode: priorityCode,
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
      <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF6B4A]">
        Free · Takes 10 seconds
      </p>
      <h2 className="mt-1.5 text-center text-[19px] font-bold leading-snug text-[#0F2A4A] sm:text-[22px]">
        This search is completely free — takes 10 seconds, no card required. If your business is found, you&rsquo;ll see the membership benefits available to you.
      </h2>

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
        <div className="relative">
          {/* Ambient sonar rings — decorative only */}
          <span
            aria-hidden
            className="gbm-sonar-ring pointer-events-none absolute inset-0 rounded-[999px] border-[1.5px] border-[#1B7A8C]"
          />
          <span
            aria-hidden
            className="gbm-sonar-ring gbm-sonar-ring-2 pointer-events-none absolute inset-0 rounded-[999px] border-[1.5px] border-[#1B7A8C]"
          />
          <div className="relative flex h-[52px] items-center gap-1.5 rounded-[999px] border-[1.5px] border-[#0F2A4A]/20 bg-[#E8F1FB] pl-4 pr-1.5 shadow-[0_10px_28px_-14px_rgba(15,42,74,0.45)] transition focus-within:border-[#1B7A8C] focus-within:bg-white focus-within:shadow-[0_18px_44px_-14px_rgba(27,122,140,0.55)] focus-within:ring-4 focus-within:ring-[#1B7A8C]/15 sm:h-[60px] sm:pl-6 sm:pr-2">
            <input
              id="gbm-business-search"
              ref={businessNameRef}
              className="h-full w-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#0F2A4A] outline-none placeholder:text-[#0F2A4A]/40 sm:text-base"
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
              aria-label="Search"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#FF6B4A] px-4 text-[13px] font-bold uppercase tracking-[0.1em] text-white shadow-sm transition hover:bg-[#e85735] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2A4A] disabled:opacity-60 sm:h-11 sm:px-6 sm:text-sm"
            >
              {searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              <span>Search</span>
            </button>
          </div>

        </div>
        <p className="mt-2 text-center text-xs text-gray-500">
          We&rsquo;ll check Google&rsquo;s business database for San Diego County matches.
        </p>
      </form>

      {/* Reassurance strip */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl border border-[#D4A24C]/25 bg-[#FBF7EE] px-4 py-2.5 text-center">
        {[
          { Icon: CreditCard, text: "No credit card required" },
          { Icon: UserX, text: "No account needed" },
          { Icon: Gift, text: "ZERO RISK" },
        ].map(({ Icon, text }) => (
          <span
            key={text}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0F2A4A]/80"
          >
            <Icon size={13} aria-hidden className="text-[#1B7A8C]" />
            {text}
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
                <div
                  className="flex flex-col items-center gap-4 py-8 text-center"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div className="relative h-12 w-12">
                    <span
                      aria-hidden
                      className="gbm-sonar-ring pointer-events-none absolute inset-0 rounded-full border-2 border-[#1B7A8C]"
                    />
                    <span
                      aria-hidden
                      className="gbm-sonar-ring gbm-sonar-ring-2 pointer-events-none absolute inset-0 rounded-full border-2 border-[#D4A24C]"
                    />
                    <Loader2 className="absolute inset-0 m-auto animate-spin text-[#0F2A4A]" size={22} />
                  </div>
                  <p className="font-['Sora'] text-sm font-bold text-[#0F2A4A]">
                    {PREP_STEPS[prepStep]}
                  </p>
                  <ul className="grid w-full gap-2">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="animate-pulse rounded-xl border border-gray-200 px-4 py-4">
                        <div className="h-3.5 w-2/3 rounded bg-gray-200" />
                        <div className="mt-2 h-3 w-5/6 rounded bg-gray-100" />
                      </li>
                    ))}
                  </ul>
                </div>
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
          {/* Verified-partner benefits showcase — dark panel matching new graphic */}
          <div className="gbm-claim-enter relative overflow-hidden rounded-2xl bg-[#0F2A4A] p-4 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(212,162,76,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,76,0.7) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="relative">
              {/* Header bar — stylized centered layout */}
              <div className="flex flex-col items-center border-b border-white/10 pb-5 text-center">
                {/* Verified Partner badge flanked by gold lines */}
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#D4A24C]" />
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4A24C] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4A24C]">
                    <ShieldCheck size={13} aria-hidden /> Verified Partner
                  </span>
                  <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#D4A24C]" />
                </div>
                {/* Business name */}
                <p className="mt-3 font-['Sora'] text-2xl font-extrabold uppercase tracking-wide text-white sm:text-3xl">
                  {claimTarget.name || businessName.trim() || "Your business"}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D4A24C]">
                  Your Business Growth Partner
                </p>
                {/* Address with pin icon */}
                <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-medium text-white/80">
                  <MapPin size={14} className="text-[#D4A24C]" aria-hidden />
                  {claimTarget.address || "San Diego County, CA, USA"}
                </p>
                {/* Offer line */}
                <p className="mt-3 text-center text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
                  Get all these membership benefits and more for just{" "}
                  <span className="bg-gradient-to-r from-[#FFE100] to-[#D4A24C] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,225,0,0.45)]">
                    $49.95/year
                  </span>
                </p>
                {/* Not you? box */}
                <button
                  type="button"
                  onClick={searchAgain}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#D4A24C] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#D4A24C] transition hover:bg-[#D4A24C] hover:text-[#0F2A4A]"
                >
                  <Search size={13} aria-hidden /> Not you? Search again &rsaquo;
                </button>
              </div>

              {/* Benefit cards */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BENEFITS.map((b, i) => (
                  <div
                    key={b.title}
                    className="gbm-fade-up relative flex flex-col rounded-xl border border-[#0F2A4A]/10 p-4 shadow-sm"
                    style={{ backgroundColor: b.bg, animationDelay: `${i * 70}ms` }}
                  >
                    {/* Colored circular icon */}
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow"
                      style={{ backgroundColor: b.color }}
                    >
                      <b.Icon size={17} aria-hidden />
                    </span>
                    {/* Title */}
                    <p
                      className="mt-2.5 text-[12.5px] font-extrabold uppercase leading-tight tracking-[0.02em]"
                      style={{ color: b.color }}
                    >
                      {b.title}
                    </p>
                    {/* Value badge — black box, gold border */}
                    <span className="mt-2 inline-flex w-fit flex-col items-center rounded-md border border-[#D4A24C] bg-black px-2 py-1 text-center leading-none">
                      <span className="text-[7.5px] font-bold tracking-[0.12em] text-[#D4A24C]">
                        {b.valueTop}
                      </span>
                      <span className="mt-0.5 text-sm font-black tracking-wide text-[#FFE100]">
                        {b.valueBottom}
                      </span>
                    </span>
                    {/* Description */}
                    <p className="mt-2 text-[11.5px] leading-snug text-[#0F2A4A]/80">{b.desc}</p>
                    {/* Bullets */}
                    <ul className="mt-2 space-y-1">
                      {b.bullets.map((bul) => (
                        <li
                          key={bul}
                          className="flex items-start gap-1.5 text-[11px] font-medium text-[#0F2A4A]/85"
                        >
                          <Check
                            size={12}
                            className="mt-[1px] shrink-0"
                            style={{ color: b.color }}
                            aria-hidden
                          />
                          {bul}
                        </li>
                      ))}
                    </ul>
                    {/* CTA button */}
                    <span
                      className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-white shadow-sm"
                      style={{ backgroundColor: b.color }}
                    >
                      {b.cta} &rsaquo;
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer trust badges */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-[#D4A24C]/40 pt-4 sm:grid-cols-4">
                {[
                  { Icon: ShieldCheck, top: "Trusted across San Diego County", sub: "Growth • Visibility • Results" },
                  { Icon: Award, top: "5-star service", sub: "Rated by local members" },
                  { Icon: Users, top: "Local experts for your success", sub: "Dedicated support team" },
                  { Icon: Lock, top: "No hidden fees · No obligation", sub: "Just results" },
                ].map((f) => (
                  <div key={f.top} className="flex items-center gap-2">
                    <f.Icon size={18} className="shrink-0 text-[#D4A24C]" aria-hidden />
                    <div className="leading-tight">
                      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-white">
                        {f.top}
                      </p>
                      <p className="text-[9px] font-medium uppercase tracking-[0.04em] text-white/60">
                        {f.sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {manualClaim && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
                  Business Name <span className="text-[#D4A24C]">*</span>
                </label>
                <input
                  className={inputClass}
                  value={claimTarget.name}
                  maxLength={120}
                  required
                  onChange={(e) => setClaimTarget({ ...claimTarget, name: e.target.value })}
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
                Business Address <span className="text-[#D4A24C]">*</span>
              </label>
              <input
                className={inputClass}
                value={claimTarget.address}
                maxLength={200}
                required
                placeholder="Street address, city, state, ZIP"
                onChange={(e) => setClaimTarget({ ...claimTarget, address: e.target.value })}
              />
              <label className="mt-2 flex items-start gap-2 text-xs text-[#0F2A4A]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={addressIsPrivate}
                  onChange={(e) => setBusinessType(e.target.checked ? "home_based" : "physical")}
                />
                <span>
                  Home-based or mobile — keep my address private and show{" "}
                  <strong>Serves San Diego County</strong> publicly.
                </span>
              </label>
            </div>
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
                Business Owner Name <span className="text-[#D4A24C]">*</span>
              </label>
              <input
                className={inputClass}
                value={ownerName}
                maxLength={120}
                required
                autoComplete="name"
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
                Business Email <span className="text-[#D4A24C]">*</span>
              </label>
              <input
                className={inputClass}
                type="email"
                value={ownerEmail}
                maxLength={255}
                required
                autoComplete="email"
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]">
                Business Cell Phone Number <span className="text-[#D4A24C]">*</span>
              </label>
              <input
                className={inputClass}
                type="tel"
                value={ownerPhone}
                maxLength={40}
                required
                autoComplete="tel"
                placeholder="(619) 555-0123"
                onChange={(e) => setOwnerPhone(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="gbm-priority-code"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F2A4A]"
              >
                Priority Access Code <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="gbm-priority-code"
                className={inputClass}
                value={launchCode}
                maxLength={60}
                onChange={(e) => setLaunchCode(e.target.value.toUpperCase())}
                onFocus={() => {
                  if (!launchCode.trim()) setLaunchCode(DEFAULT_PRIORITY_CODE);
                }}
                placeholder={DEFAULT_PRIORITY_CODE}
              />
              {launchMessage && (
                <p className="mt-1 text-xs font-medium text-[#7a5410]">{launchMessage}</p>
              )}
            </div>
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
            </ul>
            <p className="mt-2 text-xs text-[#7a5410]/80">Pricing subject to change without notice.</p>
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
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-[#0F2A4A] transition hover:bg-[#e0b566] disabled:opacity-60 sm:w-auto"
          >
            {submitting && <Loader2 className="animate-spin" size={16} />}
            Continue to Payment — $49.95
          </button>
        </form>
      )}

    </section>
  );
}
