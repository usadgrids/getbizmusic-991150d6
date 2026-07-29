import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Sparkles } from "lucide-react";
import { getActiveCities } from "@/lib/cities.functions";
import { lookupZip, zipsForCity } from "@/lib/us-zips";
import { saveCityTarget } from "@/lib/city-target";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Tone = "dark" | "light";

type PanelProps = {
  /** Called after the visitor picks an existing city (used to close the dialog). */
  onPicked?: () => void;
  tone?: Tone;
  autoFocus?: boolean;
};

/**
 * The single source of truth for "pick / switch city" behaviour:
 * ZIP or city-name search, active-city results, and the first-advertiser
 * path when we don't have a page for that city yet.
 */
export function CityPickerPanel({ onPicked, tone = "dark", autoFocus }: PanelProps) {
  const fetchCities = useServerFn(getActiveCities);
  const { data: cities = [] } = useQuery({
    queryKey: ["active-cities"],
    queryFn: () => fetchCities(),
  });

  const [q, setQ] = useState("");
  const [zipMatch, setZipMatch] = useState<{ city: string; stateCode: string } | null>(null);

  useEffect(() => {
    const digits = q.trim();
    if (/^\d{5}$/.test(digits)) {
      let cancelled = false;
      lookupZip(digits).then((r) => {
        if (!cancelled) setZipMatch(r);
      });
      return () => {
        cancelled = true;
      };
    }
    setZipMatch(null);
  }, [q]);

  const citiesWithAds = useMemo(() => cities.filter((c) => c.ad_count > 0), [cities]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return citiesWithAds;
    if (zipMatch) {
      return citiesWithAds.filter(
        (c) =>
          c.name.toLowerCase() === zipMatch.city.toLowerCase() &&
          c.state.toUpperCase() === zipMatch.stateCode.toUpperCase(),
      );
    }
    if (/^\d+$/.test(s)) return [];
    return citiesWithAds.filter(
      (c) => c.name.toLowerCase().includes(s) || c.state.toLowerCase().includes(s),
    );
  }, [citiesWithAds, q, zipMatch]);

  const trimmed = q.trim();
  const isZipQuery = /^\d{5}$/.test(trimmed);
  const partialNumeric = /^\d+$/.test(trimmed) && !isZipQuery;

  // The city the visitor would be the first advertiser in.
  const newCity: { city: string; state: string; zip?: string } | null = (() => {
    if (filtered.length > 0) return null;
    if (isZipQuery && zipMatch) {
      return { city: zipMatch.city, state: zipMatch.stateCode, zip: trimmed };
    }
    return null;
  })();

  const dark = tone === "dark";

  return (
    <div className="w-full">
      <input
        type="search"
        inputMode="numeric"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Enter your ZIP code or city name"
        aria-label="Search cities by ZIP code or city name"
        className={
          dark
            ? "w-full rounded-full border border-white/20 bg-white/10 backdrop-blur px-5 py-3 text-base sm:text-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            : "w-full rounded-full border border-gray-300 bg-white px-5 py-3 text-base text-[#0F2A4A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
        }
      />

      {zipMatch && (
        <p className={dark ? "mt-2 text-sm text-white/70" : "mt-2 text-sm text-gray-600"}>
          ZIP {trimmed} → {zipMatch.city}, {zipMatch.stateCode}
        </p>
      )}

      {newCity ? <FirstAdvertiserPanel target={newCity} tone={tone} /> : null}

      {partialNumeric && !zipMatch ? (
        <p className={dark ? "mt-4 text-sm text-white/70" : "mt-4 text-sm text-gray-600"}>
          Keep typing — enter all 5 digits of your ZIP code, or search by city name.
        </p>
      ) : null}

      {!newCity && !partialNumeric && filtered.length === 0 && trimmed ? (
        <p className={dark ? "mt-4 text-sm text-white/70" : "mt-4 text-sm text-gray-600"}>
          No live city matches “{trimmed}”. Try your 5-digit ZIP code instead.
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 text-left">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to="/$city"
              params={{ city: c.slug }}
              onClick={() => onPicked?.()}
              className={
                dark
                  ? "group rounded-2xl border border-white/20 bg-white/10 p-4 hover:bg-white/20 transition-colors"
                  : "group rounded-2xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className={
                      dark
                        ? "text-[11px] uppercase tracking-wider font-semibold text-white/60"
                        : "text-[11px] uppercase tracking-wider font-semibold text-gray-500"
                    }
                  >
                    {c.state}
                  </div>
                  <div
                    className={
                      dark
                        ? "text-lg font-bold text-white"
                        : "text-lg font-bold text-[#0F2A4A] group-hover:text-blue-600"
                    }
                  >
                    {c.name}
                  </div>
                  <CityZips city={c.name} state={c.state} tone={tone} />
                </div>
                <span className="text-[#FFB300] group-hover:translate-x-1 transition-transform text-lg">→</span>
              </div>
              <div className={dark ? "mt-3 text-xs text-white/70" : "mt-3 text-xs text-gray-600"}>
                {c.ad_count} active {c.ad_count === 1 ? "ad" : "ads"}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FirstAdvertiserPanel({
  target,
  tone,
}: {
  target: { city: string; state: string; zip?: string };
  tone: Tone;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={
        dark
          ? "mt-5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur p-5 sm:p-6 text-center"
          : "mt-5 rounded-2xl bg-[#0F2A4A] p-5 sm:p-6 text-center text-white"
      }
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#F4C430] mb-3">
        <Sparkles size={14} />
        First Advertiser Opportunity
      </div>
      <h4 className="text-lg sm:text-xl font-black text-white">
        Be the first music streaming novelty advertiser in {target.city}, {target.state}
      </h4>
      <p className="mt-2 text-sm text-white/80">
        We'll automatically launch the {target.city} city page when your ad is approved.
      </p>
      <div className="mt-4">
        <Link
          to="/pricing"
          search={{ city: target.city, state: target.state, zip: target.zip }}
          onClick={() => saveCityTarget(target)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-6 py-3 text-sm font-bold text-[#0F2A4A] transition-transform hover:scale-105 hover:bg-[#e0b566] shadow-sm"
        >
          Submit Ad
          <Sparkles size={14} />
        </Link>
      </div>
    </div>
  );
}

function CityZips({ city, state, tone }: { city: string; state: string; tone: Tone }) {
  const [zips, setZips] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    zipsForCity(city, state).then((r) => {
      if (!cancelled) setZips(r);
    });
    return () => {
      cancelled = true;
    };
  }, [city, state]);
  if (zips.length === 0) return null;
  const shown = zips.slice(0, 4);
  const extra = zips.length - shown.length;
  return (
    <div className={tone === "dark" ? "mt-1 text-xs text-white/60 font-mono" : "mt-1 text-xs text-gray-500 font-mono"}>
      {shown.join(", ")}
      {extra > 0 ? ` +${extra} more` : ""}
    </div>
  );
}

/** Button that opens the shared city picker in a dialog (no navigation, music keeps playing). */
export function CityPickerButton({
  className,
  children,
  label = "Select Another City",
}: {
  className?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children ?? (
          <>
            <MapPin size={14} />
            {label}
          </>
        )}
      </button>
      <CityPickerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function CityPickerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0F2A4A]">Pick your city</DialogTitle>
          <DialogDescription>
            Enter your ZIP or search by city name. Don't see yours? You can still submit an ad — we'll
            create the city page automatically.
          </DialogDescription>
        </DialogHeader>
        <CityPickerPanel tone="light" autoFocus onPicked={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
