import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin, Search } from "lucide-react";
import { searchCities, type UsCity } from "@/lib/us-cities";
import { lookupZip, zipsForCity } from "@/lib/us-zips";

type Props = {
  value: UsCity | null;
  onChange: (v: UsCity | null) => void;
  disabled?: boolean;
  zip?: string | null;
};

type Result = UsCity & { zip?: string };

export function CityStateCombobox({ value, onChange, disabled, zip }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const display = useMemo(() => {
    if (!value) return "";
    const suffix = zip?.trim();
    return suffix ? `${value.name}, ${value.stateCode} ${suffix}` : `${value.name}, ${value.stateCode}`;
  }, [value, zip]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = query.trim();
        const isZipQuery = /^\d{3,5}$/.test(q);

        if (isZipQuery && q.length === 5) {
          const hit = await lookupZip(q);
          if (cancelled) return;
          if (hit) {
            setResults([{ name: hit.city, stateCode: hit.stateCode, zip: q }]);
          } else {
            setResults([]);
          }
          return;
        }

        const cities = await searchCities(q, 40);
        // Attach a representative ZIP to each city for display.
        const withZips = await Promise.all(
          cities.map(async (c) => {
            const zips = await zipsForCity(c.name, c.stateCode);
            return { ...c, zip: zips[0] } as Result;
          }),
        );
        if (!cancelled) setResults(withZips);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 80);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#D4A24C] disabled:opacity-60"
      >
        <MapPin size={14} className="text-[#D4A24C] shrink-0" />
        <span className={display ? "text-gray-900 flex-1" : "text-gray-400 flex-1"}>
          {display || "Search by city or ZIP code…"}
        </span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type city name or 5-digit ZIP (e.g. Austin or 78701)"
              className="flex-1 text-sm focus:outline-none"
            />
            {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {results.length === 0 && !loading && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">No matches.</div>
            )}
            {results.map((c) => {
              const selected = value?.name === c.name && value.stateCode === c.stateCode;
              return (
                <button
                  key={`${c.name}-${c.stateCode}-${c.zip ?? ""}`}
                  type="button"
                  onClick={() => { onChange({ name: c.name, stateCode: c.stateCode }); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left hover:bg-[#FFF8E9] ${selected ? "bg-[#FFF8E9]" : ""}`}
                >
                  <span className="text-gray-800">
                    {c.name}, <span className="text-gray-500">{c.stateCode}</span>
                    {c.zip && <span className="text-gray-400 ml-2">{c.zip}</span>}
                  </span>
                  {selected && <Check size={14} className="text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
