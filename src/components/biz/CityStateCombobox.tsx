import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin, Search } from "lucide-react";
import { searchCities, type UsCity } from "@/lib/us-cities";

type Props = {
  value: UsCity | null;
  onChange: (v: UsCity | null) => void;
  disabled?: boolean;
};

export function CityStateCombobox({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UsCity[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const display = useMemo(() => (value ? `${value.name}, ${value.stateCode}` : ""), [value]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchCities(query, 40);
        if (!cancelled) setResults(r);
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
          {display || "Search any US city, state…"}
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
              placeholder="Type city name (e.g. Austin)"
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
                  key={`${c.name}-${c.stateCode}`}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left hover:bg-[#FFF8E9] ${selected ? "bg-[#FFF8E9]" : ""}`}
                >
                  <span className="text-gray-800">{c.name}, <span className="text-gray-500">{c.stateCode}</span></span>
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
