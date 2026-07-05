import { useEffect, useState } from "react";

export type ConsentCategories = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

export type ConsentRecord = {
  version: 1;
  categories: ConsentCategories;
  timestamp: string; // ISO
  method: "accept_all" | "reject_all" | "custom";
  userAgent: string;
};

const STORAGE_KEY = "gbm_cookie_consent_v1";
const EVENT_NAME = "gbm:consent-change";

export function getConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

export function hasConsent(cat: keyof ConsentCategories): boolean {
  const c = getConsent();
  if (!c) return cat === "necessary";
  return Boolean(c.categories[cat]);
}

export function saveConsent(
  categories: Omit<ConsentCategories, "necessary"> & { necessary?: true },
  method: ConsentRecord["method"],
): ConsentRecord {
  const record: ConsentRecord = {
    version: 1,
    categories: {
      necessary: true,
      analytics: !!categories.analytics,
      marketing: !!categories.marketing,
      preferences: !!categories.preferences,
    },
    timestamp: new Date().toISOString(),
    method,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: record }));
  } catch {}
  return record;
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("gbm:open-cookie-preferences"));
}

export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => {
    setMounted(true);
    const existing = getConsent();
    if (!existing) {
      setVisible(true);
    } else {
      setAnalytics(existing.categories.analytics);
      setMarketing(existing.categories.marketing);
      setPreferences(existing.categories.preferences);
    }
    const onOpen = () => {
      const c = getConsent();
      if (c) {
        setAnalytics(c.categories.analytics);
        setMarketing(c.categories.marketing);
        setPreferences(c.categories.preferences);
      }
      setShowPrefs(true);
      setVisible(true);
    };
    window.addEventListener("gbm:open-cookie-preferences", onOpen);
    return () => window.removeEventListener("gbm:open-cookie-preferences", onOpen);
  }, []);

  if (!mounted || !visible) return null;

  const acceptAll = () => {
    saveConsent({ analytics: true, marketing: true, preferences: true }, "accept_all");
    setVisible(false);
    setShowPrefs(false);
  };
  const rejectAll = () => {
    saveConsent({ analytics: false, marketing: false, preferences: false }, "reject_all");
    setVisible(false);
    setShowPrefs(false);
  };
  const saveCustom = () => {
    saveConsent({ analytics, marketing, preferences }, "custom");
    setVisible(false);
    setShowPrefs(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-3 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-[#D4A24C]/40 bg-[#0F2A4A] text-white shadow-2xl">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Your privacy choices</h2>
              <p className="mt-1 text-xs text-white/70 leading-relaxed">
                We use cookies to run this site, remember your preferences, and — with your
                consent — measure usage and improve ads. Strictly necessary cookies are always
                on. You can accept, reject, or customize. Read our{" "}
                <a href="/#privacy" className="underline text-[#D4A24C]">Privacy Notice</a>.
              </p>
            </div>
          </div>

          {showPrefs && (
            <div className="mt-4 space-y-2 rounded-lg bg-white/5 p-3 text-xs">
              <Row
                label="Strictly necessary"
                desc="Required for the site to function (security, session, load balancing)."
                checked
                disabled
                onChange={() => {}}
              />
              <Row
                label="Preferences"
                desc="Remember choices like language or region."
                checked={preferences}
                onChange={setPreferences}
              />
              <Row
                label="Analytics"
                desc="Anonymous usage measurement to improve the site."
                checked={analytics}
                onChange={setAnalytics}
              />
              <Row
                label="Marketing"
                desc="Personalized ads and conversion tracking."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {!showPrefs && (
              <button
                onClick={() => setShowPrefs(true)}
                className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
              >
                Customize
              </button>
            )}
            <button
              onClick={rejectAll}
              className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
            >
              Reject all
            </button>
            {showPrefs && (
              <button
                onClick={saveCustom}
                className="rounded-md border border-[#D4A24C] px-3 py-1.5 text-xs font-medium text-[#D4A24C] hover:bg-[#D4A24C]/10"
              >
                Save choices
              </button>
            )}
            <button
              onClick={acceptAll}
              className="rounded-md bg-[#D4A24C] px-3 py-1.5 text-xs font-semibold text-[#0F2A4A] hover:brightness-110"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span className="flex-1">
        <span className="block font-medium text-white">{label}</span>
        <span className="block text-white/60">{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[#D4A24C] disabled:opacity-60"
        aria-label={label}
      />
    </label>
  );
}
